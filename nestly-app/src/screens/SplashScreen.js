import React, { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import colors from "../theme/colors";

export default function SplashScreen({ navigation }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      navigation.replace("Auth");
    }, 1200);
    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.logoCircle}>
        <Ionicons name="home" size={44} color="#fff" />
      </View>
      <Text style={styles.title}>Nestly</Text>
      <Text style={styles.subtitle}>Your neighbourhood. Your community. One app.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  logoCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  title: { fontSize: 30, fontWeight: "800", color: "#fff", marginBottom: 6 },
  subtitle: { fontSize: 13, color: "rgba(255,255,255,0.85)", textAlign: "center", paddingHorizontal: 40 },
});
