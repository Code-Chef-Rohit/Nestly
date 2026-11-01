import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import colors, { statusColors, shadows, radii } from "../theme/colors";

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
          <Ionicons name="construct-outline" size={14} color={colors.primaryDark} />
          <Text style={styles.categoryText}>{issue.category || "General Issue"}</Text>
        </View>
        <View style={[styles.statusPill, { backgroundColor: dotColor + "18", borderColor: dotColor + "40" }]}>
          <Ionicons name={statusIcon} size={14} color={dotColor} />
          <Text style={[styles.statusText, { color: dotColor }]}>{issue.status}</Text>
        </View>
      </View>

      <Text style={styles.description}>{issue.description}</Text>

      <View style={styles.footerRow}>
        <View style={styles.ticketPill}>
          <Text style={styles.id}>Ticket #{issue.id}</Text>
        </View>
        <Text style={styles.meta}>
          {issue.reporter ? `By ${issue.reporter} · ` : ""}
          {issue.created_at ? new Date(issue.created_at).toLocaleDateString() : "Recent"}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.card,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  categoryBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: "rgba(13,122,95,0.15)",
  },
  categoryText: {
    fontSize: 12.5,
    color: colors.primaryDark,
    fontWeight: "800",
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: radii.pill,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 12.5,
    fontWeight: "800",
  },
  description: {
    fontSize: 15.5,
    color: colors.textSecondary,
    lineHeight: 23,
    marginBottom: 14,
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  ticketPill: {
    backgroundColor: colors.surfaceSubtle,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radii.xs,
  },
  id: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.textMuted,
  },
  meta: {
    fontSize: 12.5,
    color: colors.textMuted,
  },
});
