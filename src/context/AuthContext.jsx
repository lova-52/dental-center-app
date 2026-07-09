// File: src/context/AuthContext.jsx

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { supabase } from "../lib/supabase";
import { getDeviceLabel, getOrCreateDeviceId } from "../lib/device";

const AuthContext = createContext(null);

const CHECK_INTERVAL_MS = 15 * 1000;

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  const syncInProgressRef = useRef(false);
  const mountedRef = useRef(false);

  const resetAuthState = useCallback(() => {
    setUser(null);
    setRole(null);
    setLoading(false);
  }, []);

  const forceLocalLogout = useCallback(async () => {
    try {
      await supabase.auth.signOut({ scope: "local" });
    } catch (error) {
      console.error("Local sign out error:", error);
    } finally {
      resetAuthState();
    }
  }, [resetAuthState]);

  const syncCurrentSession = useCallback(
    async ({ silent = true } = {}) => {
      if (syncInProgressRef.current) return;

      syncInProgressRef.current = true;

      try {
        if (!silent && !mountedRef.current) {
          setLoading(true);
        }

        const deviceId = getOrCreateDeviceId();
        const deviceLabel = getDeviceLabel();
        const now = new Date().toISOString();

        // Get current session
        const {
          data: sessionData,
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError || !sessionData?.session) {
          resetAuthState();
          return;
        }

        // Get authenticated user
        const {
          data: userData,
          error: userError,
        } = await supabase.auth.getUser();

        const liveUser = userData?.user;

        if (userError || !liveUser) {
          await forceLocalLogout();
          return;
        }

        // Get user profile
        const {
          data: profile,
          error: profileError,
        } = await supabase
          .from("profiles")
          .select("role, active_device_id")
          .eq("id", liveUser.id)
          .maybeSingle();

        if (profileError || !profile) {
          await forceLocalLogout();
          return;
        }

        // Another device is currently active
        if (
          profile.active_device_id &&
          profile.active_device_id !== deviceId
        ) {
          await forceLocalLogout();
          return;
        }

        // Update device information
        const { error: updateError } = await supabase
          .from("profiles")
          .update({
            active_device_id: profile.active_device_id || deviceId,
            active_device_name: deviceLabel,
            last_seen_at: now,
            ...(profile.active_device_id
              ? {}
              : {
                  last_login_at: now,
                }),
          })
          .eq("id", liveUser.id);

        if (updateError) {
          await forceLocalLogout();
          return;
        }

        setUser(liveUser);
        setRole(profile.role || null);
      } catch (error) {
        console.error("Auth sync error:", error);
        resetAuthState();
      } finally {
        mountedRef.current = true;
        setLoading(false);
        syncInProgressRef.current = false;
      }
    },
    [forceLocalLogout, resetAuthState]
  );

  useEffect(() => {
    syncCurrentSession({ silent: false });

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!session) {
          resetAuthState();
          return;
        }

        syncCurrentSession({ silent: true });
      }
    );

    const onFocus = () => {
      syncCurrentSession({ silent: true });
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        syncCurrentSession({ silent: true });
      }
    };

    const intervalId = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        syncCurrentSession({ silent: true });
      }
    }, CHECK_INTERVAL_MS);

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      authListener.subscription.unsubscribe();

      window.removeEventListener("focus", onFocus);
      document.removeEventListener(
        "visibilitychange",
        onVisibilityChange
      );

      window.clearInterval(intervalId);
    };
  }, [resetAuthState, syncCurrentSession]);

  const value = {
    user,
    role,
    loading,
    refreshAuth: () => syncCurrentSession({ silent: true }),
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);