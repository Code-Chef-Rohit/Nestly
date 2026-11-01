import React, { useEffect, useState } from "react";
import {
  Alert,
  Image,
  Linking,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import colors, { shadows, radii } from "../theme/colors";
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
  const [stats, setStats] = useState({ postsCount: 0, issuesCount: 0, announcementsCount: 0, servicesCount: 0 });
  const [refreshing, setRefreshing] = useState(false);
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);

  useEffect(() => {
    fetchDashboardStats();
  }, [community?.id]);

  async function fetchDashboardStats() {
    if (!community?.id || !isSupabaseConfigured) return;
    try {
      const [pRes, iRes, aRes, sRes] = await Promise.all([
        supabase.from("posts").select("id", { count: "exact" }).eq("community_id", community.id),
        supabase.from("issues").select("id", { count: "exact" }).eq("community_id", community.id),
        supabase.from("announcements").select("id", { count: "exact" }).eq("community_id", community.id),
        supabase.from("services").select("id", { count: "exact" }).or(`community_id.eq.${community.id},community_id.is.null`),
      ]);
      setStats({
        postsCount: pRes.count || 0,
        issuesCount: iRes.count || 0,
        announcementsCount: aRes.count || 0,
        servicesCount: sRes.count || 0,
      });
    } catch (err) {
      console.warn("Notice loading stats:", err.message);
    } finally {
      setRefreshing(false);
    }
  }

  const callNumber = (num, label) => {
    const url = `tel:${num}`;
    Linking.canOpenURL(url)
      .then((supported) => {
        if (supported) {
          Linking.openURL(url);
        } else {
          Alert.alert("Emergency Contact", `Call ${label} at: ${num}`);
        }
      })
      .catch(() => {
        Alert.alert("Emergency Contact", `Call ${label} at: ${num}`);
      });
  };

  const emergencyContacts = [
    { label: "Ambulance / Medical", number: "108", icon: "medical", color: "#DC2626" },
    { label: "Senior Citizen Helpline", number: "14567", icon: "heart", color: "#EA580C" },
    { label: "Police Emergency", number: "112", icon: "shield", color: "#2563EB" },
    { label: "Fire Station", number: "101", icon: "flame", color: "#D97706" },
    { label: "Gate Security Desk", number: "9876543210", icon: "key", color: "#0D7A5F" },
  ];

  const actions = [
    {
      icon: "create-outline",
      label: "New Post",
      onPress: () => navigation.navigate("CreatePost"),
    },
    {
      icon: "alert-circle-outline",
      label: "Report Issue",
      onPress: () => navigation.navigate("ReportIssue"),
      color: colors.warning,
      bgColor: colors.warningLight,
    },
    {
      icon: "construct-outline",
      label: "Services",
      onPress: () => navigation.navigate("Services"),
    },
    {
      icon: "call-outline",
      label: "SOS / Help",
      onPress: () => setShowEmergencyModal(true),
      color: colors.danger,
      bgColor: colors.dangerLight,
    },
    {
      icon: "share-social-outline",
      label: "Invite",
      onPress: () => shareCommunityInvite(community, user?.name),
    },
    {
      icon: "people-outline",
      label: "Community",
      onPress: () => navigation.navigate("Feed"),
    },
    {
      icon: "business-outline",
      label: "Switch Area",
      onPress: () => navigation.navigate("LocationSelection"),
    },
    {
      icon: "person-outline",
      label: "My Profile",
      onPress: () => navigation.navigate("Profile"),
    },
  ];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            fetchDashboardStats();
          }}
          colors={[colors.primary]}
        />
      }
    >
      <View style={styles.contentWrap}>
        {/* Header Row with Brand Logo */}
        <View style={styles.headerRow}>
          <View style={styles.brandContainer}>
            <Image
              source={require("../../assets/logo.png")}
              style={styles.headerLogo}
              resizeMode="cover"
            />
            <View style={{ flex: 1 }}>
              <Text style={styles.greeting} numberOfLines={1}>
                {greeting()}, {user?.name?.split(" ")[0] || "Neighbour"} 👋
              </Text>
              <TouchableOpacity
                style={styles.locationChip}
                onPress={() => navigation.navigate("LocationSelection")}
                activeOpacity={0.7}
              >
                <Ionicons name="location-sharp" size={15} color={colors.primary} />
                <Text style={styles.locationText} numberOfLines={1}>
                  {community?.name || "Select Community"}
                </Text>
                <Ionicons name="chevron-forward" size={13} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.headerRight}>
            <TouchableOpacity
              style={styles.sosQuickBtn}
              onPress={() => setShowEmergencyModal(true)}
              accessibilityRole="button"
              accessibilityLabel="Emergency SOS"
            >
              <Ionicons name="call" size={18} color="#fff" />
              <Text style={styles.sosQuickText}>SOS</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => navigation.navigate("Profile")}
              accessibilityRole="button"
              accessibilityLabel="Profile"
            >
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {(user?.name || "U")[0].toUpperCase()}
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Big Senior-Friendly Emergency Quick Bar */}
        <TouchableOpacity
          style={styles.emergencyCard}
          onPress={() => setShowEmergencyModal(true)}
          activeOpacity={0.85}
        >
          <View style={styles.emergencyIconWrap}>
            <Ionicons name="shield-checkmark" size={28} color={colors.danger} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.emergencyTitle}>Emergency & Quick Helplines</Text>
            <Text style={styles.emergencySubtitle}>
              One-touch call for Ambulance, Security & Senior Helpline
            </Text>
          </View>
          <View style={styles.emergencyCallPill}>
            <Text style={styles.emergencyCallPillText}>Call Help</Text>
            <Ionicons name="chevron-forward" size={16} color="#fff" />
          </View>
        </TouchableOpacity>

        {/* Invite Neighbours Banner */}
        {community && (
          <View style={styles.inviteCard}>
            <View style={{ flex: 1 }}>
              <Text style={styles.inviteTitle}>Invite Your Neighbours</Text>
              <Text style={styles.inviteSubtitle}>
                Tap to share a direct invite link with residents of {community.name}.
              </Text>
            </View>
            <TouchableOpacity
              style={styles.inviteBtn}
              onPress={() => shareCommunityInvite(community, user?.name)}
              activeOpacity={0.8}
            >
              <Ionicons name="share-social-outline" size={18} color="#fff" />
              <Text style={styles.inviteBtnText}>Share</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Live Community Activity Summary Cards */}
        <Text style={styles.sectionTitle}>What's happening in your area?</Text>
        <View style={styles.statsRow}>
          <TouchableOpacity
            style={styles.statCard}
            onPress={() => navigation.navigate("Feed")}
            activeOpacity={0.7}
          >
            <View style={[styles.statIconWrap, { backgroundColor: colors.primaryLight }]}>
              <Ionicons name="chatbubbles" size={22} color={colors.primary} />
            </View>
            <Text style={styles.statCount}>{stats.postsCount}</Text>
            <Text style={styles.statLabel}>Active Posts</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.statCard}
            onPress={() => navigation.navigate("ReportIssue")}
            activeOpacity={0.7}
          >
            <View style={[styles.statIconWrap, { backgroundColor: colors.warningLight }]}>
              <Ionicons name="construct" size={22} color={colors.warning} />
            </View>
            <Text style={styles.statCount}>{stats.issuesCount}</Text>
            <Text style={styles.statLabel}>Open Reports</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.statCard}
            onPress={() => navigation.navigate("Services")}
            activeOpacity={0.7}
          >
            <View style={[styles.statIconWrap, { backgroundColor: colors.infoLight }]}>
              <Ionicons name="briefcase" size={22} color={colors.info} />
            </View>
            <Text style={styles.statCount}>{stats.servicesCount}</Text>
            <Text style={styles.statLabel}>Local Services</Text>
          </TouchableOpacity>
        </View>

        {/* Quick Actions Grid */}
        <Text style={[styles.sectionTitle, { marginTop: 8 }]}>Quick Actions</Text>
        <View style={styles.actionsGrid}>
          {actions.map((a) => (
            <QuickActionButton
              key={a.label}
              icon={a.icon}
              label={a.label}
              onPress={a.onPress}
              color={a.color}
              bgColor={a.bgColor}
            />
          ))}
        </View>
      </View>

      {/* Emergency Helpline Bottom Sheet / Modal */}
      <Modal
        visible={showEmergencyModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowEmergencyModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Ionicons name="call" size={24} color={colors.danger} />
                <Text style={styles.modalTitle}>Emergency Helplines</Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowEmergencyModal(false)}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Ionicons name="close-circle" size={28} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>
              Tap any number below for immediate assistance:
            </Text>

            {emergencyContacts.map((c) => (
              <TouchableOpacity
                key={c.number}
                style={styles.emergencyContactRow}
                onPress={() => callNumber(c.number, c.label)}
                activeOpacity={0.7}
              >
                <View style={[styles.contactIconCircle, { backgroundColor: c.color + "18" }]}>
                  <Ionicons name={c.icon} size={22} color={c.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.contactLabel}>{c.label}</Text>
                  <Text style={styles.contactNumber}>{c.number}</Text>
                </View>
                <View style={[styles.contactCallBtn, { backgroundColor: c.color }]}>
                  <Ionicons name="call" size={16} color="#fff" />
                  <Text style={styles.contactCallBtnText}>Call</Text>
                </View>
              </TouchableOpacity>
            ))}

            <TouchableOpacity
              style={styles.closeModalBtn}
              onPress={() => setShowEmergencyModal(false)}
            >
              <Text style={styles.closeModalBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
    maxWidth: 540,
    alignSelf: "center",
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    gap: 12,
  },
  brandContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  headerLogo: {
    width: 50,
    height: 50,
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: "rgba(13,122,95,0.2)",
    ...shadows.sm,
  },
  greeting: {
    fontSize: 22,
    fontWeight: "900",
    color: colors.text,
    letterSpacing: -0.4,
  },
  locationChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 6,
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.borderLight,
    alignSelf: "flex-start",
    ...shadows.sm,
  },
  locationText: {
    fontSize: 13.5,
    fontWeight: "800",
    color: colors.primaryDark,
    maxWidth: 180,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  sosQuickBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: colors.danger,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: radii.pill,
    ...shadows.emergency,
  },
  sosQuickText: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 13.5,
    letterSpacing: 0.5,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: colors.primaryLight,
    ...shadows.sm,
  },
  avatarText: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 19,
  },
  emergencyCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF2F2",
    borderWidth: 1.5,
    borderColor: "#FECACA",
    borderRadius: radii.xl,
    padding: 16,
    marginBottom: 18,
    gap: 14,
    ...shadows.emergency,
  },
  emergencyIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#FCA5A5",
  },
  emergencyTitle: {
    fontSize: 16.5,
    fontWeight: "900",
    color: colors.danger,
  },
  emergencySubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 3,
    lineHeight: 18,
  },
  emergencyCallPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.danger,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: radii.md,
  },
  emergencyCallPillText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 13.5,
  },
  inviteCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.primaryLight,
    borderWidth: 1.5,
    borderColor: "rgba(13,122,95,0.3)",
    borderRadius: radii.xl,
    padding: 18,
    marginBottom: 22,
    gap: 14,
    ...shadows.card,
  },
  inviteTitle: {
    fontSize: 16.5,
    fontWeight: "900",
    color: colors.primaryDark,
  },
  inviteSubtitle: {
    fontSize: 13.5,
    color: colors.textSecondary,
    marginTop: 3,
    lineHeight: 19,
  },
  inviteBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: radii.md,
    ...shadows.button,
  },
  inviteBtnText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 14,
  },
  sectionTitle: {
    fontWeight: "900",
    fontSize: 18.5,
    color: colors.text,
    marginBottom: 14,
    letterSpacing: -0.3,
  },
  statsRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.card,
  },
  statIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  statCount: {
    fontSize: 22,
    fontWeight: "900",
    color: colors.text,
  },
  statLabel: {
    fontSize: 12.5,
    fontWeight: "700",
    color: colors.textMuted,
    marginTop: 3,
  },
  actionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    backgroundColor: colors.surface,
    padding: 18,
    paddingTop: 22,
    paddingBottom: 6,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.card,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.65)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingBottom: 38,
    maxWidth: 540,
    width: "100%",
    alignSelf: "center",
    ...shadows.cardHover,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.danger,
  },
  modalSubtitle: {
    fontSize: 14.5,
    color: colors.textMuted,
    marginBottom: 18,
  },
  emergencyContactRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.background,
    padding: 14,
    borderRadius: 14,
    marginBottom: 10,
    gap: 12,
  },
  contactIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  contactLabel: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.text,
  },
  contactNumber: {
    fontSize: 13.5,
    color: colors.textMuted,
    marginTop: 2,
  },
  contactCallBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  contactCallBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 13.5,
  },
  closeModalBtn: {
    marginTop: 12,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
  },
  closeModalBtnText: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
  },
});
