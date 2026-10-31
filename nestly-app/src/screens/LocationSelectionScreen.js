import React, { useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import colors from "../theme/colors";

export default function LocationSelectionScreen({ navigation }) {
  const [query, setQuery] = useState("");
  const [detecting, setDetecting] = useState(false);
  const [error, setError] = useState("");

  async function handleDetectLocation() {
    setError("");
    setDetecting(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setError("Location permission denied. You can search manually instead.");
        return;
      }
      const pos = await Location.getCurrentPositionAsync({});
      navigation.navigate("JoinCommunity", {
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
      });
    } catch (e) {
      setError("Couldn't detect your location. Try searching manually.");
    } finally {
      setDetecting(false);
    }
  }

  function handleSearch() {
    if (!query.trim()) {
      setError("Enter an area, locality or pincode.");
      return;
    }
    navigation.navigate("JoinCommunity", { query });
  }

  return (
    <View style={styles.container}>
      <View style={styles.iconWrap}>
        <Ionicons name="location" size={40} color={colors.primary} />
      </View>
      <Text style={styles.title}>Where do you live?</Text>
      <Text style={styles.subtitle}>
        We use your location to connect you with your actual neighbourhood.
      </Text>

      <TouchableOpacity style={styles.detectBtn} onPress={handleDetectLocation} disabled={detecting}>
        {detecting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            <Ionicons name="navigate" size={18} color="#fff" />
            <Text style={styles.detectBtnText}>Use my current location</Text>
          </>
        )}
      </TouchableOpacity>

      <View style={styles.dividerRow}>
        <View style={styles.divider} />
        <Text style={styles.dividerText}>or search</Text>
        <View style={styles.divider} />
      </View>

      <TextInput
        style={styles.input}
        placeholder="Search area, locality or pincode"
        placeholderTextColor={colors.textMuted}
        value={query}
        onChangeText={setQuery}
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <TouchableOpacity style={styles.searchBtn} onPress={handleSearch}>
        <Text style={styles.searchBtnText}>Continue</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: 24, paddingTop: 70 },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  title: { fontSize: 22, fontWeight: "800", color: colors.text, marginBottom: 6 },
  subtitle: { fontSize: 13.5, color: colors.textMuted, lineHeight: 19, marginBottom: 28 },
  detectBtn: {
    flexDirection: "row",
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  detectBtnText: { color: "#fff", fontWeight: "700", fontSize: 14.5 },
  dividerRow: { flexDirection: "row", alignItems: "center", marginVertical: 22, gap: 10 },
  divider: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerText: { color: colors.textMuted, fontSize: 12 },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.text,
  },
  error: { color: colors.danger, fontSize: 13, marginTop: 10 },
  searchBtn: {
    marginTop: 18,
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: "center",
  },
  searchBtnText: { color: colors.primary, fontWeight: "700", fontSize: 14.5 },
});
