import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import colors, { shadows, radii } from "../theme/colors";

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
          <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
            <Text style={styles.author}>{post.author || "Resident"}</Text>
            <Ionicons name="checkmark-circle" size={15} color={colors.primary} />
          </View>
          <Text style={styles.time}>{post.time || "Recent update"}</Text>
        </View>
        {post.category && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{post.category}</Text>
          </View>
        )}
      </View>

      {/* Main Content - High legibility for seniors */}
      <Text style={styles.content}>{post.content}</Text>

      {/* Actions */}
      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={[styles.actionBtn, post.liked && styles.actionBtnActive]}
          onPress={() => onLike?.(post.id)}
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityRole="button"
          accessibilityLabel={`${post.likes || 0} likes`}
        >
          <Ionicons
            name={post.liked ? "heart" : "heart-outline"}
            size={20}
            color={post.liked ? colors.danger : colors.textMuted}
          />
          <Text style={[styles.actionText, post.liked && styles.actionTextActive]}>
            {post.likes || 0} {post.likes === 1 ? "Like" : "Likes"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionBtn}
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityRole="button"
          accessibilityLabel={`${post.comments || 0} comments`}
        >
          <Ionicons name="chatbubble-ellipses-outline" size={19} color={colors.textMuted} />
          <Text style={styles.actionText}>
            {post.comments || 0} {post.comments === 1 ? "Reply" : "Replies"}
          </Text>
        </TouchableOpacity>

        <View style={{ flex: 1 }} />

        <TouchableOpacity
          style={styles.actionBtn}
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityRole="button"
          accessibilityLabel="Share or save post"
        >
          <Ionicons name="share-outline" size={19} color={colors.textMuted} />
        </TouchableOpacity>
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
    borderWidth: 2,
    borderColor: colors.primaryLight,
  },
  avatarText: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 18,
  },
  author: {
    fontWeight: "800",
    fontSize: 16,
    color: colors.text,
    letterSpacing: -0.2,
  },
  time: {
    fontSize: 12.5,
    color: colors.textMuted,
    marginTop: 2,
  },
  badge: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: radii.pill,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "rgba(13,122,95,0.15)",
  },
  badgeText: {
    fontSize: 12,
    color: colors.primaryDark,
    fontWeight: "800",
  },
  content: {
    fontSize: 16,
    color: colors.textSecondary,
    lineHeight: 24,
    marginBottom: 14,
    letterSpacing: -0.1,
  },
  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceSubtle,
  },
  actionBtnActive: {
    backgroundColor: colors.dangerLight,
  },
  actionText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.textMuted,
  },
  actionTextActive: {
    color: colors.danger,
  },
});
