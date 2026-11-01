import React from "react";
import { Alert, Linking, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import colors from "../theme/colors";

export default function ServiceCard({ service }) {
  const phoneNumber = service.phone || service.location || "9876543210";
  const price = service.starting_price || service.startingPrice;

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

  const handleBook = () => {
    const numericPrice = Number(price) || 299;
    const commission = Math.round(numericPrice * 0.10); // 10% platform fee

    Alert.alert(
      `Book ${service.name}`,
      `Service: ${service.category}\n` +
      `Base Charge: ₹${numericPrice}\n` +
      `Nestly 10% Platform Protection: ₹${commission}\n\n` +
      `Confirm your booking request? The verified provider will call you immediately.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm Booking",
          onPress: () =>
            Alert.alert(
              "Booking Confirmed! 🛠️",
              `${service.name} has been notified and will call you on your registered number.`
            ),
        },
      ]
    );
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

        {price && (
          <View style={styles.priceContainer}>
            <Text style={styles.priceLabel}>Starting from</Text>
            <Text style={styles.priceValue}>₹{price}</Text>
          </View>
        )}
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
            Verified Partner (10% Guarantee)
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
          onPress={handleBook}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={`Book ${service.name}`}
        >
          <Text style={styles.bookBtnText}>Book Visit</Text>
        </TouchableOpacity>
      </View>
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
});
