import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import colors, { statusColors } from "../theme/colors";

export default function IssueCard({ issue }) {
  const dotColor = statusColors[issue.status] || colors.textMuted;
  const statusIcon =
    issue.status === "Resolved"
      ? "checkmark-circle"
      : issue.status === "In Progress"
      ? "sync"
      : issue.status === "Assigned"
      ? "person"
      : "alert-circle";

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <View style={styles.categoryBadge}>
          <Text style={styles.categoryText}>{issue.category || "General Issue"}</Text>
        </View>
        <View style={[styles.statusPill, { backgroundColor: dotColor + "22", borderColor: dotColor }]}>
          <Ionicons name={statusIcon} size={14} color={dotColor} />
          <Text style={[styles.statusText, { color: dotColor }]}>{issue.status}</Text>
        </View>
      </View>

      <Text style={styles.description}>{issue.description}</Text>

      <View style={styles.footerRow}>
        <Text style={styles.id}>Ticket #{issue.id}</Text>
        <Text style={styles.meta}>
          {issue.reporter ? `By ${issue.reporter} · ` : ""}
          {issue.created_at || "Recent"}
        </Text>
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
    alignItems: "center",
    marginBottom: 10,
  },
  categoryBadge: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  categoryText: {
    fontSize: 13,
    color: colors.primaryDark,
    fontWeight: "700",
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
  },
  statusText: {
    fontSize: 13,
    fontWeight: "700",
  },
  description: {
    fontSize: 16,
    color: colors.text,
    marginBottom: 12,
    lineHeight: 23,
    letterSpacing: -0.1,
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  id: {
    fontWeight: "700",
    fontSize: 13,
    color: colors.textMuted,
  },
  meta: {
    fontSize: 13,
    color: colors.textMuted,
  },
});
