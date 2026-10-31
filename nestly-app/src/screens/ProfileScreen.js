import React from "react";
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import colors from "../theme/colors";
import { useAuth } from "../context/AuthContext";
import { isSupabaseConfigured } from "../config/supabase";

const MENU_ITEMS = [
  { icon: "person-outline", label: "Edit Profile" },
  { icon: "home-outline", label: "My Community" },
  { icon: "notifications-outline", label: "Notification Settings" },
  { icon: "shield-checkmark-outline", label: "Privacy & Safety" },
  { icon: "help-circle-outline", label: "Help & Support" },
];

export default function ProfileScreen() {
  const { user, community, signOut } = useAuth();

  function handleSignOut() {
    Alert.alert("Log out", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Log out", style: "destructive", onPress: signOut },
    ]);
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 20, paddingTop: 60, paddingBottom: 60 }}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{(user?.name ?? "U")[0]}</Text>
        </View>
        <Text style={styles.name}>{user?.name ?? "Neighbour"}</Text>
        <Text style={styles.email}>{user?.email}</Text>
        <View style={styles.communityBadge}>
          <Ionicons name="location-sharp" size={12} color={colors.primary} />
          <Text style={styles.communityText}>{community?.name ?? "No community joined"}</Text>
        </View>
      </View>

      <View style={styles.menu}>
        {MENU_ITEMS.map((item) => (
          <TouchableOpacity key={item.label} style={styles.menuItem}>
            <Ionicons name={item.icon} size={19} color={colors.text} />
            <Text style={styles.menuLabel}>{item.label}</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.statusCard}>
        <Ionicons
          name={isSupabaseConfigured ? "cloud-done-outline" : "cloud-offline-outline"}
          size={16}
          color={isSupabaseConfigured ? colors.success : colors.textMuted}
        />
        <Text style={styles.statusText}>
          {isSupabaseConfigured
            ? "Connected to Supabase backend"
            : "Running on local demo data — connect Supabase in .env"}
        </Text>
      </View>

      <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
        <Ionicons name="log-out-outline" size={18} color={colors.danger} />
        <Text style={styles.signOutText}>Log Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { alignItems: "center", marginBottom: 26 },
  avatar: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  avatarText: { color: "#fff", fontWeight: "700", fontSize: 28 },
  name: { fontSize: 19, fontWeight: "800", color: colors.text },
  email: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  communityBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 10,
  },
  communityText: { fontSize: 12.5, color: colors.primaryDark, fontWeight: "600" },
  menu: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
    marginBottom: 20,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  menuLabel: { flex: 1, fontSize: 14.5, color: colors.text },
  statusCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    marginBottom: 20,
  },
  statusText: { fontSize: 12, color: colors.textMuted, flex: 1 },
  signOutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: 12,
    paddingVertical: 13,
  },
  signOutText: { color: colors.danger, fontWeight: "700", fontSize: 14.5 },
});
