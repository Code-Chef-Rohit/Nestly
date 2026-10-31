import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import colors from "../theme/colors";
import { useAuth } from "../context/AuthContext";
import { supabase, isSupabaseConfigured } from "../config/supabase";
import { shareCommunityInvite } from "../utils/shareInvite";

export default function JoinCommunityScreen({ route, navigation }) {
  const { joinCommunity, user } = useAuth();
  const searchParam = route?.params?.query || "";
  const communityIdParam = route?.params?.communityId || "";
  const [query, setQuery] = useState(searchParam);
  const [communities, setCommunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [requesting, setRequesting] = useState(false);

  // Modal to create a new community for the entered pincode/area
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [newCommunityName, setNewCommunityName] = useState(searchParam);
  const [newCommunityAddress, setNewCommunityAddress] = useState(searchParam);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (communityIdParam) {
      fetchById(communityIdParam);
    } else {
      fetchCommunities(searchParam);
    }
  }, [searchParam, communityIdParam]);

  async function fetchById(id) {
    setLoading(true);
    try {
      if (isSupabaseConfigured) {
        const { data, error } = await supabase.from("communities").select("*").eq("id", id).single();
        if (!error && data) {
          setCommunities([data]);
          setSelected(data.id);
        }
      }
    } catch (e) {
      console.warn("Notice loading community by id:", e.message);
    } finally {
      setLoading(false);
    }
  }

  async function fetchCommunities(search = "") {
    setLoading(true);
    try {
      if (isSupabaseConfigured) {
        let req = supabase.from("communities").select("*").order("name");
        if (search.trim()) {
          req = req.or(
            `name.ilike.%${search.trim()}%,address.ilike.%${search.trim()}%`
          );
        }
        const { data, error } = await req;
        if (error) throw error;
        setCommunities(data || []);
        if (data && data.length > 0) {
          setSelected(data[0].id);
        } else {
          setSelected(null);
        }
      } else {
        setCommunities([]);
      }
    } catch (err) {
      console.warn("Error fetching communities:", err.message);
      setCommunities([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleJoin() {
    if (!selected) {
      Alert.alert(
        "Select a Community",
        "Please select a community or create a new one for your area."
      );
      return;
    }
    setRequesting(true);
    const chosen = communities.find((c) => c.id === selected);
    try {
      if (isSupabaseConfigured && user?.id && chosen?.id) {
        // Record membership in Supabase
        await supabase.from("community_members").upsert({
          community_id: chosen.id,
          user_id: user.id,
          role: "member",
          status: "approved",
        });
      }
      await joinCommunity(chosen);
    } catch (err) {
      console.warn("Join community notice:", err.message);
      await joinCommunity(chosen);
    } finally {
      setRequesting(false);
    }
  }

  async function handleCreateCommunity() {
    if (!newCommunityName.trim()) {
      Alert.alert("Name Required", "Please enter a name for the community.");
      return;
    }
    setCreating(true);
    try {
      let created = {
        id: `c_${Date.now()}`,
        name: newCommunityName.trim(),
        address: newCommunityAddress.trim() || newCommunityName.trim(),
      };

      if (isSupabaseConfigured) {
        const { data, error } = await supabase
          .from("communities")
          .insert({
            name: newCommunityName.trim(),
            address: newCommunityAddress.trim() || newCommunityName.trim(),
            admin_id: user?.id || null,
          })
          .select()
          .single();

        if (!error && data) {
          created = data;
          if (user?.id) {
            await supabase.from("community_members").upsert({
              community_id: data.id,
              user_id: user.id,
              role: "admin",
              status: "approved",
            });
          }
        }
      }

      setCreateModalVisible(false);
      await joinCommunity(created);

      // Offer to immediately invite neighbours after creating
      Alert.alert(
        "Community Created! 🎉",
        `"${created.name}" is now live on Nestly. Would you like to share the invite link with your neighbours?`,
        [
          { text: "Maybe Later", style: "cancel" },
          {
            text: "Share Link 📲",
            onPress: () => shareCommunityInvite(created, user?.name),
          },
        ]
      );
    } catch (err) {
      Alert.alert("Error", err.message || "Failed to create community.");
    } finally {
      setCreating(false);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Communities</Text>
        <View style={{ width: 24 }} />
      </View>

      <Text style={styles.subtitle}>
        {query ? `Showing communities for "${query}"` : "Join your neighbourhood community"}
      </Text>

      {/* Real-time Search Box */}
      <View style={styles.searchBox}>
        <Ionicons name="search" size={18} color={colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search area, locality or pincode"
          placeholderTextColor={colors.textMuted}
          value={query}
          onChangeText={(txt) => {
            setQuery(txt);
            fetchCommunities(txt);
          }}
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => { setQuery(""); fetchCommunities(""); }}>
            <Ionicons name="close-circle" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Searching real communities...</Text>
        </View>
      ) : (
        <FlatList
          data={communities}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingVertical: 10 }}
          renderItem={({ item }) => {
            const isSelected = selected === item.id;
            return (
              <TouchableOpacity
                style={[styles.card, isSelected && styles.cardSelected]}
                onPress={() => setSelected(item.id)}
              >
                <View style={styles.cardIcon}>
                  <Ionicons name="home-outline" size={20} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>{item.name}</Text>
                  <Text style={styles.cardSubtitle}>{item.address || "Local Area"}</Text>
                </View>
                <Ionicons
                  name={isSelected ? "radio-button-on" : "radio-button-off"}
                  size={20}
                  color={isSelected ? colors.primary : colors.border}
                />
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                <Ionicons name="location-outline" size={32} color={colors.primary} />
              </View>
              <Text style={styles.emptyTitle}>No community registered yet</Text>
              <Text style={styles.emptySubtitle}>
                Be the first to create and activate the community for{" "}
                <Text style={{ fontWeight: "700", color: colors.text }}>
                  {query || "this pincode"}
                </Text>
                !
              </Text>
              <TouchableOpacity
                style={styles.createBtn}
                onPress={() => {
                  setNewCommunityName(query || "");
                  setNewCommunityAddress(query || "");
                  setCreateModalVisible(true);
                }}
              >
                <Ionicons name="add" size={18} color="#fff" />
                <Text style={styles.createBtnText}>Create This Community</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      {communities.length > 0 && (
        <TouchableOpacity
          style={styles.joinBtn}
          onPress={handleJoin}
          disabled={requesting || !selected}
        >
          <Text style={styles.joinBtnText}>
            {requesting ? "Joining..." : "Join Community"}
          </Text>
        </TouchableOpacity>
      )}

      {/* Modal: Create New Community for Real Pincode */}
      <Modal
        visible={createModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setCreateModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create New Community</Text>
              <TouchableOpacity onPress={() => setCreateModalVisible(false)}>
                <Ionicons name="close-circle" size={24} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>Community / Society Name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Green Valley Society"
              placeholderTextColor={colors.textMuted}
              value={newCommunityName}
              onChangeText={setNewCommunityName}
            />

            <Text style={styles.label}>Locality, Area or Pincode</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Sector 4, 751030"
              placeholderTextColor={colors.textMuted}
              value={newCommunityAddress}
              onChangeText={setNewCommunityAddress}
            />

            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={handleCreateCommunity}
              disabled={creating}
            >
              <Text style={styles.primaryBtnText}>
                {creating ? "Creating..." : "Create & Join Now"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 20,
    paddingTop: 55,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.text,
  },
  subtitle: {
    fontSize: 13.5,
    color: colors.textMuted,
    marginBottom: 16,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14.5,
    color: colors.text,
  },
  centerBox: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    color: colors.textMuted,
    fontSize: 13.5,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  cardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  cardIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: {
    fontWeight: "700",
    color: colors.text,
    fontSize: 15,
  },
  cardSubtitle: {
    fontSize: 12.5,
    color: colors.textMuted,
    marginTop: 2,
  },
  joinBtn: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 8,
    marginBottom: 16,
  },
  joinBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15,
  },
  emptyContainer: {
    alignItems: "center",
    paddingVertical: 36,
    paddingHorizontal: 16,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13.5,
    color: colors.textMuted,
    textAlign: "center",
    lineHeight: 19,
    marginBottom: 20,
  },
  createBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
  },
  createBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.text,
  },
  label: {
    fontSize: 13,
    color: colors.text,
    fontWeight: "600",
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.text,
  },
  primaryBtn: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 22,
  },
  primaryBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15,
  },
});
