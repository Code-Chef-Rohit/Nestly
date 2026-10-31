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
import PostCard from "../components/PostCard";
import { FEED_CATEGORIES } from "../constants/categories";
import { supabase, isSupabaseConfigured } from "../config/supabase";
import { useAuth } from "../context/AuthContext";

export default function CommunityFeedScreen({ navigation }) {
  const { community, user } = useAuth();
  const [filter, setFilter] = useState("All");
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchPosts();
  }, [community?.id]);

  async function fetchPosts() {
    setLoading(true);
    try {
      if (isSupabaseConfigured && community?.id) {
        const { data, error } = await supabase
          .from("posts")
          .select("*, users(name)")
          .eq("community_id", community.id)
          .order("created_at", { ascending: false });

        if (error) throw error;
        // Map backend schema to post card props
        const mapped = (data || []).map((p) => ({
          id: p.id,
          author: p.users?.name || "Neighbour",
          category: p.category || "General",
          content: p.content,
          image: p.image,
          time: new Date(p.created_at).toLocaleDateString(),
          likes: 0,
          comments: 0,
          liked: false,
        }));
        setPosts(mapped);
      } else {
        setPosts([]);
      }
    } catch (e) {
      console.warn("Error loading feed:", e.message);
      setPosts([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  function handleLike(postId) {
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? { ...p, liked: !p.liked, likes: p.liked ? p.likes - 1 : p.likes + 1 }
          : p
      )
    );
  }

  const filteredPosts =
    filter === "All" ? posts : posts.filter((p) => p.category === filter);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Community Feed</Text>
          <Text style={styles.subtitle}>{community?.name || "Your Community"}</Text>
        </View>
        <TouchableOpacity
          style={styles.postBtn}
          onPress={() => navigation.navigate("CreatePost")}
        >
          <Ionicons name="add" size={18} color="#fff" />
          <Text style={styles.postBtnText}>Post</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={["All", ...FEED_CATEGORIES]}
        keyExtractor={(c) => c}
        contentContainerStyle={{ paddingHorizontal: 20, gap: 8, paddingBottom: 12 }}
        renderItem={({ item }) => {
          const active = filter === item;
          return (
            <TouchableOpacity
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => setFilter(item)}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>
                {item}
              </Text>
            </TouchableOpacity>
          );
        }}
      />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.emptyText}>Loading community posts...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredPosts}
          keyExtractor={(p) => p.id}
          contentContainerStyle={{ padding: 20, paddingTop: 4 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                fetchPosts();
              }}
            />
          }
          renderItem={({ item }) => <PostCard post={item} onLike={handleLike} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="newspaper-outline" size={40} color={colors.textMuted} />
              <Text style={styles.emptyText}>No posts in {community?.name || "your area"} yet.</Text>
              <Text style={styles.emptySub}>Be the first to share an update with your neighbours!</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, paddingTop: 55 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 14,
  },
  title: { fontSize: 22, fontWeight: "800", color: colors.text },
  subtitle: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  postBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  postBtnText: { color: "#fff", fontWeight: "700", fontSize: 13 },
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
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  emptyContainer: { alignItems: "center", justifyContent: "center", marginTop: 60, paddingHorizontal: 30 },
  emptyText: { marginTop: 12, fontSize: 15, fontWeight: "700", color: colors.text, textAlign: "center" },
  emptySub: { marginTop: 6, fontSize: 13, color: colors.textMuted, textAlign: "center" },
});
