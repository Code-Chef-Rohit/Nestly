import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import colors from "../theme/colors";

export default function ServiceCard({ service }) {
  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <Text style={styles.name}>{service.name}</Text>
        {service.verified && (
          <Ionicons name="checkmark-circle" size={16} color={colors.success} />
        )}
      </View>
      <Text style={styles.category}>{service.category}</Text>

      <View style={styles.metaRow}>
        <View style={styles.metaItem}>
          <Ionicons name="star" size={14} color={colors.warning} />
          <Text style={styles.metaText}>{service.rating}</Text>
        </View>
        <View style={styles.metaItem}>
          <Ionicons name="location-outline" size={14} color={colors.textMuted} />
          <Text style={styles.metaText}>{service.distanceKm} km away</Text>
        </View>
      </View>

      <Text style={styles.price}>₹{service.startingPrice} starting</Text>

      <View style={styles.actionsRow}>
        <TouchableOpacity style={[styles.btn, styles.callBtn]}>
          <Ionicons name="call-outline" size={15} color={colors.primary} />
          <Text style={styles.callText}>Call</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.btn, styles.chatBtn]}>
          <Ionicons name="chatbubble-outline" size={15} color={colors.textMuted} />
          <Text style={styles.chatText}>Chat</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.btn, styles.requestBtn]}>
          <Text style={styles.requestText}>Request</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  row: { flexDirection: "row", alignItems: "center", gap: 6 },
  name: { fontWeight: "700", fontSize: 15, color: colors.text },
  category: { fontSize: 12, color: colors.textMuted, marginTop: 2, marginBottom: 8 },
  metaRow: { flexDirection: "row", gap: 16, marginBottom: 8 },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText: { fontSize: 12.5, color: colors.text },
  price: { fontSize: 13, fontWeight: "600", color: colors.primaryDark, marginBottom: 10 },
  actionsRow: { flexDirection: "row", gap: 8 },
  btn: { flexDirection: "row", alignItems: "center", gap: 5, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10 },
  callBtn: { backgroundColor: colors.primaryLight },
  callText: { color: colors.primary, fontWeight: "600", fontSize: 13 },
  chatBtn: { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border },
  chatText: { color: colors.textMuted, fontWeight: "600", fontSize: 13 },
  requestBtn: { backgroundColor: colors.primary, flex: 1, alignItems: "center" },
  requestText: { color: "#fff", fontWeight: "700", fontSize: 13 },
});
