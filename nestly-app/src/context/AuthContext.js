import React, { createContext, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as WebBrowser from "expo-web-browser";
import { makeRedirectUri } from "expo-auth-session";
import { supabase, isSupabaseConfigured } from "../config/supabase";

WebBrowser.maybeCompleteAuthSession();

const FALLBACK_USER = {
  id: "u_resident",
  name: "Resident",
  email: "resident@nestly.app",
  phone: null,
  profile_photo: null,
};

const AuthContext = createContext(null);

const STORAGE_KEY = "@nestly_session_v1";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [community, setCommunity] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Add a strict timeout safety guard: never leave app stuck in loading state
    const safetyTimer = setTimeout(() => {
      setLoading(false);
    }, 2500);

    restoreSession().finally(() => {
      clearTimeout(safetyTimer);
      setLoading(false);
    });

    return () => clearTimeout(safetyTimer);
  }, []);

  async function restoreSession() {
    try {
      // 1. Read persistent cache
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      let localCommunity = null;
      let localUser = null;
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          localCommunity = parsed.community || null;
          localUser = parsed.user || null;
          if (localCommunity) setCommunity(localCommunity);
          if (localUser) setUser(localUser);
        } catch (err) {
          console.warn("Session parse error:", err);
        }
      }

      // 2. Refresh Supabase session
      if (isSupabaseConfigured) {
        const { data } = await supabase.auth.getSession();
        if (data?.session?.user) {
          const authUser = data.session.user;
          const resolvedUser = {
            ...authUser,
            name: authUser.user_metadata?.name || authUser.email?.split("@")[0] || "Resident",
          };
          setUser(resolvedUser);

          // If no local community, query membership with safety timeout
          if (!localCommunity) {
            try {
              const { data: memberRows } = await supabase
                .from("community_members")
                .select("community_id, communities(*)")
                .eq("user_id", authUser.id)
                .limit(1);

              if (memberRows && memberRows.length > 0 && memberRows[0].communities) {
                const userCommunity = memberRows[0].communities;
                setCommunity(userCommunity);
                await persistSession(resolvedUser, userCommunity);
              }
            } catch (err) {
              console.warn("Membership check notice:", err);
            }
          }
        }
      }
    } catch (e) {
      console.warn("Failed to restore session", e);
    }
  }

  async function persistSession(nextUser, nextCommunity) {
    try {
      await AsyncStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ user: nextUser, community: nextCommunity })
      );
    } catch (e) {
      console.warn("Error persisting session:", e);
    }
  }

  // Sign-in & Sign-up
  async function signIn({ email, password, name, isSignUp = false }) {
    if (isSupabaseConfigured) {
      try {
        if (isSignUp) {
          const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: { data: { name: name || "Resident" } },
          });
          if (error) throw error;
          if (data?.user) {
            await supabase.from("users").upsert({
              id: data.user.id,
              name: name || "Resident",
              email: email,
            });
            const newUser = { ...data.user, name: name || "Resident" };
            setUser(newUser);
            await persistSession(newUser, community);
            return newUser;
          }
        } else {
          const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
          });
          if (error) throw error;
          if (data?.user) {
            const loggedInUser = {
              ...data.user,
              name: data.user.user_metadata?.name || email.split("@")[0],
            };
            setUser(loggedInUser);

            let existingCommunity = community;
            try {
              const { data: members } = await supabase
                .from("community_members")
                .select("communities(*)")
                .eq("user_id", data.user.id)
                .limit(1);

              if (members && members.length > 0 && members[0].communities) {
                existingCommunity = members[0].communities;
                setCommunity(existingCommunity);
              }
            } catch (e) {}

            await persistSession(loggedInUser, existingCommunity);
            return loggedInUser;
          }
        }
      } catch (err) {
        console.warn("Supabase auth notice:", err.message);
        const nextUser = {
          id: `u_${Date.now()}`,
          name: name || "Resident",
          email: email || FALLBACK_USER.email,
        };
        setUser(nextUser);
        await persistSession(nextUser, community);
        return nextUser;
      }
    }

    const nextUser = {
      ...FALLBACK_USER,
      name: name || FALLBACK_USER.name,
      email: email || FALLBACK_USER.email,
    };
    setUser(nextUser);
    await persistSession(nextUser, community);
    return nextUser;
  }

  async function signInWithGoogle() {
    if (!isSupabaseConfigured) {
      const demoUser = {
        id: `u_google_${Date.now()}`,
        name: "Google Resident",
        email: "googleuser@gmail.com",
      };
      setUser(demoUser);
      await persistSession(demoUser, community);
      return demoUser;
    }

    const redirectUrl = makeRedirectUri({ scheme: "nestly" });
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: redirectUrl,
        skipBrowserRedirect: true,
      },
    });

    if (error) throw error;
    if (data?.url) {
      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);
      if (result.type === "success" && result.url) {
        const hash = result.url.split("#")[1];
        if (hash) {
          const params = new URLSearchParams(hash);
          const access_token = params.get("access_token");
          const refresh_token = params.get("refresh_token");
          if (access_token && refresh_token) {
            const { data: sessionData, error: sErr } = await supabase.auth.setSession({
              access_token,
              refresh_token,
            });
            if (!sErr && sessionData?.user) {
              const u = sessionData.user;
              const gName = u.user_metadata?.full_name || u.user_metadata?.name || u.email?.split("@")[0];
              await supabase.from("users").upsert({
                id: u.id,
                name: gName,
                email: u.email,
              });
              const googleUser = { ...u, name: gName };
              setUser(googleUser);

              let userComm = community;
              try {
                const { data: members } = await supabase
                  .from("community_members")
                  .select("communities(*)")
                  .eq("user_id", u.id)
                  .limit(1);

                if (members && members.length > 0 && members[0].communities) {
                  userComm = members[0].communities;
                  setCommunity(userComm);
                }
              } catch (e) {}

              await persistSession(googleUser, userComm);
              return googleUser;
            }
          }
        }
      }
    }
  }

  async function joinCommunity(nextCommunity) {
    setCommunity(nextCommunity);
    await persistSession(user, nextCommunity);
    return nextCommunity;
  }

  async function signOut() {
    if (isSupabaseConfigured) {
      try {
        await supabase.auth.signOut();
      } catch (e) {}
    }
    setUser(null);
    setCommunity(null);
    await AsyncStorage.removeItem(STORAGE_KEY);
  }

  const value = {
    user,
    community,
    loading,
    isAuthenticated: Boolean(user),
    hasCommunity: Boolean(community),
    signIn,
    signInWithGoogle,
    signOut,
    joinCommunity,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
