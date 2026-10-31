import React from "react";
import { StyleSheet, Text, View } from "react-native";
import colors, { statusColors } from "../theme/colors";

export default function IssueCard({ issue }) {
  const dotColor = statusColors[issue.status] || colors.textMuted;
  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <Text style={styles.id}>{issue.id}</Text>
        <View style={[styles.statusPill, { backgroundColor: dotColor + "22" }]}>
          <View style={[styles.dot, { backgroundColor: dotColor }]} />
          <Text style={[styles.statusText, { color: dotColor }]}>{issue.status}</Text>
        </View>
      </View>
      <Text style={styles.category}>{issue.category}</Text>
      <Text style={styles.description}>{issue.description}</Text>
      <Text style={styles.meta}>
        Reported by {issue.reporter} · {issue.created_at}
      </Text>
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
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  id: { fontWeight: "700", color: colors.text },
  statusPill: { flexDirection: "row", alignItems: "center", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20, gap: 5 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 11, fontWeight: "700" },
  category: { fontSize: 13, color: colors.primaryDark, fontWeight: "600", marginBottom: 4 },
  description: { fontSize: 14, color: colors.text, marginBottom: 6, lineHeight: 19 },
  meta: { fontSize: 12, color: colors.textMuted },
});
