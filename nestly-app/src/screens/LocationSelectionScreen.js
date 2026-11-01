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
import * as Location from "expo-location";
import colors, { shadows, radii } from "../theme/colors";
import { supabase, isSupabaseConfigured } from "../config/supabase";
import { useAuth } from "../context/AuthContext";

export default function LocationSelectionScreen({ navigation }) {
  const { joinCommunity, user } = useAuth();
  const [query, setQuery] = useState("");
  const [detecting, setDetecting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [communities, setCommunities] = useState([]);
  const [error, setError] = useState("");
  const [joiningId, setJoiningId] = useState(null);

  // New community creation modal
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [newName, setNewName] = useState("");
  const [newAddress, setNewAddress] = useState("");
  const [creating, setCreating] = useState(false);

  // Load existing communities on mount
  useEffect(() => {
    loadCommunities("");
  }, []);

  // Filter or search as user types
  useEffect(() => {
    const timer = setTimeout(() => {
      loadCommunities(query.trim());
    }, 250);
    return () => clearTimeout(timer);
  }, [query]);

  async function loadCommunities(searchTerm) {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      let req = supabase.from("communities").select("*").order("name");
      if (searchTerm) {
        req = req.or(`name.ilike.%${searchTerm}%,address.ilike.%${searchTerm}%`);
      }
      const { data, error: qErr } = await req.limit(15);
      if (!qErr && data) {
        setCommunities(data);
      } else {
        setCommunities([]);
      }
    } catch (e) {
      console.warn("Location screen load error:", e);
    } finally {
      setLoading(false);
    }
  }

  async function handleSelectCommunity(item) {
    setJoiningId(item.id);
    try {
      if (isSupabaseConfigured && user?.id && item?.id) {
        await supabase.from("community_members").upsert({
          community_id: item.id,
          user_id: user.id,
          role: "member",
          status: "approved",
        });
      }
      await joinCommunity(item);
    } catch (err) {
      console.warn("Join community notice:", err);
      await joinCommunity(item);
    } finally {
      setJoiningId(null);
    }
  }

  async function handleDetectLocation() {
    setError("");
    setDetecting(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setError("Location permission denied. Please search or pick your area below.");
        return;
      }
      const pos = await Location.getCurrentPositionAsync({});
      navigation.navigate("JoinCommunity", {
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
      });
    } catch (e) {
      setError("Couldn't detect automatic location. Please search or select below.");
    } finally {
      setDetecting(false);
    }
  }

  async function handleCreateCommunity() {
    if (!newName.trim()) {
      Alert.alert("Name Required", "Please enter your apartment or society name.");
      return;
    }
    setCreating(true);
    try {
      const code = (
        newName.trim().substring(0, 3).toUpperCase() + Math.floor(100 + Math.random() * 900)
      ).replace(/[^A-Z0-9]/g, "X");

      if (isSupabaseConfigured) {
        const { data, error: insErr } = await supabase
          .from("communities")
          .insert({
            name: newName.trim(),
            address: newAddress.trim() || newName.trim(),
            invite_code: code,
          })
          .select()
          .single();

        if (insErr) throw insErr;
        setCreateModalVisible(false);
        setNewName("");
        setNewAddress("");
        await handleSelectCommunity(data);
        return;
      }

      const localComm = {
        id: `comm_${Date.now()}`,
        name: newName.trim(),
        address: newAddress.trim() || newName.trim(),
        invite_code: code,
      };
      setCreateModalVisible(false);
      await handleSelectCommunity(localComm);
    } catch (err) {
      Alert.alert("Creation Error", err.message || "Failed to create community.");
    } finally {
      setCreating(false);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.contentWrap}>
        {/* Branded Logo Header */}
        <View style={styles.header}>
          <View style={styles.iconWrap}>
            <Image
              source={require("../../assets/logo.png")}
              style={styles.logoImage}
              resizeMode="cover"
            />
          </View>
          <Text style={styles.title}>Select Your Community</Text>
          <Text style={styles.subtitle}>
            Connect with neighbours, view local updates, and access civic help.
          </Text>
        </View>

        {/* GPS Auto-Detect Button */}
        <TouchableOpacity
          style={styles.detectBtn}
          onPress={handleDetectLocation}
          disabled={detecting}
          activeOpacity={0.8}
        >
          {detecting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="navigate" size={18} color="#fff" />
              <Text style={styles.detectBtnText}>Use My Current GPS Location</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Search Bar */}
        <View style={styles.searchBox}>
          <Ionicons name="search" size={20} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search apartment, society, or pincode..."
            placeholderTextColor={colors.textMuted}
            value={query}
            onChangeText={setQuery}
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery("")}>
              <Ionicons name="close-circle" size={20} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {/* Community List */}
        <View style={styles.listHeaderRow}>
          <Text style={styles.sectionHeading}>
            {query.trim() ? "Search Results" : "Available Neighbourhoods"}
          </Text>
          <TouchableOpacity
            onPress={() => {
              setNewName(query.trim());
              setCreateModalVisible(true);
            }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.addBtnText}>+ Add New</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Finding communities...</Text>
          </View>
        ) : (
          <FlatList
            data={communities}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => {
              const isJoining = joiningId === item.id;
              return (
                <TouchableOpacity
                  style={styles.communityCard}
                  onPress={() => handleSelectCommunity(item)}
                  activeOpacity={0.7}
                >
                  <View style={styles.commIconCircle}>
                    <Ionicons name="business" size={22} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.commName}>{item.name}</Text>
                    <Text style={styles.commAddress} numberOfLines={1}>
                      {item.address || "Local Area"}
                    </Text>
                  </View>
                  <View style={styles.joinBtn}>
                    {isJoining ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <>
                        <Text style={styles.joinBtnText}>Select</Text>
                        <Ionicons name="arrow-forward" size={14} color="#fff" />
                      </>
                    )}
                  </View>
                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="location-outline" size={44} color={colors.textMuted} />
                <Text style={styles.emptyTitle}>
                  {query.trim() ? `No community matching "${query}"` : "No communities found"}
                </Text>
                <Text style={styles.emptySubtitle}>
                  You can create a new community for your apartment or society in 1 tap!
                </Text>
                <TouchableOpacity
                  style={styles.createBtn}
                  onPress={() => {
                    setNewName(query.trim());
                    setCreateModalVisible(true);
                  }}
                >
                  <Ionicons name="add-circle" size={18} color="#fff" />
                  <Text style={styles.createBtnText}>Create Community</Text>
                </TouchableOpacity>
              </View>
            }
          />
        )}
      </View>

      {/* Modal to Create New Community */}
      <Modal
        visible={createModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setCreateModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Your Community</Text>
              <TouchableOpacity onPress={() => setCreateModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>
              Create a dedicated private space for residents in your building or layout.
            </Text>

            <Text style={styles.modalLabel}>Apartment / Society Name *</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. Prestige Lakeview Apartments"
              placeholderTextColor={colors.textMuted}
              value={newName}
              onChangeText={setNewName}
            />

            <Text style={styles.modalLabel}>Address / Landmark / Pincode</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. Outer Ring Road, 560103"
              placeholderTextColor={colors.textMuted}
              value={newAddress}
              onChangeText={setNewAddress}
            />

            <TouchableOpacity
              style={styles.modalSubmitBtn}
              onPress={handleCreateCommunity}
              disabled={creating}
            >
              <Text style={styles.modalSubmitBtnText}>
                {creating ? "Creating..." : "Create & Enter Community"}
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
    alignItems: "center",
    marginBottom: 20,
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 20,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  logoImage: {
    width: "100%",
    height: "100%",
  },
  title: {
    fontSize: 24,
    fontWeight: "900",
    color: colors.text,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 14.5,
    color: colors.textMuted,
    lineHeight: 21,
    textAlign: "center",
    marginTop: 4,
    paddingHorizontal: 12,
  },
  detectBtn: {
    flexDirection: "row",
    backgroundColor: colors.primary,
    borderRadius: radii.md,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 14,
    ...shadows.button,
  },
  detectBtnText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 15.5,
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
    gap: 10,
    marginBottom: 16,
    ...shadows.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 15.5,
    color: colors.text,
  },
  error: {
    color: colors.danger,
    fontSize: 13.5,
    marginBottom: 10,
    textAlign: "center",
  },
  listHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionHeading: {
    fontSize: 16.5,
    fontWeight: "800",
    color: colors.text,
  },
  addBtnText: {
    fontSize: 14.5,
    fontWeight: "800",
    color: colors.primary,
  },
  listContent: {
    paddingBottom: 40,
  },
  communityCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.borderLight,
    gap: 14,
    ...shadows.card,
  },
  commIconCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  commName: {
    fontSize: 16.5,
    fontWeight: "800",
    color: colors.text,
  },
  commAddress: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
    fontWeight: "500",
  },
  joinBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: radii.pill,
    ...shadows.button,
  },
  joinBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 13.5,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 30,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: colors.textMuted,
  },
  emptyContainer: {
    alignItems: "center",
    paddingTop: 30,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: colors.text,
    marginTop: 10,
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 13.5,
    color: colors.textMuted,
    textAlign: "center",
    marginTop: 4,
    marginBottom: 16,
  },
  createBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.primary,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
  },
  createBtnText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 14.5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 22,
    paddingBottom: 36,
    maxWidth: 500,
    width: "100%",
    alignSelf: "center",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.text,
  },
  modalSubtitle: {
    fontSize: 14,
    color: colors.textMuted,
    marginBottom: 16,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 6,
    marginTop: 10,
  },
  modalInput: {
    backgroundColor: colors.background,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 48,
    fontSize: 15,
    color: colors.text,
  },
  modalSubmitBtn: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
  },
  modalSubmitBtnText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 16,
  },
});
