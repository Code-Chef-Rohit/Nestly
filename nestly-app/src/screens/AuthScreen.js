import React, { useState } from "react";
import {
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
import { useAuth } from "../context/AuthContext";

export default function AuthScreen() {
  const { signIn, signInWithGoogle } = useAuth();
  const [mode, setMode] = useState("login"); // 'login' | 'signup'
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit() {
    setError("");
    if (!email.trim()) {
      setError("Please enter your email.");
      return;
    }
    if (!password.trim()) {
      setError("Please enter your password.");
      return;
    }
    if (mode === "signup" && !name.trim()) {
      setError("Please enter your name.");
      return;
    }

    setLoading(true);
    try {
      await signIn({
        email: email.trim(),
        password: password.trim(),
        name: name.trim(),
        isSignUp: mode === "signup",
      });
    } catch (e) {
      setError(e.message || "Failed to authenticate. Please try again.");
    } finally {
      setLoading(false);
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
        <View style={styles.header}>
          <View style={styles.logoCircle}>
            <Ionicons name="home" size={32} color="#fff" />
          </View>
          <Text style={styles.title}>Nestly</Text>
          <Text style={styles.subtitle}>
            {mode === "login"
              ? "Welcome back to your neighbourhood"
              : "Create an account to join your neighbourhood"}
          </Text>
        </View>

        <View style={styles.tabSwitch}>
          <TouchableOpacity
            style={[styles.tabBtn, mode === "login" && styles.tabBtnActive]}
            onPress={() => {
              setError("");
              setMode("login");
            }}
          >
            <Text
              style={[styles.tabBtnText, mode === "login" && styles.tabBtnTextActive]}
            >
              Log In
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabBtn, mode === "signup" && styles.tabBtnActive]}
            onPress={() => {
              setError("");
              setMode("signup");
            }}
          >
            <Text
              style={[
                styles.tabBtnText,
                mode === "signup" && styles.tabBtnTextActive,
              ]}
            >
              Sign Up
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.form}>
          {mode === "signup" && (
            <View>
              <Text style={styles.label}>Full Name</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. John Doe"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="words"
                value={name}
                onChangeText={setName}
              />
            </View>
          )}

          <Text style={styles.label}>Email Address</Text>
          <TextInput
            style={styles.input}
            placeholder="you@example.com"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />

          <Text style={styles.label}>Password</Text>
          <View style={styles.passwordContainer}>
            <TextInput
              style={styles.passwordInput}
              placeholder="••••••••"
              placeholderTextColor={colors.textMuted}
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={setPassword}
            />
            <TouchableOpacity
              style={styles.eyeBtn}
              onPress={() => setShowPassword(!showPassword)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons
                name={showPassword ? "eye-off-outline" : "eye-outline"}
                size={20}
                color={colors.textMuted}
              />
            </TouchableOpacity>
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={handleSubmit}
            disabled={loading}
          >
            <Text style={styles.primaryBtnText}>
              {loading
                ? "Please wait..."
                : mode === "login"
                ? "Log In"
                : "Create Account"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.googleBtn}
            onPress={async () => {
              setError("");
              setLoading(true);
              try {
                await signInWithGoogle();
              } catch (err) {
                setError(err.message || "Google sign-in was cancelled or failed.");
              } finally {
                setLoading(false);
              }
            }}
            disabled={loading}
          >
            <Ionicons name="logo-google" size={17} color="#EA4335" />
            <Text style={styles.googleBtnText}>Continue with Google</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.hint}>
          Fast & secure login. New residents are welcomed instantly!
        </Text>
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
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  header: {
    alignItems: "center",
    marginBottom: 24,
  },
  logoCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: colors.text,
  },
  subtitle: {
    fontSize: 13.5,
    color: colors.textMuted,
    marginTop: 4,
    textAlign: "center",
    paddingHorizontal: 16,
  },
  tabSwitch: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 20,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 8,
  },
  tabBtnActive: {
    backgroundColor: colors.primary,
  },
  tabBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.textMuted,
  },
  tabBtnTextActive: {
    color: "#fff",
  },
  form: {},
  label: {
    fontSize: 13,
    color: colors.text,
    fontWeight: "600",
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    color: colors.text,
  },
  passwordContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    color: colors.text,
  },
  eyeBtn: {
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  error: {
    color: colors.danger,
    fontSize: 13,
    marginTop: 10,
    textAlign: "center",
  },
  primaryBtn: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 22,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  primaryBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15,
  },
  googleBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingVertical: 13,
    marginTop: 12,
    backgroundColor: colors.surface,
  },
  googleBtnText: {
    color: colors.text,
    fontWeight: "600",
    fontSize: 14,
  },
  hint: {
    textAlign: "center",
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 24,
  },
});
