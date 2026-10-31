import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import colors from "../theme/colors";

export default function PostCard({ post, onLike }) {
  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{post.author?.[0] ?? "?"}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.author}>{post.author}</Text>
          <Text style={styles.time}>{post.time}</Text>
        </View>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{post.category}</Text>
        </View>
      </View>

      <Text style={styles.content}>{post.content}</Text>

      <View style={styles.actionsRow}>
        <TouchableOpacity style={styles.actionBtn} onPress={() => onLike?.(post.id)}>
          <Ionicons
            name={post.liked ? "heart" : "heart-outline"}
            size={18}
            color={post.liked ? colors.danger : colors.textMuted}
          />
          <Text style={styles.actionText}>{post.likes}</Text>
        </TouchableOpacity>
        <View style={styles.actionBtn}>
          <Ionicons name="chatbubble-outline" size={17} color={colors.textMuted} />
          <Text style={styles.actionText}>{post.comments}</Text>
        </View>
        <View style={styles.actionBtn}>
          <Ionicons name="bookmark-outline" size={17} color={colors.textMuted} />
        </View>
        <View style={styles.actionBtn}>
          <Ionicons name="flag-outline" size={17} color={colors.textMuted} />
        </View>
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
  headerRow: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  avatarText: { color: "#fff", fontWeight: "700" },
  author: { fontWeight: "600", color: colors.text },
  time: { fontSize: 12, color: colors.textMuted },
  badge: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: { fontSize: 11, color: colors.primaryDark, fontWeight: "600" },
  content: { fontSize: 14.5, color: colors.text, lineHeight: 20, marginBottom: 10 },
  actionsRow: { flexDirection: "row", gap: 20 },
  actionBtn: { flexDirection: "row", alignItems: "center", gap: 4 },
  actionText: { fontSize: 13, color: colors.textMuted },
});
