import React, { useEffect, useState } from "react";
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import colors from "../theme/colors";
import { useAuth } from "../context/AuthContext";
import QuickActionButton from "../components/QuickActionButton";
import { supabase, isSupabaseConfigured } from "../config/supabase";
import { shareCommunityInvite } from "../utils/shareInvite";

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export default function HomeScreen({ navigation }) {
  const { user, community } = useAuth();
  const [stats, setStats] = useState({ postsCount: 0, issuesCount: 0, announcementsCount: 0 });
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchDashboardStats();
  }, [community?.id]);

  async function fetchDashboardStats() {
    if (!community?.id || !isSupabaseConfigured) return;
    try {
      const [pRes, iRes, aRes] = await Promise.all([
        supabase.from("posts").select("id", { count: "exact" }).eq("community_id", community.id),
        supabase.from("issues").select("id", { count: "exact" }).eq("community_id", community.id),
        supabase.from("announcements").select("id", { count: "exact" }).eq("community_id", community.id),
      ]);
      setStats({
        postsCount: pRes.count || 0,
        issuesCount: iRes.count || 0,
        announcementsCount: aRes.count || 0,
      });
    } catch (err) {
      console.warn("Notice loading stats:", err.message);
    } finally {
      setRefreshing(false);
    }
  }

  const actions = [
    { icon: "create-outline", label: "Post", onPress: () => navigation.navigate("CreatePost") },
    { icon: "alert-circle-outline", label: "Report", onPress: () => navigation.navigate("ReportIssue") },
    { icon: "construct-outline", label: "Services", onPress: () => navigation.navigate("Services") },
    { icon: "share-social-outline", label: "Invite", onPress: () => shareCommunityInvite(community, user?.name) },
    { icon: "pricetags-outline", label: "Marketplace", onPress: () => {} },
    { icon: "calendar-outline", label: "Events", onPress: () => {} },
    { icon: "alert-outline", label: "Emergency", onPress: () => {} },
    { icon: "megaphone-outline", label: "Notices", onPress: () => {} },
  ];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ padding: 20, paddingTop: 55, paddingBottom: 40 }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            fetchDashboardStats();
          }}
        />
      }
    >
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.greeting}>
            {greeting()}, {user?.name || "neighbour"} 👋
          </Text>
          <View style={styles.locationRow}>
            <Ionicons name="location-sharp" size={13} color={colors.primary} />
            <Text style={styles.locationText}>{community?.name || "No community joined"}</Text>
          </View>
        </View>

        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          {community && (
            <TouchableOpacity
              style={styles.shareIconBtn}
              onPress={() => shareCommunityInvite(community, user?.name)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="share-social-outline" size={20} color={colors.primary} />
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={() => navigation.navigate("Profile")}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{(user?.name || "U")[0].toUpperCase()}</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* Share / Invite Banner Card */}
      {community && (
        <View style={styles.inviteCard}>
          <View style={{ flex: 1 }}>
            <Text style={styles.inviteTitle}>Invite Neighbours</Text>
            <Text style={styles.inviteSubtitle}>
              Share a link with residents of {community.name} to grow your community.
            </Text>
          </View>
          <TouchableOpacity
            style={styles.inviteBtn}
            onPress={() => shareCommunityInvite(community, user?.name)}
          >
            <Ionicons name="share-outline" size={16} color="#fff" />
            <Text style={styles.inviteBtnText}>Share Link</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>What's happening in your area?</Text>
        <SummaryRow
          icon="ellipse"
          color={colors.success}
          text={`${stats.postsCount} community posts active`}
        />
        <SummaryRow
          icon="construct"
          color={colors.warning}
          text={`${stats.issuesCount} open reports tracked`}
        />
        <SummaryRow
          icon="megaphone"
          color={colors.info}
          text={`${stats.announcementsCount} official announcements`}
        />
        <SummaryRow
          icon="shield-checkmark"
          color={colors.primary}
          text={`Community: ${community?.address || community?.name || "Active"}`}
        />
      </View>

      <Text style={styles.sectionTitle}>Quick actions</Text>
      <View style={styles.actionsGrid}>
        {actions.map((a) => (
          <QuickActionButton key={a.label} icon={a.icon} label={a.label} onPress={a.onPress} />
        ))}
      </View>
    </ScrollView>
  );
}

function SummaryRow({ icon, color, text }) {
  return (
    <View style={styles.summaryRow}>
      <Ionicons name={icon} size={11} color={color} />
      <Text style={styles.summaryText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 },
  greeting: { fontSize: 20, fontWeight: "800", color: colors.text },
  locationRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 },
  locationText: { fontSize: 13, color: colors.textMuted },
  shareIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  inviteCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    gap: 12,
  },
  inviteTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.primary,
  },
  inviteSubtitle: {
    fontSize: 12.5,
    color: colors.text,
    marginTop: 2,
    lineHeight: 17,
  },
  inviteBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
  },
  inviteBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 13,
  },
  summaryCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 24,
  },
  summaryTitle: { fontWeight: "700", color: colors.text, marginBottom: 12, fontSize: 14.5 },
  summaryRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  summaryText: { fontSize: 13.5, color: colors.text },
  sectionTitle: { fontWeight: "700", fontSize: 15, color: colors.text, marginBottom: 10 },
  actionsGrid: { flexDirection: "row", flexWrap: "wrap" },
});
