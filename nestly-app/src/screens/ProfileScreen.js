import React from "react";
import { Alert, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import colors, { shadows, radii } from "../theme/colors";
import { useAuth } from "../context/AuthContext";
import { isSupabaseConfigured } from "../config/supabase";

export default function ProfileScreen({ navigation }) {
  const { user, community, signOut } = useAuth();

  function handleSignOut() {
    Alert.alert("Log Out", "Are you sure you want to log out of Nestly?", [
      { text: "Cancel", style: "cancel" },
      { text: "Log Out", style: "destructive", onPress: signOut },
    ]);
  }

  const menuItems = [
    {
      icon: "business-outline",
      label: "Switch / Change Community",
      sub: "Move to a different apartment or locality",
      onPress: () => navigation.navigate("LocationSelection"),
    },
    {
      icon: "call-outline",
      label: "Emergency & Helplines",
      sub: "Ambulance, Police, Senior Citizen Desk",
      onPress: () => navigation.navigate("Home"),
    },
    {
      icon: "notifications-outline",
      label: "Notifications & Alerts",
      sub: "Maintenance and urgent community notices",
      onPress: () => Alert.alert("Notifications", "You will receive real-time updates for your neighbourhood."),
    },
    {
      icon: "shield-checkmark-outline",
      label: "Privacy & Resident Safety",
      sub: "Only verified neighbours see your area updates",
      onPress: () => Alert.alert("Safety Verified", "Nestly keeps your phone number and private details secure."),
    },
    {
      icon: "help-circle-outline",
      label: "Help & Senior Support",
      sub: "Contact community support and get assistance",
      onPress: () => Alert.alert("Support Desk", "Need help? Call our resident helpdesk or message your society admin."),
    },
  ];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.contentWrap}>
        {/* Profile Card Header */}
        <View style={styles.header}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {(user?.name || "U")[0].toUpperCase()}
            </Text>
          </View>
          <Text style={styles.name}>{user?.name || "Neighbour"}</Text>
          <Text style={styles.email}>{user?.email || "Resident Account"}</Text>

          <TouchableOpacity
            style={styles.communityBadge}
            onPress={() => navigation.navigate("LocationSelection")}
            activeOpacity={0.7}
          >
            <Ionicons name="location-sharp" size={15} color={colors.primary} />
            <Text style={styles.communityText}>
              {community?.name || "No community joined"}
            </Text>
            <Ionicons name="pencil" size={12} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Menu Items */}
        <View style={styles.menu}>
          {menuItems.map((item, idx) => (
            <TouchableOpacity
              key={item.label}
              style={[
                styles.menuItem,
                idx === menuItems.length - 1 && { borderBottomWidth: 0 },
              ]}
              onPress={item.onPress}
              activeOpacity={0.7}
            >
              <View style={styles.menuIconCircle}>
                <Ionicons name={item.icon} size={22} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.menuLabel}>{item.label}</Text>
                {item.sub ? <Text style={styles.menuSub}>{item.sub}</Text> : null}
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Backend & Security Status */}
        <View style={styles.statusCard}>
          <Ionicons
            name={isSupabaseConfigured ? "cloud-done" : "cloud-offline"}
            size={20}
            color={isSupabaseConfigured ? colors.success : colors.warning}
          />
          <Text style={styles.statusText}>
            {isSupabaseConfigured
              ? "Live Supabase Cloud Connected"
              : "Running in offline mode"}
          </Text>
        </View>

        {/* Brand Badge */}
        <View style={styles.brandFooter}>
          <Image
            source={require("../../assets/logo.png")}
            style={styles.brandLogo}
            resizeMode="contain"
          />
          <Text style={styles.brandTitle}>Nestly</Text>
          <Text style={styles.brandSubtitle}>Neighbourhood Care & Verified Community Services • v1.0.0</Text>
        </View>

        {/* Sign Out Button */}
        <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut} activeOpacity={0.8}>
          <Ionicons name="log-out-outline" size={20} color={colors.danger} />
          <Text style={styles.signOutText}>Log Out from Nestly</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: 20,
    paddingTop: 54,
    paddingBottom: 40,
  },
  contentWrap: {
    width: "100%",
    maxWidth: 500,
    alignSelf: "center",
  },
  header: {
    alignItems: "center",
    marginBottom: 24,
    backgroundColor: colors.surface,
    padding: 24,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.card,
  },
  avatar: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
    borderWidth: 3,
    borderColor: colors.primaryLight,
    ...shadows.button,
  },
  avatarText: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 34,
  },
  name: {
    fontSize: 22,
    fontWeight: "900",
    color: colors.text,
    letterSpacing: -0.3,
  },
  email: {
    fontSize: 14.5,
    color: colors.textMuted,
    marginTop: 4,
    fontWeight: "500",
  },
  communityBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: radii.pill,
    marginTop: 14,
    borderWidth: 1,
    borderColor: "rgba(13,122,95,0.2)",
    ...shadows.sm,
  },
  communityText: {
    fontSize: 13.5,
    color: colors.primaryDark,
    fontWeight: "800",
  },
  menu: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.borderLight,
    overflow: "hidden",
    marginBottom: 20,
    ...shadows.card,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  menuIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  menuLabel: {
    fontSize: 15.5,
    fontWeight: "800",
    color: colors.text,
  },
  menuSub: {
    fontSize: 12.5,
    color: colors.textMuted,
    marginTop: 2,
    lineHeight: 17,
  },
  statusCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: 16,
    marginBottom: 20,
    ...shadows.sm,
  },
  statusText: {
    fontSize: 14,
    color: colors.text,
    fontWeight: "700",
    flex: 1,
  },
  brandFooter: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.card,
  },
  brandLogo: {
    width: 52,
    height: 52,
    borderRadius: radii.md,
    marginBottom: 8,
    ...shadows.sm,
  },
  brandTitle: {
    fontSize: 16.5,
    fontWeight: "900",
    color: colors.primary,
    letterSpacing: 0.4,
  },
  brandSubtitle: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: "center",
    marginTop: 4,
    fontWeight: "500",
  },
  signOutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1.5,
    borderColor: "#FECACA",
    borderRadius: radii.pill,
    height: 54,
    backgroundColor: colors.dangerLight,
    ...shadows.sm,
  },
  signOutText: {
    color: colors.danger,
    fontWeight: "900",
    fontSize: 16,
  },
  signOutText: {
    color: colors.danger,
    fontWeight: "800",
    fontSize: 16,
  },
});
