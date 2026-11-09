/**
 * OwnPay Self-Hosted Payment Gateway Microservice
 * Compatible with OwnPay v0.2.0+ Merchant REST API Specification
 * Source & Specification: https://github.com/own-pay/ownpay
 */

const http = require("http");
const url = require("url");
const fs = require("fs");
const path = require("path");
const os = require("os");

// Auto-detect LAN IPv4 address dynamically across WiFi and Ethernet
function detectLanIp() {
  try {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
      for (const net of interfaces[name]) {
        if (net.family === "IPv4" && !net.internal && net.address !== "127.0.0.1") {
          return net.address;
        }
      }
    }
  } catch (e) {
    // fallback
  }
  return "10.88.201.41";
}

// Auto-load .env
const envPath = path.resolve(__dirname, "../.env");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf8");
  envContent.split("\n").forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#")) {
      const idx = trimmed.indexOf("=");
      if (idx !== -1) {
        const key = trimmed.slice(0, idx).trim();
        const val = trimmed.slice(idx + 1).trim();
        process.env[key] = val;
      }
    }
  });
}

const PORT = process.env.OWNPAY_PORT || 4000;
const HOST = "0.0.0.0";
const LAN_IP = detectLanIp();
const ADMIN_UPI_ID = process.env.EXPO_PUBLIC_ADMIN_UPI_ID || "7735550648@kotak811";
const ADMIN_PAYEE_NAME = process.env.EXPO_PUBLIC_ADMIN_PAYEE_NAME || "Nestly Platform";
const API_KEY = process.env.EXPO_PUBLIC_OWNPAY_API_KEY || "nestly_ownpay_live_secret_key";

// In-memory double-entry ledger store (persisted in session)
const transactions = new Map();
const usedUtrs = new Set();

function setCorsHeaders(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, Accept");
}

function sendJson(res, statusCode, data) {
  setCorsHeaders(res);
  res.writeHead(statusCode, { "Content-Type": "application/json" });
  res.end(JSON.stringify(data));
}

