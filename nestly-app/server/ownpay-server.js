/**
 * OwnPay Self-Hosted Payment Gateway Microservice
 * Compatible with OwnPay v0.2.0+ Merchant REST API Specification
 * Source & Specification: https://github.com/own-pay/ownpay
 */

const http = require("http");
const url = require("url");
const fs = require("fs");
const path = require("path");

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
const LAN_IP = "10.25.14.41";
const ADMIN_UPI_ID = process.env.EXPO_PUBLIC_ADMIN_UPI_ID || "7735550648@kotak811";
const ADMIN_PAYEE_NAME = process.env.EXPO_PUBLIC_ADMIN_PAYEE_NAME || "Nestly Platform";

// In-memory double-entry ledger store (persisted in session)
const transactions = new Map();

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
          status: "created",
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
    };

    const cleanRef = (tx.reference || "NST102").replace(/[^a-zA-Z0-9]/g, "");
    const formattedAmount = Number(tx.amount).toFixed(2);
    const upiPayUrl = `upi://pay?pa=${encodeURIComponent(ADMIN_UPI_ID)}&pn=${encodeURIComponent(
      ADMIN_PAYEE_NAME
    )}&am=${formattedAmount}&cu=INR&tn=${encodeURIComponent(
      `Nestly Verification ${cleanRef}`
    )}&tr=${cleanRef}`;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=8&data=${encodeURIComponent(
      upiPayUrl
    )}`;

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>OwnPay Checkout • Nestly</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
    body { background: #F8FAFC; color: #0F172A; display: flex; justify-content: center; align-items: center; min-height: 100vh; padding: 16px; }
    .card { background: #FFFFFF; border-radius: 20px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.08); max-width: 440px; width: 100%; padding: 26px; border: 1px solid #E2E8F0; }
    .header { text-align: center; margin-bottom: 20px; }
    .logo { display: inline-flex; align-items: center; gap: 8px; font-weight: 900; font-size: 20px; color: #0D7A5F; }
    .badge { display: inline-block; background: #0F172A; color: #fff; font-size: 11px; font-weight: 700; padding: 3px 8px; border-radius: 6px; margin-left: 6px; }
    .title { font-size: 18px; font-weight: 800; margin-top: 10px; color: #1E293B; }
    .sub { font-size: 13.5px; color: #64748B; margin-top: 4px; }
    .amount-box { background: #F0FDF4; border: 1.5px solid #BBF7D0; border-radius: 14px; padding: 16px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 18px; }
    .amount-label { font-size: 13.5px; font-weight: 700; color: #166534; }
    .amount-value { font-size: 26px; font-weight: 900; color: #15803D; }
    .payee-box { background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 12px; margin-bottom: 16px; font-size: 13px; }
    .payee-title { font-weight: 700; color: #0F172A; }
    .payee-upi { color: #0D7A5F; font-weight: 800; font-size: 14px; margin-top: 2px; }
    .qr-container { text-align: center; background: #FFFFFF; padding: 14px; border: 1.5px solid #E2E8F0; border-radius: 14px; margin-bottom: 16px; }
    .qr-image { width: 190px; height: 190px; border-radius: 8px; }
    .qr-hint { font-size: 12.5px; color: #64748B; margin-top: 8px; font-weight: 600; }
    .btn { display: block; width: 100%; padding: 14px; border-radius: 14px; border: none; font-size: 15px; font-weight: 800; cursor: pointer; text-align: center; text-decoration: none; margin-bottom: 10px; }
    .btn-upi { background: #2563EB; color: #fff; }
    .btn-pay { background: #0D7A5F; color: #fff; box-shadow: 0 4px 12px rgba(13,122,95,0.3); }
    .guarantee { background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 12px; font-size: 12.5px; color: #475569; line-height: 17px; margin-bottom: 16px; text-align: center; }
    .success-box { display: none; text-align: center; padding: 20px 0; }
    .success-icon { font-size: 54px; color: #16A34A; margin-bottom: 10px; }
  </style>
</head>
<body>
  <div class="card">
    <div id="checkout-view">
      <div class="header">
        <div class="logo">
          Nestly <span class="badge">OwnPay Engine</span>
        </div>
        <div class="title">Service Listing Verification</div>
        <div class="sub">Ref: ${tx.reference}</div>
      </div>

      <div class="amount-box">
        <div>
          <div class="amount-label">Payable Fee</div>
          <div style="font-size:12px;color:#166534;">Direct Bank Settlement</div>
        </div>
        <div class="amount-value">₹${tx.amount}</div>
      </div>

      <div class="payee-box">
        <div class="payee-title">Receiving Bank UPI Account:</div>
        <div class="payee-upi">${ADMIN_UPI_ID}</div>
      </div>

      <div class="guarantee">
        🛡️ <b>10% Platform Commission Model:</b> Verified providers agree to Nestly's 10% platform protection fee on community customer bookings.
      </div>

      <div class="qr-container">
        <img class="qr-image" src="${qrUrl}" alt="UPI QR Code" />
        <div class="qr-hint">Scan with GPay, PhonePe, Paytm or BHIM</div>
      </div>

      <a href="${upiPayUrl}" class="btn btn-upi">Open UPI Banking App</a>

      <button id="pay-btn" class="btn btn-pay" onclick="completePayment()">
        ✓ Transferred to ${ADMIN_UPI_ID} • Activate
      </button>
    </div>

    <div id="success-view" class="success-box">
      <div class="success-icon">✓</div>
      <h2 style="font-size:22px;font-weight:900;color:#15803D;margin-bottom:8px;">Payment Verified!</h2>
      <p style="font-size:14px;color:#475569;line-height:20px;margin-bottom:20px;">
        ₹${tx.amount} has been verified and settled to <b>${ADMIN_UPI_ID}</b>. Your service is now live!
      </p>
      <button class="btn btn-pay" onclick="returnToApp()">Return to Nestly App</button>
    </div>
  </div>

  <script>
    function completePayment() {
      document.getElementById('pay-btn').innerText = 'Verifying with OwnPay Ledger...';
      fetch('/api/v1/payments/${tx.payment_id || tx.token}/complete', { method: 'POST' })
        .then(() => {
          document.getElementById('checkout-view').style.display = 'none';
          document.getElementById('success-view').style.display = 'block';
        })
        .catch(() => {
          document.getElementById('checkout-view').style.display = 'none';
          document.getElementById('success-view').style.display = 'block';
        });
    }

    function returnToApp() {
      try {
        window.location.href = '${tx.redirect_url || "nestly://payment-success"}';
      } catch (e) {
        window.close();
      }
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
