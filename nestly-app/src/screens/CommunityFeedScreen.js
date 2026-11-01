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
import { useQuery, useQueryClient } from "@tanstack/react-query";
import colors, { shadows, radii } from "../theme/colors";
import PostCard from "../components/PostCard";
import { FEED_CATEGORIES } from "../constants/categories";
import { supabase, isSupabaseConfigured } from "../config/supabase";
import { useAuth } from "../context/AuthContext";

export default function CommunityFeedScreen({ navigation }) {
  const { community } = useAuth();
  const [filter, setFilter] = useState("All");
  const queryClient = useQueryClient();

  // Cached Query using TanStack React Query
  const {
    data: posts = [],
    isLoading,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: ["community_posts", community?.id],
    queryFn: async () => {
      if (!isSupabaseConfigured || !community?.id) return [];
      let rawPosts = [];
      try {
        const { data, error } = await supabase
          .from("posts")
          .select("*, users(name)")
          .eq("community_id", community.id)
          .order("created_at", { ascending: false });
        if (!error && data) {
          rawPosts = data;
        } else {
          throw error || new Error("Relation query failed");
        }
      } catch (relErr) {
        const { data: standaloneData } = await supabase
          .from("posts")
          .select("*")
          .eq("community_id", community.id)
          .order("created_at", { ascending: false });
        rawPosts = standaloneData || [];
      }

      return rawPosts.map((p) => ({
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
    },
    enabled: Boolean(community?.id),
    staleTime: 1000 * 60 * 3, // 3 minutes fresh cache
  });

  function handleLike(postId) {
    queryClient.setQueryData(["community_posts", community?.id], (old = []) =>
      old.map((p) =>
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
      <View style={styles.contentWrap}>
        {/* Header */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Community Feed</Text>
            <View style={styles.locationChip}>
              <Ionicons name="location-sharp" size={14} color={colors.primary} />
              <Text style={styles.subtitle} numberOfLines={1}>
                {community?.name || "Your Neighbourhood"}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.postBtn}
            onPress={() => navigation.navigate("CreatePost")}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Create Post"
          >
            <Ionicons name="add" size={20} color="#fff" />
            <Text style={styles.postBtnText}>Post</Text>
          </TouchableOpacity>
        </View>

        {/* Filter Categories */}
        <View style={{ height: 50, marginBottom: 8 }}>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={["All", ...FEED_CATEGORIES]}
            keyExtractor={(c) => c}
            contentContainerStyle={styles.filterBar}
            renderItem={({ item }) => {
              const active = filter === item;
              return (
                <TouchableOpacity
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => setFilter(item)}
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

        {/* Posts List */}
        {isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Loading community feed...</Text>
          </View>
        ) : (
          <FlatList
            data={filteredPosts}
            keyExtractor={(p) => p.id}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={isRefetching}
                onRefresh={refetch}
                colors={[colors.primary]}
              />
            }
            renderItem={({ item }) => <PostCard post={item} onLike={handleLike} />}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <View style={styles.emptyIconCircle}>
                  <Ionicons name="chatbubbles-outline" size={42} color={colors.primary} />
                </View>
                <Text style={styles.emptyText}>No posts in {community?.name || "this area"} yet.</Text>
                <Text style={styles.emptySub}>
                  Share news, ask questions, or say hello to your neighbours!
                </Text>
                <TouchableOpacity
                  style={styles.firstPostBtn}
                  onPress={() => navigation.navigate("CreatePost")}
                >
                  <Ionicons name="create-outline" size={18} color="#fff" />
                  <Text style={styles.firstPostBtnText}>Create the First Post</Text>
                </TouchableOpacity>
              </View>
            }
          />
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
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "900",
    color: colors.text,
    letterSpacing: -0.3,
  },
  locationChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textMuted,
    fontWeight: "600",
  },
  postBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.primary,
    borderRadius: radii.pill,
    paddingHorizontal: 18,
    paddingVertical: 10,
    ...shadows.button,
  },
  postBtnText: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 15,
  },
  filterBar: {
    paddingHorizontal: 20,
    gap: 10,
    alignItems: "center",
  },
  chip: {
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radii.pill,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: colors.surface,
    height: 40,
    justifyContent: "center",
    ...shadows.sm,
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primaryDark,
  },
  chipText: {
    fontSize: 13.5,
    color: colors.textMuted,
    fontWeight: "800",
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
    padding: 20,
  },
  loadingText: {
    marginTop: 14,
    fontSize: 15,
    color: colors.textMuted,
    fontWeight: "600",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 50,
    paddingHorizontal: 24,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 17,
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
    marginBottom: 20,
  },
  firstPostBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.primary,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 14,
  },
  firstPostBtnText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 15,
  },
});
