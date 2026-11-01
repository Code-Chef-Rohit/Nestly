import { Alert, Linking, Platform } from "react-native";
import * as WebBrowser from "expo-web-browser";
import * as Clipboard from "expo-clipboard";

export const PAYMENT_CONFIG = {
  // OwnPay Open-Source Self-Hosted Payment Gateway (https://github.com/own-pay/ownpay)
  ownpayEndpoint: (process.env.EXPO_PUBLIC_OWNPAY_ENDPOINT || "http://localhost:4000").replace(/\/$/, ""),
  ownpayApiKey: process.env.EXPO_PUBLIC_OWNPAY_API_KEY || "nestly_ownpay_live_secret_key",
  ownpayCurrency: process.env.EXPO_PUBLIC_OWNPAY_CURRENCY || "INR",

  // Direct Bank Transfer via UPI (NPCI 0% fee standard)
  adminUpiId: process.env.EXPO_PUBLIC_ADMIN_UPI_ID || "7735550648@kotak811",
  adminPayeeName: process.env.EXPO_PUBLIC_ADMIN_PAYEE_NAME || "Nestly Platform",
  listingFee: Number(process.env.EXPO_PUBLIC_SERVICE_LISTING_FEE || 99),
  commissionPercent: Number(process.env.EXPO_PUBLIC_COMMISSION_PERCENT || 10),
  hostLanIp: "10.25.14.41",
};

/**
 * Resolves the reachability of OwnPay endpoint across Web, Physical Phone (Expo Go / LAN), and Emulator
 */
export function getOwnPayEndpoint() {
  let endpoint = PAYMENT_CONFIG.ownpayEndpoint;
  if (!endpoint) return "";
  if (Platform.OS !== "web" && endpoint.includes("localhost")) {
    endpoint = endpoint.replace("localhost", PAYMENT_CONFIG.hostLanIp);
  }
  return endpoint;
}

export const isOwnPayConfigured = Boolean(
  PAYMENT_CONFIG.ownpayEndpoint && PAYMENT_CONFIG.ownpayApiKey
);

/**
 * Calculate the 10% commission split on every service
 */
export function calculateCommission(price, percent = PAYMENT_CONFIG.commissionPercent) {
  const numericPrice = Number(price) || 0;
  const commission = Math.round(numericPrice * (percent / 100));
  const providerTakehome = Math.max(0, numericPrice - commission);
  return {
    basePrice: numericPrice,
    commissionAmount: commission,
    providerEarnings: providerTakehome,
    percent,
    adminUpi: PAYMENT_CONFIG.adminUpiId,
  };
}

/**
 * Creates an OwnPay checkout transaction session via REST API (POST /api/v1/payments)
 */
export async function createOwnPaySession({
  amount = PAYMENT_CONFIG.listingFee,
  currency = PAYMENT_CONFIG.ownpayCurrency,
  reference = `NST${Date.now()}`,
  customerName = "Nestly Provider",
  customerMail = "resident@nestly.app",
  customerPhone = "+919876543210",
  redirectUrl = "nestly://payment-success",
  cancelUrl = "nestly://payment-cancel",
}) {
  const endpoint = getOwnPayEndpoint();
  if (!endpoint) {
    return {
      success: false,
      isFallback: true,
      message: "OwnPay endpoint not configured.",
    };
  }

  const payload = {
    amount: String(amount),
    currency,
    reference,
    customer_name: customerName,
    customer_mail: customerMail,
    customer_phone: customerPhone,
    redirect_url: redirectUrl,
    cancel_url: cancelUrl,
  };

  try {
    const res = await fetch(`${endpoint}/api/v1/payments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${PAYMENT_CONFIG.ownpayApiKey}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.message || `OwnPay API Error: ${res.status}`);
    }

    return {
      success: true,
      paymentId: data.data?.payment_id,
      checkoutUrl: data.data?.checkout_url,
      token: data.data?.token,
    };
  } catch (err) {
    console.warn("OwnPay session creation notice:", err.message);
    return {
      success: false,
      message: err.message,
    };
  }
}

/**
 * Verifies an OwnPay transaction status via REST API (GET /api/v1/payments/{payment_id})
 */
export async function verifyOwnPayStatus(paymentId) {
  const endpoint = getOwnPayEndpoint();
  if (!endpoint || !paymentId) {
    return { success: false, status: "unknown" };
  }

  try {
    const res = await fetch(`${endpoint}/api/v1/payments/${paymentId}`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${PAYMENT_CONFIG.ownpayApiKey}`,
      },
    });

    const data = await res.json();
    return {
      success: res.ok && data.success,
      status: data.data?.status || "pending",
      data: data.data,
    };
  } catch (err) {
    console.warn("OwnPay verification error:", err.message);
    return { success: false, status: "error", message: err.message };
  }
}

