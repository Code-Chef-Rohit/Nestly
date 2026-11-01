import React, { useState } from "react";
import {
  Alert,
  Linking,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import colors from "../theme/colors";
import { calculateCommission, launchUpiApp, PAYMENT_CONFIG } from "../utils/payment";

export default function ServiceCard({ service }) {
  const phoneNumber = service.phone || service.location || "9876543210";
  const price = Number(service.starting_price || service.startingPrice) || 299;
  const split = calculateCommission(price, PAYMENT_CONFIG.commissionPercent);

  const [bookingModalVisible, setBookingModalVisible] = useState(false);
  const [flatNumber, setFlatNumber] = useState("");
  const [timeSlot, setTimeSlot] = useState("Today, As soon as possible");
  const [bookingNote, setBookingNote] = useState("");
  const [confirmed, setConfirmed] = useState(false);

  const handleCall = () => {
    const url = `tel:${phoneNumber}`;
    Linking.canOpenURL(url)
      .then((supported) => {
        if (supported) {
          Linking.openURL(url);
        } else {
          Alert.alert("Contact Service", `Call ${service.name} at: ${phoneNumber}`);
        }
      })
      .catch(() => {
        Alert.alert("Contact Service", `Call ${service.name} at: ${phoneNumber}`);
      });
  };

  const handleConfirmBooking = () => {
    setConfirmed(true);
    setTimeout(() => {
      setBookingModalVisible(false);
      setConfirmed(false);
      Alert.alert(
        "Booking Confirmed! 🛠️",
        `Your request for ${service.name} (${service.category}) has been submitted.\n\n` +
        `• Base Price: ₹${split.basePrice}\n` +
        `• 10% Platform Protection: ₹${split.commissionAmount}\n` +
        `• Provider: ${service.name} (${phoneNumber})\n\n` +
        `The provider has been notified and will call you shortly.`,
        [
          { text: "Call Provider", onPress: handleCall },
          { text: "Done", style: "cancel" },
        ]
      );
    }, 400);
  };

  return (
    <View style={styles.card}>
      {/* Title & verification */}
      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Text style={styles.name}>{service.name}</Text>
            {service.verified && (
              <Ionicons name="checkmark-circle" size={18} color={colors.success} />
            )}
          </View>
          <Text style={styles.category}>{service.category}</Text>
        </View>

        {price ? (
          <View style={styles.priceContainer}>
            <Text style={styles.priceLabel}>Starting from</Text>
            <Text style={styles.priceValue}>₹{price}</Text>
          </View>
        ) : null}
      </View>

      {/* Meta Row: Rating, distance, verified */}
      <View style={styles.metaRow}>
        <View style={styles.metaBadge}>
          <Ionicons name="star" size={15} color={colors.warning} />
          <Text style={styles.ratingText}>{service.rating || "4.8"}</Text>
        </View>
        {service.distanceKm && (
          <View style={styles.metaItem}>
            <Ionicons name="location-outline" size={15} color={colors.textMuted} />
            <Text style={styles.metaText}>{service.distanceKm} km away</Text>
          </View>
        )}
        <View style={styles.metaItem}>
          <Ionicons name="shield-checkmark-outline" size={15} color={colors.primary} />
          <Text style={[styles.metaText, { color: colors.primary, fontWeight: "600" }]}>
            10% Platform Guarantee
          </Text>
        </View>
      </View>

      {/* Action Buttons - large and senior accessible */}
      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={styles.callBtn}
          onPress={handleCall}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={`Call ${service.name}`}
        >
          <Ionicons name="call" size={18} color="#fff" />
          <Text style={styles.callBtnText}>Call Now</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.bookBtn}
          onPress={() => setBookingModalVisible(true)}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={`Book ${service.name}`}
        >
          <Text style={styles.bookBtnText}>Book Visit</Text>
        </TouchableOpacity>
      </View>

      {/* Booking & 10% Commission Breakdown Modal */}
      <Modal
        visible={bookingModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setBookingModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Ionicons name="calendar" size={24} color={colors.primary} />
                <Text style={styles.modalTitle}>Book {service.name}</Text>
              </View>
              <TouchableOpacity
                onPress={() => setBookingModalVisible(false)}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Ionicons name="close-circle" size={26} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalCategory}>Category: {service.category}</Text>

            {/* Price & 10% Commission Split Box */}
            <View style={styles.splitBox}>
              <View style={styles.splitRow}>
                <Text style={styles.splitLabel}>Estimated Service Charge:</Text>
                <Text style={styles.splitValue}>₹{split.basePrice}</Text>
              </View>

              <View style={styles.splitRow}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                  <Ionicons name="shield-checkmark" size={14} color={colors.primary} />
                  <Text style={[styles.splitLabel, { color: colors.primaryDark, fontWeight: "700" }]}>
                    Nestly 10% Platform Protection:
                  </Text>
                </View>
                <Text style={[styles.splitValue, { color: colors.primaryDark, fontWeight: "800" }]}>
                  ₹{split.commissionAmount}
                </Text>
              </View>

              <View style={styles.splitDivider} />

              <View style={styles.splitRow}>
                <Text style={styles.splitTotalLabel}>Total to Pay on Service:</Text>
                <Text style={styles.splitTotalValue}>₹{split.basePrice}</Text>
              </View>

              <Text style={styles.splitNote}>
                * 10% platform protection fee is credited to platform account ({PAYMENT_CONFIG.adminUpiId}) upon service delivery.
              </Text>
            </View>

            {/* Flat / Location Input */}
            <Text style={styles.inputLabel}>Flat / Villa / House Number *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Flat 304, Tower B"
              placeholderTextColor={colors.textMuted}
              value={flatNumber}
              onChangeText={setFlatNumber}
            />

            {/* Time Slot */}
            <Text style={styles.inputLabel}>Preferred Visit Timing</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Today evening 5:00 PM"
              placeholderTextColor={colors.textMuted}
              value={timeSlot}
              onChangeText={setTimeSlot}
            />

            {/* Issue Details */}
            <Text style={styles.inputLabel}>Work Details / Notes</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Kitchen tap leaking, please bring spare washers"
              placeholderTextColor={colors.textMuted}
              value={bookingNote}
              onChangeText={setBookingNote}
            />

            {/* Confirm Button */}
            <TouchableOpacity
              style={styles.confirmBtn}
              onPress={handleConfirmBooking}
              activeOpacity={0.8}
            >
              <Ionicons name="checkmark-done" size={20} color="#fff" />
              <Text style={styles.confirmBtnText}>
                {confirmed ? "Booking Confirmed..." : "Confirm & Send Booking"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.borderLight,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  name: {
    fontWeight: "800",
    fontSize: 17,
    color: colors.text,
    letterSpacing: -0.2,
  },
  category: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: 2,
    fontWeight: "500",
  },
  priceContainer: {
    alignItems: "flex-end",
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  priceLabel: {
    fontSize: 11,
    color: colors.primaryDark,
    fontWeight: "600",
  },
  priceValue: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.primaryDark,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
    flexWrap: "wrap",
  },
  metaBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  ratingText: {
    fontSize: 13.5,
    fontWeight: "700",
    color: "#92400E",
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaText: {
    fontSize: 13.5,
    color: colors.textMuted,
  },
  actionsRow: {
    flexDirection: "row",
    gap: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  callBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.primary,
    height: 48,
    borderRadius: 12,
  },
  callBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15,
  },
  bookBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
    borderWidth: 1.5,
    borderColor: colors.border,
    height: 48,
    borderRadius: 12,
  },
  bookBtnText: {
    color: colors.text,
    fontWeight: "700",
    fontSize: 15,
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
    marginBottom: 4,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.text,
  },
  modalCategory: {
    fontSize: 14,
    color: colors.textMuted,
    marginBottom: 14,
  },
  splitBox: {
    backgroundColor: colors.primaryLight,
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
  },
  splitRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  splitLabel: {
    fontSize: 13.5,
    color: colors.text,
    fontWeight: "600",
  },
  splitValue: {
    fontSize: 14.5,
    color: colors.text,
    fontWeight: "700",
  },
  splitDivider: {
    height: 1,
    backgroundColor: "rgba(13,122,95,0.2)",
    marginVertical: 8,
  },
  splitTotalLabel: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.primaryDark,
  },
  splitTotalValue: {
    fontSize: 20,
    fontWeight: "900",
    color: colors.primaryDark,
  },
  splitNote: {
    fontSize: 11.5,
    color: colors.primaryDark,
    marginTop: 8,
    lineHeight: 16,
  },
  inputLabel: {
    fontSize: 13.5,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 6,
    marginTop: 4,
  },
  input: {
    backgroundColor: colors.background,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 46,
    fontSize: 14.5,
    color: colors.text,
    marginBottom: 10,
  },
  confirmBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.primary,
    borderRadius: 14,
    height: 52,
    marginTop: 10,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  confirmBtnText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 15.5,
  },
});