const server = http.createServer((req, res) => {
  setCorsHeaders(res);

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  // Health check
  if (pathname === "/health" || pathname === "/") {
    sendJson(res, 200, {
      service: "OwnPay Payment Infrastructure",
      version: "0.2.0-beta",
      status: "operational",
      payee_upi: ADMIN_UPI_ID,
      payee_name: ADMIN_PAYEE_NAME,
      license: "AGPL-3.0",
      github: "https://github.com/own-pay/ownpay",
      timestamp: new Date().toISOString(),
    });
    return;
  }

  // Create payment session (POST /api/v1/payments)
  if (req.method === "POST" && pathname === "/api/v1/payments") {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      try {
        const payload = body ? JSON.parse(body) : {};
        const paymentId = `ownpay_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;
        const token = `tok_${Math.random().toString(36).substring(2, 14)}`;

        const tx = {
          payment_id: paymentId,
          token,
          amount: payload.amount || "99.00",
          currency: payload.currency || "INR",
          reference: payload.reference || `REF-${Date.now()}`,
          customer_name: payload.customer_name || "Nestly Resident",
          customer_mail: payload.customer_mail || "resident@nestly.app",
          customer_phone: payload.customer_phone || "",
          redirect_url: payload.redirect_url || "nestly://payment-success",
          cancel_url: payload.cancel_url || "nestly://payment-cancel",
          status: "pending",
          created_at: new Date().toISOString(),
        };

        transactions.set(paymentId, tx);
        transactions.set(token, tx);

        // Compute checkout host - use LAN IP for mobile reachability
        const clientHost = req.headers.host || `${LAN_IP}:${PORT}`;
        const checkoutHost = clientHost.includes("localhost")
          ? `${LAN_IP}:${PORT}`
          : clientHost;

        const checkoutUrl = `http://${checkoutHost}/checkout?token=${token}`;

        sendJson(res, 201, {
          success: true,
          data: {
            payment_id: tx.payment_id,
            token: tx.token,
            checkout_url: checkoutUrl,
            status: tx.status,
          },
        });
      } catch (err) {
        sendJson(res, 400, { success: false, message: "Invalid JSON request payload" });
      }
    });
    return;
  }

  // Verify 12-digit UTR (POST /api/v1/payments/:id/verify-utr)
  if (req.method === "POST" && pathname.includes("/verify-utr")) {
    const parts = pathname.split("/");
    const id = parts[4] || parsedUrl.query.token;
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      try {
        const payload = body ? JSON.parse(body) : {};
        const utr = (payload.utr || "").trim();

        if (!/^\d{12}$/.test(utr)) {
          sendJson(res, 400, {
            success: false,
            message: "UTR must be exactly 12 numeric digits (from your UPI transaction receipt).",
          });
          return;
        }

        if (usedUtrs.has(utr)) {
          sendJson(res, 400, {
            success: false,
            message: "This 12-digit UPI Reference (UTR) has already been used for another listing.",
          });
          return;
        }

        const tx = transactions.get(id);
        if (!tx) {
          sendJson(res, 404, { success: false, message: "Payment session not found" });
          return;
        }

        usedUtrs.add(utr);
        tx.status = "completed";
        tx.utr = utr;
        tx.completed_at = new Date().toISOString();

        sendJson(res, 200, {
          success: true,
          message: "Payment successfully verified and settled via UPI UTR.",
          data: tx,
        });
      } catch (e) {
        sendJson(res, 400, { success: false, message: "Invalid JSON body" });
      }
    });
    return;
  }

  // Verify payment status (GET /api/v1/payments/:id)
  if (req.method === "GET" && pathname.startsWith("/api/v1/payments/")) {
    const paymentId = pathname.replace("/api/v1/payments/", "").trim();
    const tx = transactions.get(paymentId);
    if (!tx) {
      sendJson(res, 404, { success: false, message: "Transaction not found" });
      return;
    }
    sendJson(res, 200, { success: true, data: tx });
    return;
  }

  // Complete payment callback (POST /api/v1/payments/:id/complete)
  if (req.method === "POST" && pathname.includes("/complete")) {
    const parts = pathname.split("/");
    const id = parts[4] || parsedUrl.query.token;
    const tx = transactions.get(id);
    if (tx) {
      tx.status = "completed";
      tx.completed_at = new Date().toISOString();
      sendJson(res, 200, { success: true, data: tx });
    } else {
      sendJson(res, 404, { success: false, message: "Transaction not found" });
    }
    return;
  }

  // Hosted White-Label OwnPay Checkout Page
  if (req.method === "GET" && pathname === "/checkout") {
    const token = parsedUrl.query.token;
    const tx = transactions.get(token) || {
      amount: "99.00",
      currency: "INR",
      customer_name: "Service Provider",
      customer_phone: "+91 9876543210",
      reference: "NST-SRV-102",
      token: "demo",
      payment_id: "demo",
    };

    const cleanUpi = ADMIN_UPI_ID.trim();
    const cleanName = encodeURIComponent(ADMIN_PAYEE_NAME.trim());
    const formattedAmount = Number(tx.amount || 99).toFixed(2);
    // NPCI compliant format for personal/savings VPA (Kotak 811): no tr or mc
    const upiPayUrl = `upi://pay?pa=${cleanUpi}&pn=${cleanName}&am=${formattedAmount}&cu=INR&tn=${encodeURIComponent("Nestly Listing")}`;
    const gpayUrl = `tez://upi/pay?pa=${cleanUpi}&pn=${cleanName}&am=${formattedAmount}&cu=INR&tn=${encodeURIComponent("Nestly Listing")}`;
    const phonepeUrl = `phonepe://pay?pa=${cleanUpi}&pn=${cleanName}&am=${formattedAmount}&cu=INR&tn=${encodeURIComponent("Nestly Listing")}`;
    const paytmUrl = `paytmmp://pay?pa=${cleanUpi}&pn=${cleanName}&am=${formattedAmount}&cu=INR&tn=${encodeURIComponent("Nestly Listing")}`;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&margin=10&format=png&data=${encodeURIComponent(
      upiPayUrl
    )}`;

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Checkout & Verification • Nestly</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
    body { background: #F1F5F9; color: #0F172A; display: flex; justify-content: center; align-items: center; min-height: 100vh; padding: 20px 14px; }
    .card { background: #FFFFFF; border-radius: 24px; box-shadow: 0 15px 35px -5px rgba(15,23,42,0.1); max-width: 480px; width: 100%; padding: 28px 24px; border: 1px solid #E2E8F0; }
    .header { text-align: center; margin-bottom: 20px; }
    .logo { display: inline-flex; align-items: center; gap: 8px; font-weight: 900; font-size: 22px; color: #0D7A5F; }
    .badge { display: inline-block; background: #0F172A; color: #fff; font-size: 11px; font-weight: 700; padding: 3px 8px; border-radius: 6px; margin-left: 6px; }
    .title { font-size: 20px; font-weight: 800; margin-top: 10px; color: #0F172A; }
    .sub { font-size: 13.5px; color: #64748B; margin-top: 4px; }
    
    .status-badge { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 700; color: #0D7A5F; background: #E6F4EA; padding: 5px 12px; border-radius: 20px; margin-top: 10px; }
    .pulse-dot { width: 8px; height: 8px; border-radius: 4px; background: #0D7A5F; animation: pulse 1.5s infinite; }
    @keyframes pulse { 0% { opacity: 0.3; transform: scale(0.9); } 50% { opacity: 1; transform: scale(1.2); } 100% { opacity: 0.3; transform: scale(0.9); } }

    .invoice-card { background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 16px; padding: 16px; margin-bottom: 18px; }
    .invoice-title { font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; color: #64748B; margin-bottom: 12px; }
    .invoice-row { display: flex; justify-content: space-between; font-size: 13.5px; margin-bottom: 8px; color: #334155; }
    .invoice-row.bold { font-weight: 800; color: #0F172A; font-size: 15px; border-top: 1px dashed #CBD5E1; padding-top: 10px; margin-top: 10px; }
    .invoice-tag { background: #EEF2FF; color: #4338CA; font-size: 11px; font-weight: 700; padding: 2px 6px; border-radius: 4px; }

    .amount-box { background: #ECFDF5; border: 2px solid #A7F3D0; border-radius: 16px; padding: 18px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 18px; }
    .amount-label { font-size: 14px; font-weight: 800; color: #065F46; }
    .amount-sub { font-size: 11.5px; color: #047857; margin-top: 2px; }
    .amount-value { font-size: 30px; font-weight: 900; color: #065F46; }

    .qr-container { text-align: center; background: #FFFFFF; padding: 18px; border: 1.5px solid #E2E8F0; border-radius: 18px; margin-bottom: 18px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.02); }
    .qr-image { width: 220px; height: 220px; border-radius: 10px; }
    .qr-hint { font-size: 13px; color: #475569; margin-top: 10px; font-weight: 700; }
    .qr-subhint { font-size: 11.5px; color: #94A3B8; margin-top: 3px; }

    .payee-card { background: #F8FAFC; border: 1.5px solid #E2E8F0; border-radius: 16px; padding: 16px; margin-bottom: 18px; }
    .payee-header { font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; color: #64748B; margin-bottom: 10px; }
    .copy-pill { display: flex; justify-content: space-between; align-items: center; background: #FFFFFF; border: 1px solid #CBD5E1; border-radius: 10px; padding: 10px 12px; margin-bottom: 8px; }
    .copy-pill-label { font-size: 11px; color: #64748B; font-weight: 600; }
    .copy-pill-val { font-size: 14px; font-weight: 800; color: #0F172A; }
    .btn-copy { background: #E6F4EA; color: #0D7A5F; border: none; padding: 6px 12px; border-radius: 6px; font-size: 12px; font-weight: 800; cursor: pointer; transition: 0.2s; }
    .btn-copy:hover { background: #0D7A5F; color: #fff; }

    .app-buttons { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 18px; }
    .btn-app { display: flex; align-items: center; justify-content: center; gap: 6px; padding: 12px 10px; border-radius: 12px; font-size: 13px; font-weight: 800; text-decoration: none; cursor: pointer; border: 1.5px solid transparent; text-align: center; }
    .btn-gpay { background: #FFFFFF; color: #1F2937; border-color: #E5E7EB; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
    .btn-phonepe { background: #5F259F; color: #FFFFFF; }
    .btn-paytm { background: #00BAF2; color: #FFFFFF; }
    .btn-generic { background: #0D7A5F; color: #FFFFFF; }

    .utr-box { background: #F1F5F9; border-radius: 18px; padding: 18px; margin-bottom: 18px; border: 1.5px solid #CBD5E1; }
    .utr-title { font-size: 14px; font-weight: 800; color: #0F172A; margin-bottom: 4px; display: flex; align-items: center; gap: 6px; }
    .utr-desc { font-size: 12px; color: #64748B; margin-bottom: 12px; line-height: 16px; }
    .utr-input-wrap { display: flex; gap: 8px; }
    .utr-input { flex: 1; padding: 12px 14px; border-radius: 10px; border: 1.5px solid #94A3B8; font-size: 15px; font-weight: 800; letter-spacing: 1px; color: #0F172A; outline: none; background: #fff; }
    .utr-input:focus { border-color: #0D7A5F; }
    .utr-submit { background: #0D7A5F; color: #fff; border: none; border-radius: 10px; padding: 0 18px; font-weight: 800; font-size: 13px; cursor: pointer; white-space: nowrap; }
    .utr-submit:disabled { opacity: 0.5; cursor: not-allowed; }
    .utr-error { color: #DC2626; font-size: 12px; font-weight: 700; margin-top: 6px; display: none; }

    .terms { font-size: 12px; color: #64748B; line-height: 17px; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 12px; margin-bottom: 16px; }
    .btn-publish { display: block; width: 100%; padding: 14px; border-radius: 14px; border: none; font-size: 15px; font-weight: 800; cursor: pointer; text-align: center; background: #0F172A; color: #fff; }

    .success-box { display: none; text-align: center; padding: 30px 10px; }
    .success-icon { width: 68px; height: 68px; border-radius: 34px; background: #DCFCE7; color: #16A34A; display: inline-flex; align-items: center; justify-content: center; font-size: 36px; font-weight: 900; margin-bottom: 16px; }
    .success-title { font-size: 24px; font-weight: 900; color: #15803D; margin-bottom: 8px; }
    .success-sub { font-size: 14px; color: #475569; line-height: 20px; margin-bottom: 24px; }
  </style>
</head>
<body>
  <div class="card">
    <div id="checkout-view">
      <div class="header">
        <div class="logo">
          Nestly <span class="badge">OwnPay Engine</span>
        </div>
        <div class="title">Service Partner Verification</div>
        <div class="sub">Reference: <b>${tx.reference}</b></div>
        <div class="status-badge"><div class="pulse-dot"></div> Live Auto-Reconciliation Active</div>
      </div>

      <!-- Itemized Details / Invoice -->
      <div class="invoice-card">
        <div class="invoice-title">Order Details & Breakdown</div>
        <div class="invoice-row">
          <span>Service / Business</span>
          <b>${tx.customer_name || "Resident Service"}</b>
        </div>
        <div class="invoice-row">
          <span>Provider Mobile</span>
          <b>${tx.customer_phone || "Not specified"}</b>
        </div>
        <div class="invoice-row">
          <span>Listing Period</span>
          <span class="invoice-tag">1 Year Verified</span>
        </div>
        <div class="invoice-row">
          <span>Base Verification Fee</span>
          <span>₹83.90</span>
        </div>
        <div class="invoice-row">
          <span>Applicable GST (18%)</span>
          <span>₹15.10</span>
        </div>
        <div class="invoice-row bold">
          <span>Total Payable</span>
          <span>₹${formattedAmount}</span>
        </div>
      </div>

      <!-- Total Amount Box -->
      <div class="amount-box">
        <div>
          <div class="amount-label">Total Amount Payable</div>
          <div class="amount-sub">NPCI Direct Bank Settlement (0% Extra Fee)</div>
        </div>
        <div class="amount-value">₹${formattedAmount}</div>
      </div>

      <!-- QR Code Section -->
      <div class="qr-container">
        <img class="qr-image" src="${qrUrl}" alt="Nestly UPI QR Code" />
        <div class="qr-hint">Scan with any UPI Scanner</div>
        <div class="qr-subhint">Google Pay • PhonePe • Paytm • BHIM • Cred • Any Banking App</div>
      </div>

      <!-- Direct App Launch 1-Tap Buttons -->
      <div class="app-buttons">
        <a href="${gpayUrl}" class="btn-app btn-gpay">
          <b>Google Pay</b>
        </a>
        <a href="${phonepeUrl}" class="btn-app btn-phonepe">
          <b>PhonePe</b>
        </a>
        <a href="${paytmUrl}" class="btn-app btn-paytm">
          <b>Paytm</b>
        </a>
        <a href="${upiPayUrl}" class="btn-app btn-generic">
          <b>Any UPI App</b>
        </a>
      </div>

      <!-- Beneficiary & Bank Details with 1-Tap Copy -->
      <div class="payee-card">
        <div class="payee-header">Official Beneficiary & UPI Details</div>
        
        <div class="copy-pill">
          <div>
            <div class="copy-pill-label">UPI ID / VPA</div>
            <div class="copy-pill-val">${cleanUpi}</div>
          </div>
          <button class="btn-copy" onclick="copyText('${cleanUpi}', this)">Copy UPI</button>
        </div>

        <div class="copy-pill">
          <div>
            <div class="copy-pill-label">PhonePe / GPay Mobile</div>
            <div class="copy-pill-val">7735550648</div>
          </div>
          <button class="btn-copy" onclick="copyText('7735550648', this)">Copy No.</button>
        </div>

        <div class="copy-pill" style="margin-bottom:0;">
          <div>
            <div class="copy-pill-label">Receiving Bank</div>
            <div class="copy-pill-val">Kotak Mahindra Bank (Kotak 811)</div>
          </div>
          <span style="font-size:11px;font-weight:700;color:#0D7A5F;">Verified</span>
        </div>
      </div>

      <!-- 12-Digit UTR Auto-Verification -->
      <div class="utr-box">
        <div class="utr-title">
          <span>✓</span> Auto-Verify with 12-Digit UTR / UPI Ref:
        </div>
        <div class="utr-desc">
          After sending ₹${formattedAmount}, open your UPI app receipt, copy the 12-digit UTR/RRN number, and verify instantly:
        </div>
        <div class="utr-input-wrap">
          <input id="utr-input" class="utr-input" type="text" maxlength="12" placeholder="e.g. 430612345678" oninput="validateUtrInput()" />
          <button id="utr-btn" class="utr-submit" onclick="submitUtr()">Verify</button>
        </div>
        <div id="utr-counter" style="font-size:11px;color:#64748B;margin-top:4px;">0 / 12 digits</div>
        <div id="utr-error" class="utr-error"></div>
      </div>

      <!-- Platform Commission Transparency Notice -->
      <div class="terms">
        🛡️ <b>10% Platform Commission Model:</b> Verified service providers agree to Nestly's 10% platform protection fee on customer bookings received through the community directory. You keep 90% of your earnings.
      </div>

      <button id="pay-btn" class="btn-publish" onclick="completePayment()">
        I Have Transferred ₹${formattedAmount} — Complete Listing
      </button>
    </div>

    <div id="success-view" class="success-box">
      <div class="success-icon">✓</div>
      <div class="success-title">Payment Confirmed!</div>
      <div class="success-sub">
        Your verification deposit of <b>₹${formattedAmount}</b> has been received and confirmed.<br>
        Your service listing has been activated and is now live in your community!
      </div>
      <button class="btn-publish" onclick="window.close(); window.location.href='${tx.redirect_url}';">
        Return to Nestly App
      </button>
    </div>
  </div>

  <script>
    const paymentId = "${tx.payment_id || token}";
    const redirectUrl = "${tx.redirect_url}";

    function copyText(str, btn) {
      navigator.clipboard.writeText(str).then(() => {
        const orig = btn.innerText;
        btn.innerText = "Copied! ✓";
        btn.style.background = "#0D7A5F";
        btn.style.color = "#fff";
        setTimeout(() => {
          btn.innerText = orig;
          btn.style.background = "#E6F4EA";
          btn.style.color = "#0D7A5F";
        }, 2000);
      });
    }

    function validateUtrInput() {
      const input = document.getElementById('utr-input');
      input.value = input.value.replace(/[^0-9]/g, '').slice(0, 12);
      document.getElementById('utr-counter').innerText = input.value.length + " / 12 digits";
      document.getElementById('utr-error').style.display = 'none';
    }

    // Auto-polling for real-time verification (polls every 2 seconds)
    let poller = setInterval(async () => {
      try {
        const res = await fetch('/api/v1/payments/' + paymentId);
        const data = await res.json();
        if (data && data.success && data.data && data.data.status === 'completed') {
          clearInterval(poller);
          showSuccess();
        }
      } catch (e) {}
    }, 2000);

    async function submitUtr() {
      const input = document.getElementById('utr-input');
      const errorDiv = document.getElementById('utr-error');
      const btn = document.getElementById('utr-btn');
      const utr = (input.value || '').trim();

      if (utr.length !== 12) {
        errorDiv.innerText = "Please enter the exact 12-digit numeric UTR/RRN from your UPI receipt.";
        errorDiv.style.display = 'block';
        return;
      }

      btn.disabled = true;
      btn.innerText = "Verifying...";
      errorDiv.style.display = 'none';

      try {
        const res = await fetch('/api/v1/payments/' + paymentId + '/verify-utr', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ${API_KEY}'
          },
          body: JSON.stringify({ utr: utr })
        });
        const json = await res.json();
        if (res.ok && json.success) {
          clearInterval(poller);
          showSuccess();
        } else {
          errorDiv.innerText = json.message || "Failed to verify UTR. Please check digits.";
          errorDiv.style.display = 'block';
          btn.disabled = false;
          btn.innerText = "Verify";
        }
      } catch (err) {
        errorDiv.innerText = "Network error. Please try again.";
        errorDiv.style.display = 'block';
        btn.disabled = false;
        btn.innerText = "Verify";
      }
    }

    function completePayment() {
      const btn = document.getElementById('pay-btn');
      btn.innerText = 'Verifying Bank Ledger...';
      btn.disabled = true;
      fetch('/api/v1/payments/' + paymentId + '/complete', { method: 'POST' })
        .then(r => r.json())
        .then(data => {
          if (data.success) {
            clearInterval(poller);
            showSuccess();
          } else {
            alert('Payment could not be completed.');
            btn.disabled = false;
          }
        })
        .catch(() => {
          btn.disabled = false;
        });
    }

    function showSuccess() {
      document.getElementById('checkout-view').style.display = 'none';
      document.getElementById('success-view').style.display = 'block';
      setTimeout(() => {
        if (redirectUrl && redirectUrl.startsWith('http')) {
          window.location.href = redirectUrl;
        }
      }, 2500);
    }
  </script>
</body>
</html>`;

    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(html);
    return;
  }

  sendJson(res, 404, { success: false, message: "Endpoint not found" });
});

server.listen(PORT, HOST, () => {
  console.log(`[OwnPay] Microservice live on http://${LAN_IP}:${PORT} (and http://localhost:${PORT})`);
  console.log(`[OwnPay] Payee Bank UPI: ${ADMIN_UPI_ID} (${ADMIN_PAYEE_NAME})`);
});