/**
 * Submits and verifies a 12-digit UPI UTR / RRN reference number
 * (POST /api/v1/payments/{payment_id}/verify-utr)
 */
export async function verifyUtrWithOwnPay(paymentId, utr) {
  const endpoint = getOwnPayEndpoint();
  if (!endpoint || !paymentId || !utr) {
    return { success: false, message: "Payment ID and 12-digit UTR are required." };
  }

  try {
    const res = await fetch(`${endpoint}/api/v1/payments/${paymentId}/verify-utr`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${PAYMENT_CONFIG.ownpayApiKey}`,
      },
      body: JSON.stringify({ utr: utr.trim() }),
    });

    const data = await res.json();
    return data;
  } catch (err) {
    console.warn("OwnPay UTR verification error:", err.message);
    return { success: false, message: err.message || "Network error during UTR verification." };
  }
}

/**
 * Real-time Auto-Polling: polls payment status until 'completed' or timeout.
 * Calls onStatusChange({ status, data }) whenever status updates.
 * Returns a cancel function.
 */
export function startPaymentAutoPolling(
  paymentId,
  onStatusChange,
  { intervalMs = 2000, timeoutMs = 180000 } = {}
) {
  let isCancelled = false;
  let timerId = null;
  const startTime = Date.now();

  const poll = async () => {
    if (isCancelled) return;
    if (Date.now() - startTime > timeoutMs) {
      if (onStatusChange) onStatusChange({ status: "timeout", message: "Verification timed out." });
      return;
    }

    try {
      const result = await verifyOwnPayStatus(paymentId);
      if (isCancelled) return;

      if (result.success && result.status === "completed") {
        if (onStatusChange) onStatusChange({ status: "completed", data: result.data });
        return; // stop polling on success
      } else if (result.status === "failed") {
        if (onStatusChange) onStatusChange({ status: "failed", data: result.data });
        return;
      }
    } catch (e) {
      // Continue polling on transient errors
    }

    if (!isCancelled) {
      timerId = setTimeout(poll, intervalMs);
    }
  };

  timerId = setTimeout(poll, intervalMs);

  return () => {
    isCancelled = true;
    if (timerId) clearTimeout(timerId);
  };
}

/**
 * Opens the OwnPay hosted white-label checkout in secure WebBrowser session
 */
export async function launchOwnPayCheckout(checkoutUrl) {
  try {
    if (Platform.OS === "web") {
      window.open(checkoutUrl, "_blank");
      return true;
    }
    const result = await WebBrowser.openAuthSessionAsync(checkoutUrl, "nestly://");
    return result.type === "success";
  } catch (err) {
    console.warn("WebBrowser checkout error:", err.message);
    Linking.openURL(checkoutUrl);
    return true;
  }
}

/**
 * Builds standard National Payments Corporation of India (NPCI) UPI Intent URL.
 * Works seamlessly across Google Pay, PhonePe, Paytm, BHIM, Cred, and all Indian banking apps.
 * IMPORTANT: For individual (P2P/Kotak811) VPAs, omitting 'tr' and 'mc' prevents
 * PSP apps from throwing "Merchant not recognized / Invalid QR code" errors.
 */
export function buildUpiPayUrl({
  upiId = PAYMENT_CONFIG.adminUpiId,
  payeeName = PAYMENT_CONFIG.adminPayeeName,
  amount = PAYMENT_CONFIG.listingFee,
  transactionNote = "Nestly Service Listing",
  includeAmount = true,
} = {}) {
  const cleanUpi = (upiId || "").trim();
  const cleanName = encodeURIComponent((payeeName || "Nestly Platform").trim());
  const cleanNote = encodeURIComponent((transactionNote || "Nestly Listing").trim());

  if (includeAmount && amount) {
    const formattedAmount = Number(amount).toFixed(2);
    return `upi://pay?pa=${cleanUpi}&pn=${cleanName}&am=${formattedAmount}&cu=INR&tn=${cleanNote}`;
  }
  return `upi://pay?pa=${cleanUpi}&pn=${cleanName}&cu=INR&tn=${cleanNote}`;
}

/**
 * Builds app-specific deep links for direct 1-tap checkout (GPay, PhonePe, Paytm)
 */
export function buildAppSpecificUpiUrl(appScheme, options = {}) {
  const baseUpiUrl = buildUpiPayUrl(options);
  const query = baseUpiUrl.replace(/^upi:\/\/pay\?/, "");
  switch (appScheme) {
    case "gpay":
      return `tez://upi/pay?${query}`;
    case "phonepe":
      return `phonepe://pay?${query}`;
    case "paytm":
      return `paytmmp://pay?${query}`;
    default:
      return baseUpiUrl;
  }
}

/**
 * Generates dynamic high-res QR code image URL for scanning
 */
export function getUpiQrCodeUrl(upiUrl) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&margin=12&format=png&data=${encodeURIComponent(
    upiUrl
  )}`;
}

/**
 * Opens native UPI intent sheet (GPay / PhonePe / Paytm / BHIM) on mobile device
 */
export async function launchUpiApp({
  app = "generic",
  amount = PAYMENT_CONFIG.listingFee,
  transactionNote = "Nestly Service Listing",
  upiId = PAYMENT_CONFIG.adminUpiId,
  payeeName = PAYMENT_CONFIG.adminPayeeName,
} = {}) {
  if (Platform.OS === "web") {
    return false;
  }

  const specificUrl = buildAppSpecificUpiUrl(app, {
    upiId,
    payeeName,
    amount,
    transactionNote,
  });
  const fallbackGenericUrl = buildUpiPayUrl({
    upiId,
    payeeName,
    amount,
    transactionNote,
  });

  try {
    const canOpen = await Linking.canOpenURL(specificUrl);
    if (canOpen) {
      await Linking.openURL(specificUrl);
      return true;
    }
  } catch (e) {
    // fallback
  }

  try {
    await Linking.openURL(fallbackGenericUrl);
    return true;
  } catch (err) {
    console.warn("Direct UPI launch notice:", err.message);
    return false;
  }
}

/**
 * Copies text to clipboard with alert
 */
export async function copyUpiIdToClipboard(upiId = PAYMENT_CONFIG.adminUpiId) {
  try {
    await Clipboard.setStringAsync(upiId);
    Alert.alert("UPI ID Copied 📋", `${upiId} copied to clipboard.\n\nYou can now open Google Pay, PhonePe, or Paytm and paste it to pay.`);
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Generic clipboard copier with custom toast/alert
 */
export async function copyToClipboard(text, label = "Details") {
  try {
    await Clipboard.setStringAsync(text);
    Alert.alert(`${label} Copied 📋`, `${text} copied to clipboard.`);
    return true;
  } catch (e) {
    return false;
  }
}
