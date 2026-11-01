import { Alert, Linking, Platform } from "react-native";
import * as WebBrowser from "expo-web-browser";
import * as Clipboard from "expo-clipboard";

export const PAYMENT_CONFIG = {
  // OwnPay Open-Source Self-Hosted Payment Gateway (https://github.com/own-pay/ownpay)
  ownpayEndpoint: (process.env.EXPO_PUBLIC_OWNPAY_ENDPOINT || "").replace(/\/$/, ""),
  ownpayApiKey: process.env.EXPO_PUBLIC_OWNPAY_API_KEY || "",
  ownpayCurrency: process.env.EXPO_PUBLIC_OWNPAY_CURRENCY || "INR",

  // Direct Bank Transfer via UPI (NPCI 0% fee standard)
  adminUpiId: process.env.EXPO_PUBLIC_ADMIN_UPI_ID || "nestly.payments@upi",
  adminPayeeName: process.env.EXPO_PUBLIC_ADMIN_PAYEE_NAME || "Nestly Community Platform",
  listingFee: Number(process.env.EXPO_PUBLIC_SERVICE_LISTING_FEE || 99),
  commissionPercent: Number(process.env.EXPO_PUBLIC_COMMISSION_PERCENT || 10),
};

export const isOwnPayConfigured = Boolean(
  PAYMENT_CONFIG.ownpayEndpoint && PAYMENT_CONFIG.ownpayApiKey
);

/**
 * Creates an OwnPay checkout transaction session via REST API (POST /api/v1/payments)
 * Docs: https://ownpay.org/docs and https://github.com/own-pay/ownpay
 */
export async function createOwnPaySession({
  amount = PAYMENT_CONFIG.listingFee,
  currency = PAYMENT_CONFIG.ownpayCurrency,
  reference = `NST-${Date.now()}`,
  customerName = "Nestly Provider",
  customerMail = "resident@nestly.app",
  customerPhone = "+919876543210",
  redirectUrl = "nestly://payment-success",
  cancelUrl = "nestly://payment-cancel",
}) {
  if (!isOwnPayConfigured) {
    return {
      success: false,
      isFallback: true,
      message: "OwnPay endpoint or API key not yet configured in .env",
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
    const res = await fetch(`${PAYMENT_CONFIG.ownpayEndpoint}/api/v1/payments`, {
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
    console.warn("OwnPay creation failed:", err.message);
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
  if (!isOwnPayConfigured || !paymentId) {
    return { success: false, status: "unknown" };
  }

  try {
    const res = await fetch(`${PAYMENT_CONFIG.ownpayEndpoint}/api/v1/payments/${paymentId}`, {
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
 * Builds standard National Payments Corporation of India (NPCI) UPI Intent URL
 */
export function buildUpiPayUrl({
  upiId = PAYMENT_CONFIG.adminUpiId,
  payeeName = PAYMENT_CONFIG.adminPayeeName,
  amount = PAYMENT_CONFIG.listingFee,
  transactionNote = "Nestly Service Listing Verification",
  transactionRef = `NST-${Date.now()}`,
}) {
  const cleanUpi = upiId.trim();
  const cleanName = encodeURIComponent(payeeName.trim());
  const cleanNote = encodeURIComponent(transactionNote);
  return `upi://pay?pa=${cleanUpi}&pn=${cleanName}&am=${amount}&cu=INR&tn=${cleanNote}&tr=${transactionRef}`;
}

/**
 * Generates dynamic high-res QR code image URL for scanning
 */
export function getUpiQrCodeUrl(upiUrl) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=250x250&margin=10&data=${encodeURIComponent(
    upiUrl
  )}`;
}

/**
 * Opens native UPI intent sheet (GPay / PhonePe / Paytm / BHIM) on device
 */
export async function launchUpiApp({
  amount = PAYMENT_CONFIG.listingFee,
  transactionNote = "Nestly Service Listing Fee",
  transactionRef = `NST-${Date.now()}`,
}) {
  const upiUrl = buildUpiPayUrl({ amount, transactionNote, transactionRef });

  if (Platform.OS === "web") {
    return false;
  }

  try {
    const supported = await Linking.canOpenURL(upiUrl);
    if (supported) {
      await Linking.openURL(upiUrl);
      return true;
    }
  } catch (err) {
    console.warn("Could not launch native UPI intent:", err.message);
  }

  return false;
}

/**
 * Copies text to clipboard with alert
 */
export async function copyUpiIdToClipboard(upiId = PAYMENT_CONFIG.adminUpiId) {
  try {
    await Clipboard.setStringAsync(upiId);
    Alert.alert("Copied 📋", `${upiId} copied to clipboard.`);
    return true;
  } catch (e) {
    return false;
  }
}
