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
import colors from "../theme/colors";
import { FEED_CATEGORIES } from "../constants/categories";
import { supabase, isSupabaseConfigured } from "../config/supabase";
import { useAuth } from "../context/AuthContext";

export default function CreatePostScreen({ navigation }) {
  const { community, user } = useAuth();
  const [category, setCategory] = useState(FEED_CATEGORIES[0]);
  const [content, setContent] = useState("");
  const [posting, setPosting] = useState(false);

  async function handleSubmit() {
    if (!content.trim()) {
      Alert.alert("Content Required", "Please write a message before posting.");
      return;
    }
    if (!community?.id) {
      Alert.alert("No Community Selected", "Please select a community to post in.");
      return;
    }

    setPosting(true);
    try {
      if (isSupabaseConfigured && user?.id) {
        const { error } = await supabase.from("posts").insert({
          community_id: community.id,
          user_id: user.id,
          category,
          content: content.trim(),
        });
        if (error) throw error;
      }
      Alert.alert("Post Published! 🎉", "Your post is now visible to all neighbours.", [
        { text: "View Feed", onPress: () => navigation.goBack() },
      ]);
    } catch (e) {
      Alert.alert("Posting Error", e.message || "Failed to publish post.");
    } finally {
      setPosting(false);
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
              accessibilityLabel="Cancel post"
            >
              <Ionicons name="close" size={26} color={colors.text} />
            </TouchableOpacity>
            <Text style={styles.title}>Create New Post</Text>
            <View style={{ width: 26 }} />
          </View>

          {/* Location Badge */}
          <View style={styles.locationBanner}>
            <Ionicons name="location-sharp" size={18} color={colors.primary} />
            <Text style={styles.locationBannerText}>
              Sharing in: <Text style={{ fontWeight: "800" }}>{community?.name || "My Community"}</Text>
            </Text>
          </View>

          {/* Category Picker */}
          <Text style={styles.label}>1. Select Category</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipRow}
          >
            {FEED_CATEGORIES.map((item) => {
              const active = category === item;
              return (
                <TouchableOpacity
                  key={item}
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => setCategory(item)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>
                    {item}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Text Area */}
          <Text style={[styles.label, { marginTop: 18 }]}>2. What would you like to share?</Text>
          <TextInput
            style={styles.textArea}
            placeholder="Write your notice, request, question, or announcement here..."
            placeholderTextColor={colors.textMuted}
            multiline
            numberOfLines={6}
            value={content}
            onChangeText={setContent}
          />

          {/* Submit Button */}
          <TouchableOpacity
            style={styles.submitBtn}
            onPress={handleSubmit}
            disabled={posting}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Publish post"
          >
            <Ionicons name="send" size={20} color="#fff" />
            <Text style={styles.submitBtnText}>
              {posting ? "Publishing..." : "Publish to Community"}
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
  label: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.text,
    marginBottom: 10,
    letterSpacing: -0.2,
  },
  chipRow: {
    gap: 10,
    paddingVertical: 4,
    marginBottom: 6,
  },
  chip: {
    borderWidth: 1.5,
    borderColor: colors.borderLight,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: colors.surface,
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primaryDark,
  },
  chipText: {
    fontSize: 14,
    color: colors.textMuted,
    fontWeight: "700",
  },
  chipTextActive: {
    color: "#fff",
  },
  textArea: {
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 16,
    minHeight: 140,
    fontSize: 16,
    color: colors.text,
    textAlignVertical: "top",
    lineHeight: 23,
    marginBottom: 24,
  },
  submitBtn: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.primary,
    borderRadius: 16,
    height: 54,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  submitBtnText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 16.5,
  },
});
