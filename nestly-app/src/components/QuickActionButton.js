import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import colors from "../theme/colors";

export default function QuickActionButton({ icon, label, onPress }) {
  return (
    <TouchableOpacity style={styles.wrap} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.iconCircle}>
        <Ionicons name={icon} size={22} color={colors.primary} />
      </View>
      <Text style={styles.label} numberOfLines={1}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrap: { width: "25%", alignItems: "center", marginBottom: 18 },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  label: { fontSize: 12, color: colors.text, textAlign: "center" },
});
