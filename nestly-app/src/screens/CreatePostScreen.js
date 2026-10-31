import React, { useState } from "react";
import {
  Alert,
  FlatList,
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
      Alert.alert("Details Missing", "Please write something before posting.");
      return;
    }
    if (!community?.id) {
      Alert.alert("No Community", "Please join a community first to share posts.");
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
      Alert.alert("Posted! 🎉", "Your post is now live in the community feed.", [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
    } catch (e) {
      Alert.alert("Error", e.message || "Failed to publish post.");
    } finally {
      setPosting(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="close" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Create Post</Text>
        <TouchableOpacity onPress={handleSubmit} disabled={posting}>
          <Text style={[styles.submit, posting && { opacity: 0.5 }]}>
            {posting ? "Posting..." : "Post"}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={styles.communityTag}>
          Posting in: <Text style={{ fontWeight: "700" }}>{community?.name || "Your Area"}</Text>
        </Text>

        <Text style={styles.label}>Select Category</Text>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={FEED_CATEGORIES}
          keyExtractor={(c) => c}
          contentContainerStyle={{ gap: 8, paddingVertical: 4 }}
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

        <Text style={styles.label}>What's on your mind?</Text>
        <TextInput
          style={styles.textArea}
          placeholder="Share something with your neighbourhood..."
          placeholderTextColor={colors.textMuted}
          multiline
          value={content}
          onChangeText={setContent}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: 20, paddingTop: 55 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  title: { fontSize: 17, fontWeight: "700", color: colors.text },
  submit: { color: colors.primary, fontWeight: "700", fontSize: 16 },
  communityTag: { fontSize: 13, color: colors.textMuted, marginBottom: 12 },
  label: { fontSize: 13, fontWeight: "600", color: colors.text, marginTop: 14, marginBottom: 8 },
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
  textArea: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 14,
    minHeight: 140,
    fontSize: 15,
    color: colors.text,
    textAlignVertical: "top",
  },
});
