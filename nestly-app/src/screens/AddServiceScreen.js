import React, { useState, useEffect, useRef } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import colors, { shadows, radii } from "../theme/colors";
import { SERVICE_CATEGORIES } from "../constants/categories";
import { supabase, isSupabaseConfigured } from "../config/supabase";
import { useAuth } from "../context/AuthContext";
import {
  PAYMENT_CONFIG,
  buildUpiPayUrl,
  copyUpiIdToClipboard,
  copyToClipboard,
  createOwnPaySession,
  getUpiQrCodeUrl,
  isOwnPayConfigured,
  launchOwnPayCheckout,
  launchUpiApp,
  verifyUtrWithOwnPay,
  startPaymentAutoPolling,
} from "../utils/payment";

export default function AddServiceScreen({ navigation }) {
  const { community, user } = useAuth();
  const queryClient = useQueryClient();

  const [name, setName] = useState("");
  const [category, setCategory] = useState(SERVICE_CATEGORIES[0]);
  const [phone, setPhone] = useState(user?.phone || "");
  const [startingPrice, setStartingPrice] = useState("");
  const [description, setDescription] = useState("");

  // Validation State
  const [errors, setErrors] = useState({});
  const [generalError, setGeneralError] = useState("");

  // Payment State
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [ownpayLoading, setOwnpayLoading] = useState(false);
  const [transactionRef, setTransactionRef] = useState("");
  const [paymentId, setPaymentId] = useState("");
  const [utrInput, setUtrInput] = useState("");
  const [utrError, setUtrError] = useState("");
  const [isVerifyingUtr, setIsVerifyingUtr] = useState(false);
  const [isAutoChecking, setIsAutoChecking] = useState(false);
  const [paymentStatusText, setPaymentStatusText] = useState("Awaiting Payment");
  const [copiedField, setCopiedField] = useState(null);
  const [qrWithAmount, setQrWithAmount] = useState(true);
  const pollingStopRef = useRef(null);

  const listingFee = PAYMENT_CONFIG.listingFee;
  const commissionPercent = PAYMENT_CONFIG.commissionPercent;

  function stopActivePolling() {
    if (pollingStopRef.current) {
      pollingStopRef.current();
      pollingStopRef.current = null;
    }
    setIsAutoChecking(false);
  }

  useEffect(() => {
    return () => {
      stopActivePolling();
    };
  }, []);

  function startAutoVerification(pId) {
    if (!pId) return;
    stopActivePolling();
    setIsAutoChecking(true);
    setPaymentStatusText("Checking payment status...");

    pollingStopRef.current = startPaymentAutoPolling(
      pId,
      async (result) => {
        if (result.status === "completed") {
          stopActivePolling();
          setPaymentStatusText("Payment confirmed. Setting up listing...");
          await handleConfirmPaymentAndPublish(result.data?.utr || "AUTOPAY");
        } else if (result.status === "failed") {
          stopActivePolling();
          setPaymentStatusText("Payment could not be verified.");
        }
      },
      { intervalMs: 2000, timeoutMs: 180000 }
    );
  }

  function handleProceedToPayment() {
    const newErrors = {};

    if (!name.trim()) {
      newErrors.name = "Please enter your business or service name.";
    } else if (name.trim().length < 3) {
      newErrors.name = "Service name must be at least 3 characters.";
    }

    const cleanPhone = (phone || "").replace(/[^0-9]/g, "");
    if (!cleanPhone) {
      newErrors.phone = "Phone number is required so neighbours can contact you.";
    } else if (cleanPhone.length !== 10) {
      newErrors.phone = `Phone number must be exactly 10 digits (currently ${cleanPhone.length}).`;
    } else if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
      newErrors.phone = "Please enter a valid 10-digit mobile number starting with 6, 7, 8, or 9.";
    }

    const numericPrice = Number(startingPrice);
    if (!startingPrice.toString().trim() || isNaN(numericPrice) || numericPrice <= 0) {
      newErrors.startingPrice = "Please enter a valid starting price in ₹ (e.g. 199).";
    } else if (numericPrice < 50) {
      newErrors.startingPrice = "Starting price must be at least ₹50.";
    }

    if (!user?.id) {
      newErrors.general = "Please log in to your resident account before listing a service.";
    } else if (!community?.id) {
      newErrors.general = "Please join a community first to list your service.";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      const topError =
        newErrors.name ||
        newErrors.phone ||
        newErrors.startingPrice ||
        newErrors.general ||
        "Please fill in all required details.";
      setGeneralError(topError);
      Alert.alert("Incomplete Details", topError);
      return;
    }

    setErrors({});
    setGeneralError("");
    const txId = `NST-SRV-${Math.floor(100000 + Math.random() * 900000)}`;
    setTransactionRef(txId);
    setUtrInput("");
    setUtrError("");
    setPaymentStatusText("Awaiting payment transfer...");
    setShowPaymentModal(true);

    // Automatically create session so OwnPay auto-polling is instantly ready
    if (isOwnPayConfigured) {
      createOwnPaySession({
        amount: listingFee,
        reference: txId,
        customerName: name.trim(),
        customerMail: user?.email || "provider@nestly.app",
        customerPhone: cleanPhone,
      }).then((session) => {
        if (session && session.success && session.paymentId) {
          setPaymentId(session.paymentId);
          startAutoVerification(session.paymentId);
        }
      }).catch((err) => {
        console.warn("Session pre-initialization notice:", err.message);
      });
    }
  }

  // OwnPay Hosted Checkout Integration (https://github.com/own-pay/ownpay)
  async function handleOwnPayCheckout() {
    setOwnpayLoading(true);
    try {
      if (!isOwnPayConfigured) {
        Alert.alert(
          "OwnPay Server Setup",
          "OwnPay endpoint is not yet connected in .env.\n\n" +
          "To use your self-hosted OwnPay server:\n" +
          "1. Set EXPO_PUBLIC_OWNPAY_ENDPOINT in .env\n" +
          "2. Set EXPO_PUBLIC_OWNPAY_API_KEY in .env\n\n" +
          "In the meantime, you can use Direct UPI Instant Transfer below!"
        );
        return;
      }

      let activePaymentId = paymentId;
      let checkoutUrl = "";

      const session = await createOwnPaySession({
        amount: listingFee,
        reference: transactionRef,
        customerName: name.trim(),
        customerMail: user?.email || "provider@nestly.app",
        customerPhone: phone.trim(),
      });

      if (!session.success || !session.checkoutUrl) {
        throw new Error(session.message || "Failed to initialize OwnPay checkout session.");
      }

      activePaymentId = session.paymentId;
      checkoutUrl = session.checkoutUrl;
      setPaymentId(activePaymentId);

      // Start auto-polling in background
      startAutoVerification(activePaymentId);

      await launchOwnPayCheckout(checkoutUrl);
    } catch (err) {
      Alert.alert("OwnPay Checkout Notice", err.message);
    } finally {
      setOwnpayLoading(false);
    }
  }

  async function handleCopy(text, fieldName) {
    await copyToClipboard(text, fieldName);
    setCopiedField(fieldName);
    setTimeout(() => {
      setCopiedField(null);
    }, 2500);
  }

  async function handleLaunchSpecificApp(app = "generic") {
    if (paymentId) {
      startAutoVerification(paymentId);
    }
    const launched = await launchUpiApp({
      app,
      amount: listingFee,
      transactionNote: `Nestly Listing: ${name.trim()}`,
    });

    if (!launched && Platform.OS === "web") {
      Alert.alert(
        "Scan QR or Copy UPI",
        `On desktop web, scan the QR code using Google Pay/PhonePe/Paytm or copy the UPI ID: ${PAYMENT_CONFIG.adminUpiId}`
      );
    }
  }

  async function handleLaunchUpi() {
    await handleLaunchSpecificApp("generic");
  }

  async function handleVerifyUtr() {
    const cleanUtr = utrInput.replace(/[^0-9]/g, "").trim();
    if (!cleanUtr || cleanUtr.length !== 12) {
      setUtrError("Please enter the complete 12-digit UTR/RRN number from your UPI receipt.");
      return;
    }

    setUtrError("");
    setIsVerifyingUtr(true);

    try {
      let activePid = paymentId;
      if (!activePid) {
        const session = await createOwnPaySession({
          amount: listingFee,
          reference: transactionRef,
          customerName: name.trim(),
          customerMail: user?.email || "provider@nestly.app",
          customerPhone: phone.trim(),
        });
        if (session?.success && session?.paymentId) {
          activePid = session.paymentId;
          setPaymentId(activePid);
        }
      }

      if (activePid) {
        const res = await verifyUtrWithOwnPay(activePid, cleanUtr);
        if (res.success) {
          stopActivePolling();
          Alert.alert("Payment Verified! ✅", `12-digit UTR ${cleanUtr} confirmed.`);
          await handleConfirmPaymentAndPublish(cleanUtr);
          return;
        } else {
          throw new Error(res.message || "UTR verification failed.");
        }
      } else {
        stopActivePolling();
        await handleConfirmPaymentAndPublish(cleanUtr);
      }
    } catch (err) {
      Alert.alert("Verification Notice", err.message || "Failed to verify UTR. Please double check the 12 digits.");
    } finally {
      setIsVerifyingUtr(false);
    }
  }

  async function handleConfirmPaymentAndPublish(verifiedUtr = null) {
    setProcessing(true);
    try {
      if (isSupabaseConfigured && user?.id) {
        const { error } = await supabase.from("services").insert({
          provider_id: user.id,
          community_id: community.id,
          category,
          name: name.trim(),
          location: phone.trim(),
          starting_price: Number(startingPrice) || 199,
          description: description.trim()
            ? `${description.trim()} • Direct Phone: ${phone.trim()}`
            : `Direct Phone: ${phone.trim()}`,
          rating: 5.0,
          verified: true,
        });

        if (error) throw error;
        await queryClient.invalidateQueries({ queryKey: ["community_services"] });
      }

      stopActivePolling();
      setShowPaymentModal(false);
      Alert.alert(
        "Listing Activated",
        `"${name}" is now live in ${community?.name || "your community"}.\n\n` +
        `• Verification: Confirmed (₹${listingFee})\n` +
        `• Platform Fee: 10% on completed bookings\n` +
        `• Reference ID: ${transactionRef}\n` +
        (verifiedUtr ? `• Bank UTR: ${verifiedUtr}\n\n` : "\n") +
        `Residents in your area can now call and book your services directly.`,
        [{ text: "View Services", onPress: () => navigation.goBack() }]
      );
    } catch (err) {
      Alert.alert("Listing Error", err.message || "Failed to save service listing.");
    } finally {
      setProcessing(false);
    }
  }

  const upiPayUrl = buildUpiPayUrl({
    amount: qrWithAmount ? listingFee : undefined,
    includeAmount: qrWithAmount,
    transactionNote: `Nestly Listing: ${name || "Service"}`,
  });
  const qrCodeUrl = getUpiQrCodeUrl(upiPayUrl);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.contentWrap}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons name="arrow-back" size={26} color={colors.text} />
            </TouchableOpacity>
            <Text style={styles.title}>List Your Service</Text>
            <View style={{ width: 26 }} />
          </View>

          {/* Location Banner */}
          <View style={styles.locationBanner}>
            <Ionicons name="business" size={18} color={colors.primary} />
            <Text style={styles.locationBannerText}>
              Listing in: <Text style={{ fontWeight: "800" }}>{community?.name || "Community"}</Text>
            </Text>
          </View>

          {/* Business / Provider Name */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Service / Business Name *</Text>
            <TextInput
              style={[styles.input, errors.name && styles.inputError]}
              placeholder="e.g. Ramesh Electricals & Inverter Service"
              placeholderTextColor={colors.textMuted}
              value={name}
              onChangeText={(t) => {
                setName(t);
                if (errors.name) setErrors((prev) => ({ ...prev, name: null }));
                if (generalError) setGeneralError("");
              }}
            />
            {errors.name ? <Text style={styles.fieldErrorText}>{errors.name}</Text> : null}
          </View>

          {/* Category Picker */}
          <Text style={styles.label}>Select Service Category *</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipRow}
          >
            {SERVICE_CATEGORIES.map((item) => {
              const active = category === item;
              return (
                <TouchableOpacity
                  key={item}
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => setCategory(item)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>
                    {item}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Phone Number */}
          <View style={styles.fieldGroup}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>Contact Phone Number *</Text>
              <Text style={[styles.counterText, phone.length === 10 && styles.counterTextSuccess]}>
                {phone.length}/10 digits
              </Text>
            </View>
            <TextInput
              style={[styles.input, errors.phone && styles.inputError]}
              placeholder="e.g. 9876543210 (10-digit mobile number)"
              placeholderTextColor={colors.textMuted}
              keyboardType="number-pad"
              maxLength={10}
              value={phone}
              onChangeText={(t) => {
                const digits = t.replace(/[^0-9]/g, "").slice(0, 10);
                setPhone(digits);
                if (errors.phone) setErrors((prev) => ({ ...prev, phone: null }));
                if (generalError) setGeneralError("");
              }}
            />
            {errors.phone ? <Text style={styles.fieldErrorText}>{errors.phone}</Text> : null}
          </View>

          {/* Starting Price */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Starting Visit / Service Price (₹) *</Text>
            <TextInput
              style={[styles.input, errors.startingPrice && styles.inputError]}
              placeholder="e.g. 199"
              placeholderTextColor={colors.textMuted}
              keyboardType="numeric"
              value={startingPrice}
              onChangeText={(t) => {
                const numericOnly = t.replace(/[^0-9]/g, "");
                setStartingPrice(numericOnly);
                if (errors.startingPrice) setErrors((prev) => ({ ...prev, startingPrice: null }));
                if (generalError) setGeneralError("");
              }}
            />
            {errors.startingPrice ? (
              <Text style={styles.fieldErrorText}>{errors.startingPrice}</Text>
            ) : null}
          </View>

          {/* Description */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Description & Experience (Optional)</Text>
            <TextInput
              style={styles.textArea}
              placeholder="e.g. 10+ years residential experience, 24x7 emergency call support, certified electrician..."
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={3}
              value={description}
              onChangeText={setDescription}
            />
          </View>

          {/* Transparent Pricing & Terms */}
          <View style={styles.commissionCard}>
            <View style={styles.commissionHeader}>
              <Ionicons name="shield-checkmark" size={22} color={colors.primary} />
              <Text style={styles.commissionTitle}>Pricing & Verification</Text>
            </View>

            <View style={styles.commissionRow}>
              <Ionicons name="checkmark-circle" size={16} color={colors.success} />
              <Text style={styles.commissionText}>
                <Text style={{ fontWeight: "700" }}>Annual Listing Fee: ₹{listingFee}</Text> for 365 days of active visibility and a verified badge.
              </Text>
            </View>

            <View style={styles.commissionRow}>
              <Ionicons name="checkmark-circle" size={16} color={colors.success} />
              <Text style={styles.commissionText}>
                <Text style={{ fontWeight: "700" }}>{commissionPercent}% fee per booking</Text> from residents. You retain 90% of your earnings.
              </Text>
            </View>

            <View style={styles.commissionRow}>
              <Ionicons name="flash-outline" size={16} color={colors.primary} />
              <Text style={styles.commissionText}>
                Direct UPI transfer with instant bank verification.
              </Text>
            </View>
          </View>

          {/* Error Banner */}
          {generalError ? (
            <View style={styles.errorAlertBox}>
              <Ionicons name="alert-circle" size={20} color={colors.danger} />
              <View style={{ flex: 1 }}>
                <Text style={styles.errorAlertTitle}>Please check the form</Text>
                <Text style={styles.errorAlertText}>{generalError}</Text>
              </View>
            </View>
          ) : null}

          {/* Proceed Button */}
          <TouchableOpacity
            style={styles.submitBtn}
            onPress={handleProceedToPayment}
            activeOpacity={0.8}
          >
            <Ionicons name="arrow-forward" size={18} color="#fff" />
            <Text style={styles.submitBtnText}>
              Continue to Payment (₹{listingFee})
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Payment Checkout Modal (OwnPay / UPI / QR / Auto-Verification) */}
      <Modal
        visible={showPaymentModal}
        transparent
        animationType="slide"
        onRequestClose={() => {
          stopActivePolling();
          setShowPaymentModal(false);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Ionicons name="shield-checkmark" size={24} color={colors.primary} />
                <Text style={styles.modalTitle}>Checkout & Verification</Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  stopActivePolling();
                  setShowPaymentModal(false);
                }}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Ionicons name="close-circle" size={26} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={{ maxHeight: 560 }}
              contentContainerStyle={{ paddingBottom: 24 }}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <Text style={styles.modalSub}>
                Activate your 1-year verified resident listing for{" "}
                <Text style={{ fontWeight: "700", color: colors.text }}>{name || "your service"}</Text>.
              </Text>

              {/* Order & Service Details Summary */}
              <View style={styles.orderSummaryCard}>
                <Text style={styles.orderSummaryHeader}>Order & Service Details</Text>
                
                <View style={styles.orderSummaryRow}>
                  <Text style={styles.orderSummaryLabel}>Service Name</Text>
                  <Text style={styles.orderSummaryVal}>{name || "Service"}</Text>
                </View>

                <View style={styles.orderSummaryRow}>
                  <Text style={styles.orderSummaryLabel}>Category</Text>
                  <View style={styles.categoryPill}>
                    <Text style={styles.categoryPillText}>{category}</Text>
                  </View>
                </View>

                <View style={styles.orderSummaryRow}>
                  <Text style={styles.orderSummaryLabel}>Registered Contact</Text>
                  <Text style={styles.orderSummaryVal}>{phone || "Not specified"}</Text>
                </View>

                <View style={styles.orderSummaryRow}>
                  <Text style={styles.orderSummaryLabel}>Community</Text>
                  <Text style={styles.orderSummaryVal}>{community?.name || "Local Community"}</Text>
                </View>

                <View style={styles.orderSummaryRow}>
                  <Text style={styles.orderSummaryLabel}>Listing Validity</Text>
                  <Text style={[styles.orderSummaryVal, { color: colors.primary, fontWeight: "800" }]}>
                    365 Days Verified Listing
                  </Text>
                </View>

                {/* Itemized Fee Breakdown */}
                <View style={styles.invoiceDivider} />
                
                <View style={styles.orderSummaryRow}>
                  <Text style={styles.orderSummarySub}>Annual Verification & Onboarding</Text>
                  <Text style={styles.orderSummarySub}>₹83.90</Text>
                </View>

                <View style={styles.orderSummaryRow}>
                  <Text style={styles.orderSummarySub}>Applicable GST (18%)</Text>
                  <Text style={styles.orderSummarySub}>₹15.10</Text>
                </View>

                <View style={[styles.orderSummaryRow, { marginTop: 6 }]}>
                  <Text style={[styles.orderSummaryLabel, { fontSize: 15, fontWeight: "900" }]}>Total Payable</Text>
                  <Text style={[styles.orderSummaryVal, { fontSize: 18, fontWeight: "900", color: colors.primary }]}>₹{listingFee}</Text>
                </View>
              </View>

              {/* Price Banner */}
              <View style={styles.feeBanner}>
                <View>
                  <Text style={styles.feeLabel}>Total Amount Payable</Text>
                  <Text style={styles.feeSub}>0% Surcharge • NPCI Bank Transfer</Text>
                </View>
                <Text style={styles.feeValue}>₹{listingFee}</Text>
              </View>

              {/* Live Status Banner */}
              <View style={styles.autoVerifyBanner}>
                {isAutoChecking ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Ionicons name="radio-button-on" size={18} color="#16A34A" />
                )}
                <Text style={styles.autoVerifyText}>{paymentStatusText}</Text>
              </View>

              {/* Direct 1-Tap UPI Apps Grid */}
              <Text style={styles.sectionHeaderTitle}>1-Tap Pay via UPI Apps</Text>
              <View style={styles.upiAppsGrid}>
                <TouchableOpacity
                  style={[styles.upiAppBtn, { borderColor: "#E5E7EB" }]}
                  onPress={() => handleLaunchSpecificApp("gpay")}
                  activeOpacity={0.8}
                >
                  <Ionicons name="logo-google" size={18} color="#EA4335" />
                  <Text style={styles.upiAppBtnText}>Google Pay</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.upiAppBtn, { backgroundColor: "#5F259F", borderColor: "#5F259F" }]}
                  onPress={() => handleLaunchSpecificApp("phonepe")}
                  activeOpacity={0.8}
                >
                  <Ionicons name="flash" size={18} color="#fff" />
                  <Text style={[styles.upiAppBtnText, { color: "#fff" }]}>PhonePe</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.upiAppBtn, { backgroundColor: "#00BAF2", borderColor: "#00BAF2" }]}
                  onPress={() => handleLaunchSpecificApp("paytm")}
                  activeOpacity={0.8}
                >
                  <Ionicons name="wallet-outline" size={18} color="#fff" />
                  <Text style={[styles.upiAppBtnText, { color: "#fff" }]}>Paytm</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.upiAppBtn, { backgroundColor: colors.primary, borderColor: colors.primary }]}
                  onPress={() => handleLaunchSpecificApp("generic")}
                  activeOpacity={0.8}
                >
                  <Ionicons name="qr-code-outline" size={18} color="#fff" />
                  <Text style={[styles.upiAppBtnText, { color: "#fff" }]}>Any UPI App</Text>
                </TouchableOpacity>
              </View>

              {/* UPI QR Code Section */}
              <View style={styles.qrSection}>
                <View style={styles.qrHeaderRow}>
                  <Text style={styles.qrTitle}>Scan to Pay ₹{listingFee}</Text>
                  <TouchableOpacity
                    style={styles.qrToggleBtn}
                    onPress={() => setQrWithAmount(!qrWithAmount)}
                  >
                    <Text style={styles.qrToggleText}>
                      {qrWithAmount ? "Amount Fixed (₹99)" : "Open Amount"}
                    </Text>
                  </TouchableOpacity>
                </View>

                <Image
                  source={{ uri: qrCodeUrl }}
                  style={styles.qrImage}
                  resizeMode="contain"
                />
                <Text style={styles.qrHint}>
                  Scan using Google Pay, PhonePe, Paytm, BHIM, Cred, or any banking app
                </Text>
              </View>

              {/* Beneficiary Bank Account Details Card */}
              <View style={styles.beneficiaryCard}>
                <Text style={styles.beneficiaryHeader}>Official Receiving Beneficiary</Text>

                {/* UPI ID Row */}
                <View style={styles.beneficiaryRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.beneficiaryLabel}>Official UPI ID / VPA</Text>
                    <Text style={styles.beneficiaryVal}>{PAYMENT_CONFIG.adminUpiId}</Text>
                  </View>
                  <TouchableOpacity
                    style={[
                      styles.copyActionBtn,
                      copiedField === "upi" ? styles.copyActionBtnSuccess : null,
                    ]}
                    onPress={() => handleCopy(PAYMENT_CONFIG.adminUpiId, "upi")}
                  >
                    <Ionicons
                      name={copiedField === "upi" ? "checkmark" : "copy-outline"}
                      size={14}
                      color={copiedField === "upi" ? "#fff" : colors.primary}
                    />
                    <Text
                      style={[
                        styles.copyActionBtnText,
                        copiedField === "upi" ? { color: "#fff" } : null,
                      ]}
                    >
                      {copiedField === "upi" ? "Copied!" : "Copy"}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Mobile Number Row */}
                <View style={styles.beneficiaryRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.beneficiaryLabel}>PhonePe / GPay Mobile No.</Text>
                    <Text style={styles.beneficiaryVal}>7735550648</Text>
                  </View>
                  <TouchableOpacity
                    style={[
                      styles.copyActionBtn,
                      copiedField === "phone" ? styles.copyActionBtnSuccess : null,
                    ]}
                    onPress={() => handleCopy("7735550648", "phone")}
                  >
                    <Ionicons
                      name={copiedField === "phone" ? "checkmark" : "copy-outline"}
                      size={14}
                      color={copiedField === "phone" ? "#fff" : colors.primary}
                    />
                    <Text
                      style={[
                        styles.copyActionBtnText,
                        copiedField === "phone" ? { color: "#fff" } : null,
                      ]}
                    >
                      {copiedField === "phone" ? "Copied!" : "Copy"}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Bank Name */}
                <View style={[styles.beneficiaryRow, { borderBottomWidth: 0, paddingBottom: 0 }]}>
                  <View>
                    <Text style={styles.beneficiaryLabel}>Receiving Bank</Text>
                    <Text style={styles.beneficiaryVal}>Kotak Mahindra Bank (Kotak 811)</Text>
                  </View>
                  <View style={styles.verifiedPill}>
                    <Ionicons name="checkmark-circle" size={14} color="#15803D" />
                    <Text style={styles.verifiedPillText}>Verified</Text>
                  </View>
                </View>
              </View>

              {/* OwnPay Gateway Hosted Web Button */}
              <TouchableOpacity
                style={styles.ownpayBtn}
                onPress={handleOwnPayCheckout}
                disabled={ownpayLoading}
                activeOpacity={0.85}
              >
                {ownpayLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="open-outline" size={18} color="#fff" />
                    <Text style={styles.ownpayBtnText}>
                      Open OwnPay Hosted Checkout Page
                    </Text>
                    <View style={styles.ownpayPill}>
                      <Text style={styles.ownpayPillText}>Web</Text>
                    </View>
                  </>
                )}
              </TouchableOpacity>

              {/* Automatic UTR Verification Box */}
              <View style={styles.utrCard}>
                <View style={styles.utrHeaderRow}>
                  <Ionicons name="checkmark-done-circle" size={22} color={colors.primary} />
                  <Text style={styles.utrCardTitle}>Paid? Auto-Verify with 12-Digit UTR</Text>
                </View>
                <Text style={styles.utrCardDesc}>
                  Open your UPI app receipt (GPay / PhonePe / Paytm), copy the 12-digit UTR / UPI Ref / RRN No., and verify below:
                </Text>
                <View style={styles.utrInputRow}>
                  <TextInput
                    style={[styles.utrInput, utrError ? styles.utrInputError : null]}
                    placeholder="12-digit UTR (e.g. 430612345678)"
                    placeholderTextColor={colors.textMuted}
                    value={utrInput}
                    onChangeText={(val) => {
                      const clean = val.replace(/[^0-9]/g, "").slice(0, 12);
                      setUtrInput(clean);
                      if (utrError) setUtrError("");
                    }}
                    keyboardType="number-pad"
                    maxLength={12}
                  />
                  <TouchableOpacity
                    style={[
                      styles.verifyUtrBtn,
                      utrInput.length === 12 ? styles.verifyUtrBtnActive : styles.verifyUtrBtnDisabled,
                    ]}
                    onPress={handleVerifyUtr}
                    disabled={isVerifyingUtr || utrInput.length !== 12}
                    activeOpacity={0.8}
                  >
                    {isVerifyingUtr ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={styles.verifyUtrBtnText}>Verify & Publish</Text>
                    )}
                  </TouchableOpacity>
                </View>
                <Text style={styles.utrCounterText}>{utrInput.length} / 12 digits</Text>
                {utrError ? <Text style={styles.utrErrorText}>{utrError}</Text> : null}
              </View>

              {/* Commission Transparency Callout */}
              <View style={styles.commissionNoteCard}>
                <Ionicons name="shield-checkmark-outline" size={18} color={colors.primary} />
                <Text style={styles.commissionNoteText}>
                  <Text style={{ fontWeight: "800" }}>10% Platform Protection:</Text> Nestly deducts a 10% fee only when you get bookings from neighbours. 90% stays directly with you.
                </Text>
              </View>

              {/* Fallback Publish Button */}
              <TouchableOpacity
                style={styles.confirmPublishBtn}
                onPress={() => handleConfirmPaymentAndPublish()}
                disabled={processing}
                activeOpacity={0.8}
              >
                {processing ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="checkmark-done" size={20} color="#fff" />
                    <Text style={styles.confirmPublishBtnText}>
                      I Have Transferred ₹{listingFee} — Complete Listing
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              {/* Help & Support note */}
              <Text style={styles.supportNoteText}>
                Need help with payment? Contact community support: +91 7735550648
              </Text>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: 20,
    paddingTop: 54,
    paddingBottom: 40,
  },
  contentWrap: {
    width: "100%",
    maxWidth: 520,
    alignSelf: "center",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: "900",
    color: colors.text,
    letterSpacing: -0.3,
  },
  locationBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    marginBottom: 20,
  },
  locationBannerText: {
    fontSize: 14.5,
    color: colors.primaryDark,
  },
  fieldGroup: {
    marginBottom: 16,
  },
  labelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  label: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.text,
    marginBottom: 8,
    letterSpacing: -0.2,
  },
  counterText: {
    fontSize: 12.5,
    fontWeight: "700",
    color: colors.textMuted,
    marginBottom: 8,
  },
  counterTextSuccess: {
    color: colors.success,
    fontWeight: "800",
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radii.md,
    paddingHorizontal: 16,
    height: 52,
    fontSize: 15.5,
    color: colors.text,
    ...shadows.sm,
  },
  inputError: {
    borderColor: colors.danger,
    backgroundColor: "#FEF2F2",
    borderWidth: 1.5,
  },
  fieldErrorText: {
    color: colors.danger,
    fontSize: 12.5,
    fontWeight: "700",
    marginTop: 6,
    marginLeft: 4,
  },
  chipRow: {
    gap: 10,
    paddingVertical: 4,
    marginBottom: 16,
  },
  chip: {
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radii.pill,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: colors.surface,
    height: 40,
    justifyContent: "center",
    ...shadows.sm,
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primaryDark,
  },
  chipText: {
    fontSize: 13.5,
    color: colors.textMuted,
    fontWeight: "800",
  },
  chipTextActive: {
    color: "#fff",
  },
  textArea: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radii.md,
    padding: 14,
    minHeight: 90,
    fontSize: 15.5,
    color: colors.text,
    textAlignVertical: "top",
    ...shadows.sm,
  },
  commissionCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: 18,
    borderWidth: 1.5,
    borderColor: "rgba(13,122,95,0.3)",
    marginBottom: 22,
    marginTop: 4,
    ...shadows.card,
  },
  commissionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  commissionTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: colors.primaryDark,
  },
  commissionRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginBottom: 8,
  },
  commissionText: {
    flex: 1,
    fontSize: 13.5,
    color: colors.text,
    lineHeight: 19,
  },
  errorAlertBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#FEF2F2",
    borderWidth: 1.5,
    borderColor: "#FECACA",
    borderRadius: radii.md,
    padding: 14,
    marginBottom: 16,
    ...shadows.emergency,
  },
  errorAlertTitle: {
    fontSize: 14,
    fontWeight: "900",
    color: colors.danger,
  },
  errorAlertText: {
    fontSize: 13,
    color: colors.danger,
    marginTop: 2,
    lineHeight: 18,
    fontWeight: "600",
  },
  submitBtn: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.primary,
    borderRadius: radii.pill,
    height: 54,
    ...shadows.button,
  },
  submitBtnText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.65)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingBottom: 38,
    maxWidth: 520,
    width: "100%",
    alignSelf: "center",
    ...shadows.cardHover,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.text,
  },
  modalSub: {
    fontSize: 13.5,
    color: colors.textMuted,
    marginBottom: 14,
    lineHeight: 19,
  },
  feeBanner: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    marginBottom: 14,
  },
  feeLabel: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.primaryDark,
  },
  feeSub: {
    fontSize: 12,
    color: colors.primaryDark,
    marginTop: 2,
  },
  feeValue: {
    fontSize: 24,
    fontWeight: "900",
    color: colors.primaryDark,
  },
  ownpayBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#0F172A",
    borderRadius: 14,
    height: 50,
    marginBottom: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  ownpayBtnText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 15,
  },
  ownpayPill: {
    backgroundColor: colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  ownpayPillText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 11,
  },
  orDivider: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  orLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.borderLight,
  },
  orText: {
    paddingHorizontal: 10,
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "600",
  },
  qrSection: {
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginBottom: 12,
  },
  qrImage: {
    width: 150,
    height: 150,
  },
  qrHint: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: "600",
    marginTop: 6,
    textAlign: "center",
  },
  upiCopyRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 12,
  },
  upiLabel: {
    fontSize: 11.5,
    color: colors.textMuted,
    fontWeight: "600",
  },
  upiValue: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.text,
    marginTop: 2,
  },
  copyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  copyBtnText: {
    color: colors.primaryDark,
    fontWeight: "700",
    fontSize: 13,
  },
  launchUpiBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#2563EB",
    borderRadius: 14,
    height: 48,
    marginBottom: 10,
  },
  launchUpiBtnText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 14.5,
  },
  confirmPublishBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.primary,
    borderRadius: 14,
    height: 52,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  confirmPublishBtnText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 15,
  },
  autoVerifyBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.surfaceVariant || "#F1F5F9",
    borderWidth: 1,
    borderColor: colors.borderLight,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    marginBottom: 14,
  },
  autoVerifyText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.primaryDark,
    flex: 1,
  },
  utrCard: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
  },
  utrHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  utrCardTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.text,
  },
  utrCardDesc: {
    fontSize: 12,
    color: colors.textMuted,
    lineHeight: 16,
    marginBottom: 10,
  },
  utrInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  utrInput: {
    flex: 1,
    backgroundColor: "#fff",
    borderWidth: 1.5,
    borderColor: colors.borderLight,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
    fontSize: 14,
    fontWeight: "700",
    color: colors.text,
  },
  utrInputError: {
    borderColor: colors.danger,
    backgroundColor: "#FEF2F2",
  },
  verifyUtrBtn: {
    paddingHorizontal: 16,
    height: 44,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  verifyUtrBtnActive: {
    backgroundColor: colors.primary,
  },
  verifyUtrBtnDisabled: {
    backgroundColor: colors.borderLight || "#CBD5E1",
  },
  verifyUtrBtnText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 13,
  },
  utrErrorText: {
    color: colors.danger,
    fontSize: 12,
    fontWeight: "600",
    marginTop: 6,
  },
  orderSummaryCard: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
  },
  orderSummaryHeader: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  orderSummaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  orderSummaryLabel: {
    fontSize: 13,
    color: colors.textMuted,
    fontWeight: "600",
  },
  orderSummaryVal: {
    fontSize: 13.5,
    fontWeight: "700",
    color: colors.text,
  },
  orderSummarySub: {
    fontSize: 12.5,
    color: colors.textMuted,
    fontWeight: "500",
  },
  categoryPill: {
    backgroundColor: "#EEF2FF",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  categoryPillText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#4338CA",
  },
  invoiceDivider: {
    height: 1,
    borderStyle: "dashed",
    borderWidth: 0.5,
    borderColor: colors.borderLight,
    marginVertical: 8,
  },
  sectionHeaderTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.text,
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  upiAppsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 14,
  },
  upiAppBtn: {
    flex: 1,
    minWidth: "47%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    backgroundColor: "#FFFFFF",
    ...shadows.card,
  },
  upiAppBtnText: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.text,
  },
  qrHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
    paddingHorizontal: 8,
    marginBottom: 8,
  },
  qrTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.text,
  },
  qrToggleBtn: {
    backgroundColor: colors.surfaceVariant || "#F1F5F9",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  qrToggleText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.primary,
  },
  beneficiaryCard: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1.5,
    borderColor: colors.borderLight,
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
  },
  beneficiaryHeader: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  beneficiaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 8,
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  beneficiaryLabel: {
    fontSize: 11.5,
    color: colors.textMuted,
    fontWeight: "600",
  },
  beneficiaryVal: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.text,
    marginTop: 2,
  },
  copyActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  copyActionBtnSuccess: {
    backgroundColor: colors.primary,
  },
  copyActionBtnText: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.primaryDark,
  },
  verifiedPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  verifiedPillText: {
    fontSize: 11.5,
    fontWeight: "800",
    color: "#15803D",
  },
  utrCounterText: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 4,
    textAlign: "right",
    fontWeight: "600",
  },
  commissionNoteCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
  },
  commissionNoteText: {
    flex: 1,
    fontSize: 12,
    color: colors.textMuted,
    lineHeight: 16,
  },
  supportNoteText: {
    fontSize: 11.5,
    color: colors.textMuted,
    textAlign: "center",
    marginTop: 10,
    fontWeight: "600",
  },
});
