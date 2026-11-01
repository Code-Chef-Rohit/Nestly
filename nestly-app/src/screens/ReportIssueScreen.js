import React, { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import colors, { shadows, radii } from "../theme/colors";
import { ISSUE_CATEGORIES } from "../constants/categories";
import { supabase, isSupabaseConfigured } from "../config/supabase";
import { useAuth } from "../context/AuthContext";
import { useQueryClient } from "@tanstack/react-query";

export default function ReportIssueScreen({ navigation }) {
  const { community, user } = useAuth();
  const queryClient = useQueryClient();
  const [category, setCategory] = useState(null);
  const [priority, setPriority] = useState("Normal");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!category) {
      Alert.alert("Choose Category", "Please tap one of the issue categories below.");
      return;
    }
    if (!description.trim()) {
      Alert.alert("Describe Issue", "Please enter a short description of the problem.");
      return;
    }
    if (!community?.id) {
      Alert.alert("No Community Selected", "Please select your community before submitting.");
      return;
    }

    setSubmitting(true);
    try {
      let issueId = `NEST-${Math.floor(1000 + Math.random() * 9000)}`;
      const fullDesc = priority !== "Normal" ? `[${priority.toUpperCase()} PRIORITY] ${description.trim()}` : description.trim();
      if (isSupabaseConfigured && user?.id) {
        const { data, error } = await supabase
          .from("issues")
          .insert({
            community_id: community.id,
            user_id: user.id,
            category,
            description: fullDesc,
            status: "Reported",
          })
          .select()
          .single();

        if (error) throw error;
        if (data?.id) issueId = data.id;

        await queryClient.invalidateQueries({ queryKey: ["user_issues"] });
        await queryClient.invalidateQueries({ queryKey: ["dashboard_stats"] });
      }

      Alert.alert(
        "Report Submitted",
        `Your issue ticket #${issueId} for ${community.name} has been recorded. Maintenance and community leads have been notified.`,
        [{ text: "Done", onPress: () => navigation.goBack() }]
      );
    } catch (err) {
      Alert.alert("Submission Error", err.message || "Failed to submit report.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.contentWrap}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              accessibilityRole="button"
              accessibilityLabel="Go back"
            >
              <Ionicons name="arrow-back" size={26} color={colors.text} />
            </TouchableOpacity>
            <Text style={styles.title}>Report an Issue</Text>
            <View style={{ width: 26 }} />
          </View>

          {/* Location Badge */}
          <View style={styles.locationBanner}>
            <Ionicons name="location-sharp" size={18} color={colors.primary} />
            <Text style={styles.locationBannerText}>
              Location: <Text style={{ fontWeight: "800" }}>{community?.name || "Community"}</Text>
            </Text>
          </View>

          {/* Question / Step 1 */}
          <Text style={styles.stepTitle}>1. What kind of problem is it?</Text>
          <Text style={styles.stepSubtitle}>Tap a category that best matches your issue:</Text>

          <View style={styles.grid}>
            {ISSUE_CATEGORIES.map((c) => {
              const active = category === c.key;
              return (
                <TouchableOpacity
                  key={c.key}
                  style={[styles.categoryTile, active && styles.categoryTileActive]}
                  onPress={() => setCategory(c.key)}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel={c.key}
                >
                  <View
                    style={[
                      styles.iconCircle,
                      active ? styles.iconCircleActive : styles.iconCircleInactive,
                    ]}
                  >
                    <Ionicons
                      name={c.icon}
                      size={24}
                      color={active ? "#fff" : colors.primary}
                    />
                  </View>
                  <Text
                    style={[
                      styles.categoryLabel,
                      active && styles.categoryLabelActive,
                    ]}
                    numberOfLines={1}
                  >
                    {c.key}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Urgency / Step 2 */}
          <Text style={styles.stepTitle}>2. How urgent is it?</Text>
          <Text style={styles.stepSubtitle}>Select urgency level to prioritize response:</Text>

          <View style={styles.priorityRow}>
            {[
              { key: "Normal", label: "Normal", icon: "time-outline", color: colors.primary },
              { key: "High", label: "Important", icon: "alert-circle-outline", color: colors.warning },
              { key: "Urgent", label: "Urgent SOS", icon: "warning-outline", color: colors.danger },
            ].map((p) => {
              const active = priority === p.key;
              return (
                <TouchableOpacity
                  key={p.key}
                  style={[
                    styles.priorityPill,
                    active && { backgroundColor: p.color, borderColor: p.color },
                  ]}
                  onPress={() => setPriority(p.key)}
                  activeOpacity={0.7}
                >
                  <Ionicons name={p.icon} size={16} color={active ? "#fff" : p.color} />
                  <Text style={[styles.priorityPillText, active && { color: "#fff" }]}>
                    {p.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Description / Step 3 */}
          <Text style={styles.stepTitle}>3. Describe the problem</Text>
          <Text style={styles.stepSubtitle}>
            Add details like tower, flat number, street or landmark:
          </Text>

          <TextInput
            style={styles.textArea}
            placeholder="e.g. Water leakage near 2nd floor elevator lobby since this morning..."
            placeholderTextColor={colors.textMuted}
            multiline
            numberOfLines={4}
            value={description}
            onChangeText={setDescription}
          />

          {/* Submit Button */}
          <TouchableOpacity
            style={styles.submitBtn}
            onPress={handleSubmit}
            disabled={submitting}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Submit Issue Report"
          >
            <Ionicons name="send" size={20} color="#fff" />
            <Text style={styles.submitBtnText}>
              {submitting ? "Submitting Report..." : "Submit Report"}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: 20,
    paddingTop: 54,
    paddingBottom: 40,
  },
  contentWrap: {
    width: "100%",
    maxWidth: 540,
    alignSelf: "center",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.text,
    letterSpacing: -0.3,
  },
  locationBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    marginBottom: 20,
  },
  locationBannerText: {
    fontSize: 14.5,
    color: colors.primaryDark,
  },
  stepTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: colors.text,
    letterSpacing: -0.2,
    marginBottom: 4,
  },
  stepSubtitle: {
    fontSize: 13.5,
    color: colors.textMuted,
    marginBottom: 14,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 24,
    gap: 10,
  },
  categoryTile: {
    width: "30.5%",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 6,
    borderRadius: radii.xl,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.card,
  },
  categoryTileActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primaryDark,
  },
  iconCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  iconCircleInactive: {
    backgroundColor: colors.primaryLight,
  },
  iconCircleActive: {
    backgroundColor: "rgba(255,255,255,0.25)",
  },
  categoryLabel: {
    fontSize: 13,
    color: colors.text,
    textAlign: "center",
    fontWeight: "800",
  },
  categoryLabelActive: {
    color: "#fff",
  },
  priorityRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 20,
  },
  priorityPill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 11,
    paddingHorizontal: 8,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.borderLight,
    ...shadows.sm,
  },
  priorityPillText: {
    fontSize: 13.5,
    fontWeight: "800",
    color: colors.text,
  },
  textArea: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radii.xl,
    padding: 16,
    minHeight: 120,
    fontSize: 16,
    color: colors.text,
    textAlignVertical: "top",
    marginBottom: 24,
    lineHeight: 22,
    ...shadows.sm,
  },
  submitBtn: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.primary,
    borderRadius: radii.pill,
    height: 54,
    ...shadows.button,
  },
  submitBtnText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 16.5,
  },
});
