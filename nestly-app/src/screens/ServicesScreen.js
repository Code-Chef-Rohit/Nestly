import React, { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import colors from "../theme/colors";
import ServiceCard from "../components/ServiceCard";
import IssueCard from "../components/IssueCard";
import { SERVICE_CATEGORIES } from "../constants/categories";
import { supabase, isSupabaseConfigured } from "../config/supabase";
import { useAuth } from "../context/AuthContext";

export default function ServicesScreen({ navigation }) {
  const { community, user } = useAuth();
  const [tab, setTab] = useState("services"); // 'services' | 'issues'
  const [category, setCategory] = useState("All");

  // Purely Real Supabase Query — no mock or placeholder data
  const {
    data: services = [],
    isLoading: servicesLoading,
    isRefetching: servicesRefetching,
    refetch: refetchServices,
  } = useQuery({
    queryKey: ["community_services", community?.id],
    queryFn: async () => {
      if (!isSupabaseConfigured) return [];
      let query = supabase.from("services").select("*").order("created_at", { ascending: false });
      if (community?.id) {
        query = query.or(`community_id.eq.${community.id},community_id.is.null`);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    staleTime: 1000 * 60 * 3,
  });

  // Cached Issues Query
  const {
    data: issues = [],
    isLoading: issuesLoading,
    isRefetching: issuesRefetching,
    refetch: refetchIssues,
  } = useQuery({
    queryKey: ["user_issues", user?.id],
    queryFn: async () => {
      if (!isSupabaseConfigured) return [];
      let req = supabase.from("issues").select("*").order("created_at", { ascending: false });
      if (user?.id) req = req.eq("user_id", user.id);
      const { data, error } = await req;
      if (error) throw error;
      return data || [];
    },
    enabled: Boolean(user?.id),
    staleTime: 1000 * 60 * 3,
  });

  const filteredServices =
    category === "All"
      ? services
      : services.filter((s) => s.category?.toLowerCase().includes(category.toLowerCase()));

  const isCurrentLoading = tab === "services" ? servicesLoading : issuesLoading;
  const isCurrentRefetching = tab === "services" ? servicesRefetching : issuesRefetching;
  const handleRefresh = tab === "services" ? refetchServices : refetchIssues;

  return (
    <View style={styles.container}>
      <View style={styles.contentWrap}>
        {/* Header Row */}
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Services & Civic Help</Text>
            <Text style={styles.subtitle} numberOfLines={1}>
              Verified local pros for {community?.name || "your area"}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.addServiceBtn}
            onPress={() => navigation.navigate("AddService")}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="List Your Service"
          >
            <Ionicons name="add" size={18} color="#fff" />
            <Text style={styles.addServiceBtnText}>+ List Service</Text>
          </TouchableOpacity>
        </View>

        {/* Big Accessible Tabs */}
        <View style={styles.tabRow}>
          <TouchableOpacity
            style={[styles.tab, tab === "services" && styles.tabActive]}
            onPress={() => setTab("services")}
            activeOpacity={0.8}
          >
            <Ionicons
              name="construct"
              size={18}
              color={tab === "services" ? "#fff" : colors.textMuted}
            />
            <Text style={[styles.tabText, tab === "services" && styles.tabTextActive]}>
              Local Services ({services.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, tab === "issues" && styles.tabActive]}
            onPress={() => setTab("issues")}
            activeOpacity={0.8}
          >
            <Ionicons
              name="clipboard"
              size={18}
              color={tab === "issues" ? "#fff" : colors.textMuted}
            />
            <Text style={[styles.tabText, tab === "issues" && styles.tabTextActive]}>
              My Reports ({issues.length})
            </Text>
          </TouchableOpacity>
        </View>

        {tab === "services" ? (
          <>
            {/* Monetization / Partner Banner */}
            <TouchableOpacity
              style={styles.partnerBanner}
              onPress={() => navigation.navigate("AddService")}
              activeOpacity={0.85}
            >
              <View style={styles.partnerIconCircle}>
                <Ionicons name="briefcase" size={20} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.partnerBannerTitle}>Provide a service to neighbours?</Text>
                <Text style={styles.partnerBannerSubtitle}>
                  List your service in {community?.name || "your community"} with 10% platform protection.
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.primary} />
            </TouchableOpacity>

            {/* Category Filter Chips */}
            <View style={{ height: 46, marginBottom: 8 }}>
              <FlatList
                horizontal
                showsHorizontalScrollIndicator={false}
                data={["All", ...SERVICE_CATEGORIES]}
                keyExtractor={(c) => c}
                contentContainerStyle={styles.filterBar}
                renderItem={({ item }) => {
                  const active = category === item;
                  return (
                    <TouchableOpacity
                      style={[styles.chip, active && styles.chipActive]}
                      onPress={() => setCategory(item)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.chipText, active && styles.chipTextActive]}>
                        {item}
                      </Text>
                    </TouchableOpacity>
                  );
                }}
              />
            </View>

            {isCurrentLoading ? (
              <View style={styles.center}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.loadingText}>Loading verified services...</Text>
              </View>
            ) : (
              <FlatList
                data={filteredServices}
                keyExtractor={(s) => String(s.id)}
                contentContainerStyle={styles.listContent}
                refreshControl={
                  <RefreshControl
                    refreshing={isCurrentRefetching}
                    onRefresh={handleRefresh}
                    colors={[colors.primary]}
                  />
                }
                renderItem={({ item }) => <ServiceCard service={item} />}
                ListEmptyComponent={
                  <View style={styles.emptyBox}>
                    <View style={styles.emptyIconCircle}>
                      <Ionicons name="construct-outline" size={40} color={colors.primary} />
                    </View>
                    <Text style={styles.emptyTitle}>
                      {category === "All"
                        ? `No services listed in ${community?.name || "your area"} yet`
                        : `No ${category} listed yet`}
                    </Text>
                    <Text style={styles.emptySub}>
                      Be the first local provider to list your service, receive customer bookings from neighbours, and earn with 10% platform protection!
                    </Text>
                    <TouchableOpacity
                      style={styles.firstServiceBtn}
                      onPress={() => navigation.navigate("AddService")}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="add-circle" size={20} color="#fff" />
                      <Text style={styles.firstServiceBtnText}>+ List Your Service Now</Text>
                    </TouchableOpacity>
                  </View>
                }
              />
            )}
          </>
        ) : (
          <>
            {isCurrentLoading ? (
              <View style={styles.center}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.loadingText}>Loading reports...</Text>
              </View>
            ) : (
              <FlatList
                data={issues}
                keyExtractor={(i) => String(i.id)}
                contentContainerStyle={styles.listContent}
                refreshControl={
                  <RefreshControl
                    refreshing={isCurrentRefetching}
                    onRefresh={handleRefresh}
                    colors={[colors.primary]}
                  />
                }
                renderItem={({ item }) => <IssueCard issue={item} />}
                ListEmptyComponent={
                  <View style={styles.emptyBox}>
                    <View style={styles.emptyIconCircle}>
                      <Ionicons name="checkmark-done" size={40} color={colors.success} />
                    </View>
                    <Text style={styles.emptyTitle}>No Pending Issues</Text>
                    <Text style={styles.emptySub}>
                      Everything is in order! Any issues or maintenance requests you report will be tracked here.
                    </Text>
                  </View>
                }
              />
            )}
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: 54,
  },
  contentWrap: {
    flex: 1,
    width: "100%",
    maxWidth: 540,
    alignSelf: "center",
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 16,
    gap: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: "900",
    color: colors.text,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 13.5,
    color: colors.textMuted,
    marginTop: 2,
  },
  addServiceBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 12,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  addServiceBtnText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 13.5,
  },
  tabRow: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 5,
    marginHorizontal: 20,
    marginBottom: 14,
    borderWidth: 1.5,
    borderColor: colors.borderLight,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    gap: 8,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
  },
  tabActive: {
    backgroundColor: colors.primary,
  },
  tabText: {
    fontSize: 14.5,
    fontWeight: "700",
    color: colors.textMuted,
  },
  tabTextActive: {
    color: "#fff",
  },
  partnerBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.primaryLight,
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: 14,
    padding: 12,
    marginHorizontal: 20,
    marginBottom: 14,
    gap: 10,
  },
  partnerIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  partnerBannerTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.primaryDark,
  },
  partnerBannerSubtitle: {
    fontSize: 12,
    color: colors.text,
    marginTop: 2,
    lineHeight: 16,
  },
  filterBar: {
    paddingHorizontal: 20,
    gap: 8,
    alignItems: "center",
  },
  chip: {
    borderWidth: 1.5,
    borderColor: colors.borderLight,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 7,
    backgroundColor: colors.surface,
    height: 38,
    justifyContent: "center",
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primaryDark,
  },
  chipText: {
    fontSize: 13,
    color: colors.textMuted,
    fontWeight: "700",
  },
  chipTextActive: {
    color: "#fff",
  },
  listContent: {
    padding: 20,
    paddingTop: 4,
    paddingBottom: 40,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: colors.textMuted,
    fontWeight: "600",
  },
  emptyBox: {
    alignItems: "center",
    marginTop: 40,
    paddingHorizontal: 24,
  },
  emptyIconCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.text,
    textAlign: "center",
  },
  emptySub: {
    marginTop: 8,
    fontSize: 14,
    color: colors.textMuted,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 20,
  },
  firstServiceBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 13,
    borderRadius: 14,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  firstServiceBtnText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 15,
  },
});
