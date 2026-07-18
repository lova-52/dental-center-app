// File: src/context/AuthContext.jsx

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { supabase } from '../lib/supabase';
import { getDeviceLabel, getOrCreateDeviceId } from '../lib/device';
import { setAuthNotice } from '../lib/authNotice';

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

  const forceLocalLogout = useCallback(
    async (reason = 'Phiên đăng nhập đã bị kết thúc.') => {
      try {
        setAuthNotice(reason);
        await supabase.auth.signOut({ scope: 'local' });
      } catch (error) {
        console.error('Local sign out error:', error);
      } finally {
        resetAuthState();
      }
    },
    [resetAuthState]
  );

  const syncCurrentSession = useCallback(
    async ({ silent = true } = {}) => {
      if (syncInProgressRef.current) {
        return { user: null, role: null, ok: false };
      }

      syncInProgressRef.current = true;

      try {
        if (!silent && !mountedRef.current) {
          setLoading(true);
        }

        const deviceId = getOrCreateDeviceId();
        const deviceLabel = getDeviceLabel();
        const now = new Date().toISOString();

        const { data: sessionData, error: sessionError } =
          await supabase.auth.getSession();

        if (sessionError || !sessionData?.session) {
          resetAuthState();
          return { user: null, role: null, ok: false };
        }

        const { data: userData, error: userError } =
          await supabase.auth.getUser();

        const liveUser = userData?.user;

        if (userError || !liveUser) {
          await forceLocalLogout('Không thể xác thực phiên đăng nhập.');
          return { user: null, role: null, ok: false };
        }

        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role, active_device_id')
          .eq('id', liveUser.id)
          .maybeSingle();

        if (profileError || !profile) {
          await forceLocalLogout('Không tìm thấy hồ sơ người dùng.');
          return { user: null, role: null, ok: false };
        }

        if (
          profile.active_device_id &&
          profile.active_device_id !== deviceId
        ) {
          await forceLocalLogout(
            'Tài khoản này vừa được đăng nhập ở thiết bị khác. Phiên hiện tại đã bị đăng xuất.'
          );

          return { user: null, role: null, ok: false };
        }

        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            active_device_id: profile.active_device_id || deviceId,
            active_device_name: deviceLabel,
            last_seen_at: now,
            ...(profile.active_device_id ? {} : { last_login_at: now }),
          })
          .eq('id', liveUser.id);

        if (updateError) {
          await forceLocalLogout(
            'Không thể đồng bộ trạng thái thiết bị đăng nhập.'
          );

          return { user: null, role: null, ok: false };
        }

        setUser(liveUser);
        setRole(profile.role || null);

        return {
          user: liveUser,
          role: profile.role || null,
          ok: true,
        };
      } catch (error) {
        console.error('Auth sync error:', error);

        resetAuthState();

        return {
          user: null,
          role: null,
          ok: false,
        };
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
      if (document.visibilityState === 'visible') {
        syncCurrentSession({ silent: true });
      }
    };

    const intervalId = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        syncCurrentSession({ silent: true });
      }
    }, CHECK_INTERVAL_MS);

    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      authListener.subscription.unsubscribe();
      window.removeEventListener('focus', onFocus);
      document.removeEventListener(
        'visibilitychange',
        onVisibilityChange
      );
      window.clearInterval(intervalId);
    };
  }, [resetAuthState, syncCurrentSession]);

  const value = {
    user,
    role,
    loading,
    refreshAuth: syncCurrentSession,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);