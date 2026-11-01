import { Alert, Linking, Platform } from "react-native";
import * as Clipboard from "expo-clipboard";

export const PAYMENT_CONFIG = {
  adminUpiId: process.env.EXPO_PUBLIC_ADMIN_UPI_ID || "nestly.payments@upi",
  adminPayeeName: process.env.EXPO_PUBLIC_ADMIN_PAYEE_NAME || "Nestly Community Platform",
  listingFee: Number(process.env.EXPO_PUBLIC_SERVICE_LISTING_FEE || 99),
  commissionPercent: Number(process.env.EXPO_PUBLIC_COMMISSION_PERCENT || 10),
  razorpayKeyId: process.env.EXPO_PUBLIC_RAZORPAY_KEY_ID || "",
};

/**
 * Builds standard National Payments Corporation of India (NPCI) UPI Intent URL
 * Supported by Google Pay, PhonePe, Paytm, BHIM, Cred, and all Indian banking apps.
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
 * Generates dynamic high-res QR code image URL for desktop web or scanning with another phone
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
    // Web cannot directly launch native intents; return false so UI displays QR and VPA
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
 * Copies UPI ID to clipboard with toast/alert
 */
export async function copyUpiIdToClipboard(upiId = PAYMENT_CONFIG.adminUpiId) {
  try {
    await Clipboard.setStringAsync(upiId);
    Alert.alert("UPI ID Copied 📋", `${upiId} copied to clipboard. You can paste it into Google Pay, PhonePe, or Paytm.`);
    return true;
  } catch (e) {
    return false;
  }
}
