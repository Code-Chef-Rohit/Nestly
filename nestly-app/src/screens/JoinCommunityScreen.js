import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import colors, { shadows, radii } from "../theme/colors";
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
        "Please tap a community to select it, or create a new one for your area."
      );
      return;
    }
    setRequesting(true);
    const chosen = communities.find((c) => c.id === selected);
    try {
      if (isSupabaseConfigured && user?.id && chosen?.id) {
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
      <View style={styles.contentWrap}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name="arrow-back" size={26} color={colors.text} />
          </TouchableOpacity>
          <View style={styles.headerTitleWrap}>
            <Image
              source={require("../../assets/logo.png")}
              style={styles.headerLogo}
              resizeMode="contain"
            />
            <Text style={styles.title}>Neighbourhoods</Text>
          </View>
          <View style={{ width: 26 }} />
        </View>

        <Text style={styles.subtitle}>
          {query ? `Showing communities for "${query}"` : "Join your neighbourhood community"}
        </Text>

        {/* Real-time Search Box */}
        <View style={styles.searchBox}>
          <Ionicons name="search" size={20} color={colors.textMuted} />
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
              <Ionicons name="close-circle" size={20} color={colors.textMuted} />
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
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={{ paddingVertical: 10, paddingBottom: 20 }}
            renderItem={({ item }) => {
              const isSelected = selected === item.id;
              return (
                <TouchableOpacity
                  style={[styles.card, isSelected && styles.cardSelected]}
                  onPress={() => setSelected(item.id)}
                  activeOpacity={0.7}
                >
                  <View style={styles.cardIcon}>
                    <Ionicons name="business" size={22} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle}>{item.name}</Text>
                    <Text style={styles.cardSubtitle}>{item.address || "Local Area"}</Text>
                  </View>
                  <Ionicons
                    name={isSelected ? "checkmark-circle" : "ellipse-outline"}
                    size={24}
                    color={isSelected ? colors.primary : colors.border}
                  />
                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <View style={styles.emptyIconCircle}>
                  <Ionicons name="location-outline" size={36} color={colors.primary} />
                </View>
                <Text style={styles.emptyTitle}>No community registered yet</Text>
                <Text style={styles.emptySubtitle}>
                  Be the first to activate the community for{" "}
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
                  <Ionicons name="add" size={20} color="#fff" />
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
            activeOpacity={0.8}
          >
            <Text style={styles.joinBtnText}>
              {requesting ? "Joining Community..." : "Join Selected Community"}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Modal: Create New Community */}
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
                <Ionicons name="close-circle" size={26} color={colors.textMuted} />
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
    paddingTop: 54,
  },
  contentWrap: {
    flex: 1,
    width: "100%",
    maxWidth: 500,
    alignSelf: "center",
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  headerTitleWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerLogo: {
    width: 28,
    height: 28,
    borderRadius: 7,
  },
  title: {
    fontSize: 22,
    fontWeight: "900",
    color: colors.text,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textMuted,
    marginBottom: 16,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radii.md,
    paddingHorizontal: 16,
    height: 52,
    marginBottom: 14,
    gap: 10,
    ...shadows.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 15.5,
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
    fontSize: 14,
    fontWeight: "700",
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radii.xl,
    padding: 16,
    marginBottom: 12,
    ...shadows.card,
  },
  cardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
    borderWidth: 2,
  },
  cardIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    ...shadows.sm,
  },
  cardTitle: {
    fontWeight: "800",
    color: colors.text,
    fontSize: 16.5,
  },
  cardSubtitle: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
    fontWeight: "500",
  },
  joinBtn: {
    backgroundColor: colors.primary,
    borderRadius: radii.pill,
    height: 54,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
    marginBottom: 24,
    ...shadows.button,
  },
  joinBtnText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 16,
  },
  emptyContainer: {
    alignItems: "center",
    paddingVertical: 36,
    paddingHorizontal: 16,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: colors.text,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 20,
  },
  createBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  createBtnText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 15,
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
    maxWidth: 500,
    width: "100%",
    alignSelf: "center",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.text,
  },
  label: {
    fontSize: 14,
    color: colors.text,
    fontWeight: "700",
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    backgroundColor: colors.background,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 50,
    fontSize: 15.5,
    color: colors.text,
  },
  primaryBtn: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 22,
  },
  primaryBtnText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 16,
  },
});
