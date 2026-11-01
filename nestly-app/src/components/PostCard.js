import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import colors from "../theme/colors";

export default function PostCard({ post, onLike }) {
  const authorInitial = (post.author?.[0] || "?").toUpperCase();

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.headerRow}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{authorInitial}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.author}>{post.author || "Resident"}</Text>
          <Text style={styles.time}>{post.time || "Recent"}</Text>
        </View>
        {post.category && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{post.category}</Text>
          </View>
        )}
      </View>

      {/* Main Content - Large readable text for seniors */}
      <Text style={styles.content}>{post.content}</Text>

      {/* Actions */}
      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => onLike?.(post.id)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityRole="button"
          accessibilityLabel={`${post.likes || 0} likes`}
        >
          <Ionicons
            name={post.liked ? "heart" : "heart-outline"}
            size={22}
            color={post.liked ? colors.danger : colors.textMuted}
          />
          <Text style={[styles.actionText, post.liked && { color: colors.danger, fontWeight: "700" }]}>
            {post.likes || 0}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityRole="button"
          accessibilityLabel={`${post.comments || 0} comments`}
        >
          <Ionicons name="chatbubble-outline" size={20} color={colors.textMuted} />
          <Text style={styles.actionText}>{post.comments || 0}</Text>
        </TouchableOpacity>

        <View style={{ flex: 1 }} />

        <TouchableOpacity
          style={styles.actionBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityRole="button"
          accessibilityLabel="Save post"
        >
          <Ionicons name="bookmark-outline" size={20} color={colors.textMuted} />
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
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  avatarText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 18,
  },
  author: {
    fontWeight: "700",
    fontSize: 16,
    color: colors.text,
    letterSpacing: -0.2,
  },
  time: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
  },
  badge: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    alignSelf: "flex-start",
  },
  badgeText: {
    fontSize: 12.5,
    color: colors.primaryDark,
    fontWeight: "700",
  },
  content: {
    fontSize: 16,
    color: colors.text,
    lineHeight: 24,
    marginBottom: 14,
    letterSpacing: -0.1,
  },
  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 24,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 4,
  },
  actionText: {
    fontSize: 14.5,
    fontWeight: "600",
    color: colors.textMuted,
  },
});
