import React, { useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import colors from "../theme/colors";
import { ISSUE_CATEGORIES } from "../constants/categories";
import { supabase, isSupabaseConfigured } from "../config/supabase";
import { useAuth } from "../context/AuthContext";

export default function ReportIssueScreen({ navigation }) {
  const { community, user } = useAuth();
  const [category, setCategory] = useState(null);
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!category) {
      Alert.alert("Select Category", "Please select what kind of issue this is.");
      return;
    }
    if (!description.trim()) {
      Alert.alert("Description Required", "Please describe the problem.");
      return;
    }
    if (!community?.id) {
      Alert.alert("No Community", "Please join a community first to report an issue.");
      return;
    }

    setSubmitting(true);
    try {
      let issueId = `NEST-${Math.floor(1000 + Math.random() * 9000)}`;
      if (isSupabaseConfigured && user?.id) {
        const { data, error } = await supabase
          .from("issues")
          .insert({
            community_id: community.id,
            user_id: user.id,
            category,
            description: description.trim(),
            status: "Reported",
          })
          .select()
          .single();

        if (error) throw error;
        if (data?.id) issueId = data.id;
      }

      Alert.alert(
        "Issue Reported! 📋",
        `Report ${issueId} has been submitted for ${community.name} and is now under review.`,
        [{ text: "OK", onPress: () => navigation.goBack() }]
      );
    } catch (err) {
      Alert.alert("Error", err.message || "Failed to submit report.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ padding: 20, paddingTop: 55, paddingBottom: 60 }}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="close" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Report an Issue</Text>
        <View style={{ width: 24 }} />
      </View>

      <Text style={styles.communityTag}>
        Reporting in: <Text style={{ fontWeight: "700" }}>{community?.name || "Your Area"}</Text>
      </Text>

      <Text style={styles.question}>What problem are you facing?</Text>

      <View style={styles.grid}>
        {ISSUE_CATEGORIES.map((c) => {
          const active = category === c.key;
          return (
            <TouchableOpacity
              key={c.key}
              style={[styles.categoryTile, active && styles.categoryTileActive]}
              onPress={() => setCategory(c.key)}
            >
              <Ionicons
                name={c.icon}
                size={22}
                color={active ? "#fff" : colors.primary}
              />
              <Text
                style={[
                  styles.categoryLabel,
                  active && styles.categoryLabelActive,
                ]}
              >
                {c.key}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={styles.label}>Description</Text>
      <TextInput
        style={styles.textArea}
        placeholder="Describe the issue with specific location details (e.g. Near Pole 12)..."
        placeholderTextColor={colors.textMuted}
        multiline
        value={description}
        onChangeText={setDescription}
      />

      <TouchableOpacity
        style={styles.submitBtn}
        onPress={handleSubmit}
        disabled={submitting}
      >
        <Text style={styles.submitBtnText}>
          {submitting ? "Submitting..." : "Submit Report"}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  title: { fontSize: 17, fontWeight: "700", color: colors.text },
  communityTag: { fontSize: 13, color: colors.textMuted, marginBottom: 14 },
  question: { fontSize: 15, fontWeight: "700", color: colors.text, marginBottom: 14 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 20 },
  categoryTile: {
    width: "30%",
    alignItems: "center",
    gap: 6,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  categoryTileActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  categoryLabel: { fontSize: 11.5, color: colors.text, textAlign: "center", fontWeight: "600" },
  categoryLabelActive: { color: "#fff" },
  label: { fontSize: 13, fontWeight: "600", color: colors.text, marginBottom: 8 },
  textArea: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 14,
    minHeight: 110,
    fontSize: 15,
    color: colors.text,
    textAlignVertical: "top",
  },
  submitBtn: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 26,
  },
  submitBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
});
