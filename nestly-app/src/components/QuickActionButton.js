import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import colors from "../theme/colors";

export default function QuickActionButton({ icon, label, onPress, color, bgColor }) {
  const iconColor = color || colors.primary;
  const containerBg = bgColor || colors.primaryLight;

  return (
    <TouchableOpacity
      style={styles.wrap}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
    >
      <View style={[styles.iconCircle, { backgroundColor: containerBg }]}>
        <Ionicons name={icon} size={26} color={iconColor} />
      </View>
      <Text style={styles.label} numberOfLines={2}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: "25%",
    alignItems: "center",
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  label: {
    fontSize: 13.5,
    fontWeight: "700",
    color: colors.text,
    textAlign: "center",
    lineHeight: 17,
  },
});
