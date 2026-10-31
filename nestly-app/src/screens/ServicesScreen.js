import React, { useEffect, useState } from "react";
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
import colors from "../theme/colors";
import ServiceCard from "../components/ServiceCard";
import IssueCard from "../components/IssueCard";
import { SERVICE_CATEGORIES } from "../constants/categories";
import { supabase, isSupabaseConfigured } from "../config/supabase";
import { useAuth } from "../context/AuthContext";

export default function ServicesScreen() {
  const { community, user } = useAuth();
  const [tab, setTab] = useState("services"); // 'services' | 'issues'
  const [category, setCategory] = useState("All");
  const [services, setServices] = useState([]);
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadData();
  }, [tab, community?.id]);

  async function loadData() {
    setLoading(true);
    try {
      if (isSupabaseConfigured) {
        if (tab === "services") {
          const { data, error } = await supabase
            .from("services")
            .select("*")
            .order("rating", { ascending: false });
          if (!error && data) {
            setServices(data);
          } else {
            setServices([]);
          }
        } else {
          let req = supabase.from("issues").select("*").order("created_at", { ascending: false });
          if (user?.id) req = req.eq("user_id", user.id);
          const { data, error } = await req;
          if (!error && data) {
            setIssues(data);
          } else {
            setIssues([]);
          }
        }
      }
    } catch (e) {
      console.warn("Notice loading services/issues:", e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  const filteredServices =
    category === "All"
      ? services
      : services.filter((s) => s.category === category);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Services & Civic Requests</Text>

      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tab, tab === "services" && styles.tabActive]}
          onPress={() => setTab("services")}
        >
          <Text style={[styles.tabText, tab === "services" && styles.tabTextActive]}>
            Local Services
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === "issues" && styles.tabActive]}
          onPress={() => setTab("issues")}
        >
          <Text style={[styles.tabText, tab === "issues" && styles.tabTextActive]}>
            My Reported Issues
          </Text>
        </TouchableOpacity>
      </View>

      {tab === "services" ? (
        <>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={["All", ...SERVICE_CATEGORIES]}
            keyExtractor={(c) => c}
            contentContainerStyle={{ gap: 8, paddingVertical: 10 }}
            renderItem={({ item }) => {
              const active = category === item;
              return (
                <TouchableOpacity
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => setCategory(item)}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>
                    {item}
                  </Text>
                </TouchableOpacity>
              );
            }}
          />
          {loading ? (
            <ActivityIndicator style={{ marginTop: 40 }} color={colors.primary} />
          ) : (
            <FlatList
              data={filteredServices}
              keyExtractor={(s) => s.id}
              contentContainerStyle={{ paddingBottom: 30 }}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={() => {
                    setRefreshing(true);
                    loadData();
                  }}
                />
              }
              renderItem={({ item }) => <ServiceCard service={item} />}
              ListEmptyComponent={
                <View style={styles.emptyBox}>
                  <Ionicons name="construct-outline" size={38} color={colors.textMuted} />
                  <Text style={styles.emptyTitle}>No service providers registered</Text>
                  <Text style={styles.emptySub}>
                    Verified electricians, plumbers, and handymen in {community?.name || "your area"} will appear here.
                  </Text>
                </View>
              }
            />
          )}
        </>
      ) : (
        <>
          {loading ? (
            <ActivityIndicator style={{ marginTop: 40 }} color={colors.primary} />
          ) : (
            <FlatList
              data={issues}
              keyExtractor={(i) => i.id}
              contentContainerStyle={{ paddingTop: 10, paddingBottom: 30 }}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={() => {
                    setRefreshing(true);
                    loadData();
                  }}
                />
              }
              renderItem={({ item }) => <IssueCard issue={item} />}
              ListEmptyComponent={
                <View style={styles.emptyBox}>
                  <Ionicons name="checkmark-done-circle-outline" size={44} color={colors.success} />
                  <Text style={styles.emptyTitle}>All clean! No active reports</Text>
                  <Text style={styles.emptySub}>
                    Issues you report in {community?.name || "your neighbourhood"} will be tracked here in real-time.
                  </Text>
                </View>
              }
            />
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: 20, paddingTop: 55 },
  title: { fontSize: 22, fontWeight: "800", color: colors.text, marginBottom: 14 },
  tabRow: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tab: { flex: 1, paddingVertical: 10, alignItems: "center", borderRadius: 9 },
  tabActive: { backgroundColor: colors.primary },
  tabText: { fontSize: 13, fontWeight: "600", color: colors.textMuted },
  tabTextActive: { color: "#fff" },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
    backgroundColor: colors.surface,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 12.5, color: colors.textMuted, fontWeight: "600" },
  chipTextActive: { color: "#fff" },
  emptyBox: { alignItems: "center", marginTop: 60, paddingHorizontal: 30 },
  emptyTitle: { marginTop: 12, fontSize: 15, fontWeight: "700", color: colors.text, textAlign: "center" },
  emptySub: { marginTop: 6, fontSize: 13, color: colors.textMuted, textAlign: "center", lineHeight: 18 },
});
