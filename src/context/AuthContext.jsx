import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { siteUrl, supabase } from "../lib/supabaseClient";
import { ADMIN_EMAIL, ROLE_HOME } from "../lib/constants";

const AuthContext = createContext(null);
const AUTH_REQUEST_TIMEOUT_MS = 10000;

const withTimeout = async (promise, timeoutMs, message) => {
  let timeoutId;
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        timeoutId = window.setTimeout(() => reject(new Error(message)), timeoutMs);
      })
    ]);
  } finally {
    if (timeoutId) {
      window.clearTimeout(timeoutId);
    }
  }
};

export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);

  const getStudentByUserId = async (userId) =>
    supabase.from("students").select("*").eq("user_id", userId).maybeSingle();

  const loadProfile = async (authUser) => {
    if (!authUser) {
      setRole(null);
      setStudent(null);
      return;
    }

    if (authUser.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
      setRole("admin");
      setStudent(null);
      return;
    }

    const { data, error } = await getStudentByUserId(authUser.id);

    if (data && !error) {
      setRole("student");
      setStudent(data);
      return;
    }

    const { data: claimedProfile, error: claimError } = await supabase.rpc(
      "claim_student_profile"
    );
    if (!claimError && claimedProfile) {
      const claimed =
        Array.isArray(claimedProfile) ? claimedProfile[0] : claimedProfile;
      if (claimed) {
        setRole("student");
        setStudent(claimed);
        return;
      }
    }

    setRole("unknown");
    setStudent(null);
  };

  const loadProfileSafe = async (authUser) => {
    try {
      await withTimeout(
        loadProfile(authUser),
        AUTH_REQUEST_TIMEOUT_MS,
        "Profile request timed out."
      );
    } catch (error) {
      console.error("Profile load failed", error);
      setRole(authUser ? "unknown" : null);
      setStudent(null);
    }
  };

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        const { data, error } = await withTimeout(
          supabase.auth.getSession(),
          AUTH_REQUEST_TIMEOUT_MS,
          "Session request timed out."
        );
        if (error) {
          throw error;
        }
        if (!mounted) return;
        setSession(data.session || null);
        setUser(data.session?.user || null);
        await loadProfileSafe(data.session?.user || null);
      } catch (error) {
        if (!mounted) return;
        console.error("Auth init failed", error);
        setSession(null);
        setUser(null);
        setRole(null);
        setStudent(null);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    init();

    const { data: listener } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        if (!mounted) return;
        setSession(newSession);
        setUser(newSession?.user || null);
        if (event === "TOKEN_REFRESHED") {
          return;
        }
        setLoading(true);
        try {
          await loadProfileSafe(newSession?.user || null);
        } finally {
          if (mounted) {
            setLoading(false);
          }
        }
      }
    );

    return () => {
      mounted = false;
      listener?.subscription?.unsubscribe();
    };
  }, []);

  const signInWithGoogle = async () =>
    supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${siteUrl}/`,
        skipBrowserRedirect: true
      }
    });

  const signInWithPassword = async ({ email, password }) =>
    supabase.auth.signInWithPassword({
      email: email?.trim().toLowerCase(),
      password
    });

  const signOut = async () => supabase.auth.signOut();

  const refreshProfile = async () => {
    if (!user) return;
    setLoading(true);
    try {
      await loadProfileSafe(user);
    } finally {
      setLoading(false);
    }
  };

  const value = useMemo(
    () => ({
      session,
      user,
      role,
      student,
      loading,
      signInWithGoogle,
      signInWithPassword,
      signOut,
      refreshProfile,
      roleHome: ROLE_HOME[role] || "/login"
    }),
    [session, user, role, student, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
