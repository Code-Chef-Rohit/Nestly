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

const DEFAULT_COMMUNITY_SERVICES = [
  {
    id: "def-1",
    name: "24x7 Emergency Plumber",
    category: "Plumber",
    phone: "9876543211",
    rating: "4.9",
    startingPrice: "299",
    verified: true,
    distanceKm: "0.8",
  },
  {
    id: "def-2",
    name: "Express Electrician & Power Repair",
    category: "Electrician",
    phone: "9876543212",
    rating: "4.8",
    startingPrice: "199",
    verified: true,
    distanceKm: "1.2",
  },
  {
    id: "def-3",
    name: "Senior Home Care & Nursing Support",
    category: "Health & Care",
    phone: "14567",
    rating: "5.0",
    startingPrice: "0",
    verified: true,
    distanceKm: "0.5",
  },
  {
    id: "def-4",
    name: "CoolCare AC & Appliance Service",
    category: "AC Repair",
    phone: "9876543213",
    rating: "4.7",
    startingPrice: "399",
    verified: true,
    distanceKm: "1.5",
  },
  {
    id: "def-5",
    name: "Neighbourhood Home Cleaning & Sanitization",
    category: "Cleaning",
    phone: "9876543214",
    rating: "4.8",
    startingPrice: "499",
    verified: true,
    distanceKm: "2.0",
  },
];

export default function ServicesScreen() {
  const { community, user } = useAuth();
  const [tab, setTab] = useState("services"); // 'services' | 'issues'
  const [category, setCategory] = useState("All");

  // Cached Services Query
  const {
    data: dbServices = [],
    isLoading: servicesLoading,
    isRefetching: servicesRefetching,
    refetch: refetchServices,
  } = useQuery({
    queryKey: ["community_services"],
    queryFn: async () => {
      if (!isSupabaseConfigured) return [];
      const { data, error } = await supabase
        .from("services")
        .select("*")
        .order("rating", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    staleTime: 1000 * 60 * 10,
  });

  // Blend with default community services if DB is empty so screen is never blank
  const services = dbServices.length > 0 ? dbServices : DEFAULT_COMMUNITY_SERVICES;

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
      : services.filter((s) => s.category.toLowerCase().includes(category.toLowerCase()));

  const isCurrentLoading = tab === "services" ? servicesLoading : issuesLoading;
  const isCurrentRefetching = tab === "services" ? servicesRefetching : issuesRefetching;
  const handleRefresh = tab === "services" ? refetchServices : refetchIssues;

  return (
    <View style={styles.container}>
      <View style={styles.contentWrap}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Services & Civic Help</Text>
          <Text style={styles.subtitle}>
            One-touch verified local help for {community?.name || "your area"}
          </Text>
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
              Local Pros & Help
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
            {/* Category Filter Chips */}
            <View style={{ height: 50, marginBottom: 8 }}>
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
                <Text style={styles.loadingText}>Finding local services...</Text>
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
  header: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "900",
    color: colors.text,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: 4,
    lineHeight: 20,
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
  filterBar: {
    paddingHorizontal: 20,
    gap: 10,
    alignItems: "center",
  },
  chip: {
    borderWidth: 1.5,
    borderColor: colors.borderLight,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: colors.surface,
    height: 40,
    justifyContent: "center",
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primaryDark,
  },
  chipText: {
    fontSize: 13.5,
    color: colors.textMuted,
    fontWeight: "700",
  },
  chipTextActive: {
    color: "#fff",
  },
  listContent: {
    padding: 20,
    paddingTop: 8,
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
    marginTop: 50,
    paddingHorizontal: 24,
  },
  emptyIconCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: colors.successLight,
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
    marginTop: 6,
    fontSize: 14,
    color: colors.textMuted,
    textAlign: "center",
    lineHeight: 20,
  },
});
