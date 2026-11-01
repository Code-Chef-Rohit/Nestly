import React, { useState } from "react";
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
import colors from "../theme/colors";
import { SERVICE_CATEGORIES } from "../constants/categories";
import { supabase, isSupabaseConfigured } from "../config/supabase";
import { useAuth } from "../context/AuthContext";
import {
  PAYMENT_CONFIG,
  buildUpiPayUrl,
  copyUpiIdToClipboard,
  createOwnPaySession,
  getUpiQrCodeUrl,
  isOwnPayConfigured,
  launchOwnPayCheckout,
  launchUpiApp,
} from "../utils/payment";

export default function AddServiceScreen({ navigation }) {
  const { community, user } = useAuth();
  const queryClient = useQueryClient();

  const [name, setName] = useState("");
  const [category, setCategory] = useState(SERVICE_CATEGORIES[0]);
  const [phone, setPhone] = useState(user?.phone || "");
  const [startingPrice, setStartingPrice] = useState("");
  const [description, setDescription] = useState("");

  // Payment State
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [ownpayLoading, setOwnpayLoading] = useState(false);
  const [transactionRef, setTransactionRef] = useState("");

  const listingFee = PAYMENT_CONFIG.listingFee;
  const commissionPercent = PAYMENT_CONFIG.commissionPercent;

  function handleProceedToPayment() {
    if (!name.trim()) {
      Alert.alert("Name Required", "Please enter your business or service name.");
      return;
    }
    if (!phone.trim()) {
      Alert.alert("Phone Required", "Please provide a contact phone number for customer bookings.");
      return;
    }
    if (!startingPrice.trim() || isNaN(startingPrice)) {
      Alert.alert("Valid Price Required", "Please enter a valid starting price in ₹.");
      return;
    }
    if (!user?.id) {
      Alert.alert("Account Required", "Please log in to your resident account before listing a service.");
      return;
    }
    if (!community?.id) {
      Alert.alert("No Community Selected", "Please join a community first to list your service.");
      return;
    }

    const txId = `NST-SRV-${Math.floor(100000 + Math.random() * 900000)}`;
    setTransactionRef(txId);
    setShowPaymentModal(true);
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

      const completed = await launchOwnPayCheckout(session.checkoutUrl);
      if (completed) {
        await handleConfirmPaymentAndPublish();
      }
    } catch (err) {
      Alert.alert("OwnPay Checkout Notice", err.message);
    } finally {
      setOwnpayLoading(false);
    }
  }

  async function handleLaunchUpi() {
    const launched = await launchUpiApp({
      amount: listingFee,
      transactionNote: `Nestly Listing: ${name.trim()}`,
      transactionRef,
    });

    if (!launched && Platform.OS === "web") {
      Alert.alert(
        "Scan QR or Copy UPI",
        `On desktop web, scan the QR code using Google Pay/PhonePe/Paytm or copy the UPI ID: ${PAYMENT_CONFIG.adminUpiId}`
      );
    }
  }

  async function handleConfirmPaymentAndPublish() {
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

      setShowPaymentModal(false);
      Alert.alert(
        "Service Listed Successfully! 🎉",
        `"${name}" is now live in ${community?.name || "your community"}.\n\n` +
        `• Verification Fee: Paid (₹${listingFee})\n` +
        `• Platform Commission: 10% on customer bookings\n` +
        `• Payment Gateway: OwnPay & Direct Settlement\n` +
        `• Reference ID: ${transactionRef}\n\n` +
        `Residents can now call and book your services directly.`,
        [{ text: "View Services", onPress: () => navigation.goBack() }]
      );
    } catch (err) {
      Alert.alert("Listing Error", err.message || "Failed to save service listing.");
    } finally {
      setProcessing(false);
    }
  }

  const upiPayUrl = buildUpiPayUrl({
    amount: listingFee,
    transactionNote: `Nestly Listing: ${name || "Service"}`,
    transactionRef: transactionRef || "NST-123",
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
              style={styles.input}
              placeholder="e.g. Ramesh Electricals & Inverter Service"
              placeholderTextColor={colors.textMuted}
              value={name}
              onChangeText={setName}
            />
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
            <Text style={styles.label}>Contact Phone Number *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 9876543210 (Residents will call this number)"
              placeholderTextColor={colors.textMuted}
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
            />
          </View>

          {/* Starting Price */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Starting Visit / Service Price (₹) *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 199"
              placeholderTextColor={colors.textMuted}
              keyboardType="numeric"
              value={startingPrice}
              onChangeText={setStartingPrice}
            />
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

          {/* Monetization & 10% Commission Card */}
          <View style={styles.commissionCard}>
            <View style={styles.commissionHeader}>
              <Ionicons name="shield-checkmark" size={24} color={colors.primary} />
              <Text style={styles.commissionTitle}>Nestly Partner Terms</Text>
            </View>

            <View style={styles.commissionRow}>
              <Ionicons name="checkmark-circle" size={16} color={colors.success} />
              <Text style={styles.commissionText}>
                <Text style={{ fontWeight: "800" }}>{commissionPercent}% Platform Fee</Text> on customer bookings you receive.
              </Text>
            </View>

            <View style={styles.commissionRow}>
              <Ionicons name="checkmark-circle" size={16} color={colors.success} />
              <Text style={styles.commissionText}>
                <Text style={{ fontWeight: "800" }}>One-time Verification Deposit</Text>: ₹{listingFee} to verify your phone number and badge.
              </Text>
            </View>

            <View style={styles.commissionRow}>
              <Ionicons name="globe-outline" size={16} color={colors.info} />
              <Text style={styles.commissionText}>
                Powered by <Text style={{ fontWeight: "800" }}>OwnPay</Text> open-source payment infrastructure.
              </Text>
            </View>
          </View>

          {/* Proceed to Payment Button */}
          <TouchableOpacity
            style={styles.submitBtn}
            onPress={handleProceedToPayment}
            activeOpacity={0.8}
          >
            <Ionicons name="card" size={20} color="#fff" />
            <Text style={styles.submitBtnText}>
              Pay ₹{listingFee} & Activate Service Listing
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Payment Checkout Modal (OwnPay / UPI / QR) */}
      <Modal
        visible={showPaymentModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPaymentModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Ionicons name="wallet" size={24} color={colors.primary} />
                <Text style={styles.modalTitle}>Checkout & Verification</Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowPaymentModal(false)}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Ionicons name="close-circle" size={26} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSub}>
              Pay the verification fee to activate your service listing for{" "}
              <Text style={{ fontWeight: "700", color: colors.text }}>{name}</Text>.
            </Text>

            {/* Price Badge */}
            <View style={styles.feeBanner}>
              <View>
                <Text style={styles.feeLabel}>Total Amount Payable</Text>
                <Text style={styles.feeSub}>Includes verification & partner badge</Text>
              </View>
              <Text style={styles.feeValue}>₹{listingFee}</Text>
            </View>

            {/* OwnPay Gateway Button */}
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
                  <Ionicons name="flash" size={18} color="#fff" />
                  <Text style={styles.ownpayBtnText}>
                    Pay with OwnPay Gateway
                  </Text>
                  <View style={styles.ownpayPill}>
                    <Text style={styles.ownpayPillText}>Open-Source</Text>
                  </View>
                </>
              )}
            </TouchableOpacity>

            <View style={styles.orDivider}>
              <View style={styles.orLine} />
              <Text style={styles.orText}>or direct UPI instant transfer</Text>
              <View style={styles.orLine} />
            </View>

            {/* UPI QR Code Section */}
            <View style={styles.qrSection}>
              <Image
                source={{ uri: qrCodeUrl }}
                style={styles.qrImage}
                resizeMode="contain"
              />
              <Text style={styles.qrHint}>
                Scan with Google Pay, PhonePe, Paytm, or any UPI app
              </Text>
            </View>

            {/* UPI ID Copy Row */}
            <View style={styles.upiCopyRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.upiLabel}>Official UPI ID / VPA</Text>
                <Text style={styles.upiValue}>{PAYMENT_CONFIG.adminUpiId}</Text>
              </View>
              <TouchableOpacity
                style={styles.copyBtn}
                onPress={() => copyUpiIdToClipboard(PAYMENT_CONFIG.adminUpiId)}
              >
                <Ionicons name="copy-outline" size={16} color={colors.primary} />
                <Text style={styles.copyBtnText}>Copy</Text>
              </TouchableOpacity>
            </View>

            {/* Launch App Button (Mobile Intent) */}
            <TouchableOpacity
              style={styles.launchUpiBtn}
              onPress={handleLaunchUpi}
              activeOpacity={0.8}
            >
              <Ionicons name="phone-portrait-outline" size={20} color="#fff" />
              <Text style={styles.launchUpiBtnText}>
                Open UPI App (GPay / PhonePe / Paytm)
              </Text>
            </TouchableOpacity>

            {/* Final Publish Button */}
            <TouchableOpacity
              style={styles.confirmPublishBtn}
              onPress={handleConfirmPaymentAndPublish}
              disabled={processing}
              activeOpacity={0.8}
            >
              {processing ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="checkmark-done" size={22} color="#fff" />
                  <Text style={styles.confirmPublishBtnText}>
                    I Have Transferred ₹{listingFee} — Publish Now
                  </Text>
                </>
              )}
            </TouchableOpacity>
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
  label: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.text,
    marginBottom: 8,
    letterSpacing: -0.2,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 14,
    paddingHorizontal: 16,
    height: 52,
    fontSize: 15.5,
    color: colors.text,
  },
  chipRow: {
    gap: 10,
    paddingVertical: 4,
    marginBottom: 16,
  },
  chip: {
    borderWidth: 1.5,
    borderColor: colors.borderLight,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: colors.surface,
    height: 40,
    justifyContent: "center",
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primaryDark,
  },
  chipText: {
    fontSize: 13.5,
    color: colors.textMuted,
    fontWeight: "700",
  },
  chipTextActive: {
    color: "#fff",
  },
  textArea: {
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 14,
    minHeight: 90,
    fontSize: 15.5,
    color: colors.text,
    textAlignVertical: "top",
  },
  commissionCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    borderColor: colors.primary,
    marginBottom: 22,
    marginTop: 4,
  },
  commissionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  commissionTitle: {
    fontSize: 16,
    fontWeight: "800",
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
  submitBtn: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.primary,
    borderRadius: 16,
    height: 54,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  submitBtnText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 22,
    paddingBottom: 36,
    maxWidth: 520,
    width: "100%",
    alignSelf: "center",
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
});
