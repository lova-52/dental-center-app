// src/context/AuthContext.jsx

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';

import { supabase } from '../lib/supabase';

import {
  getDeviceInfo,
  getOrCreateDeviceId,
} from '../lib/device';

import {
  getDeviceLocation,
} from '../lib/location';

import {
  setAuthNotice,
} from '../lib/authNotice';


const AuthContext =
  createContext(null);


const CHECK_INTERVAL_MS =
  30 * 1000;


export const AuthProvider = ({
  children,
}) => {
  const [user, setUser] =
    useState(null);

  const [role, setRole] =
    useState(null);

  const [profile, setProfile] =
    useState(null);

  const [loading, setLoading] =
    useState(true);


  const syncInProgressRef =
    useRef(false);

  const mountedRef =
    useRef(false);


  const resetAuthState =
    useCallback(() => {
      setUser(null);
      setRole(null);
      setProfile(null);
      setLoading(false);
    }, []);


  const forceLocalLogout =
    useCallback(
      async (
        reason =
          'Phiên đăng nhập đã kết thúc.'
      ) => {
        try {
          setAuthNotice(
            reason
          );

          await supabase.auth.signOut(
            {
              scope: 'local',
            }
          );
        } catch (error) {
          console.error(
            'Local sign out error:',
            error
          );
        } finally {
          resetAuthState();
        }
      },
      [resetAuthState]
    );


  /*
   * Đăng ký thiết bị mới.
   *
   * Chỉ gọi location khi:
   * - thiết bị chưa tồn tại
   * - hoặc user vừa đăng nhập
   *
   * Không gọi location trong heartbeat.
   */

  const registerNewDevice =
    useCallback(
      async (liveUser) => {
        const device =
          getDeviceInfo();

        if (!device.deviceId) {
          throw new Error(
            'Không xác định được thiết bị.'
          );
        }


        const location =
          await getDeviceLocation();


        const now =
          new Date().toISOString();


        const {
          data,
          error,
        } =
          await supabase
            .from(
              'login_devices'
            )
            .insert({
              user_id:
                liveUser.id,

              device_id:
                device.deviceId,

              device_type:
                device.deviceType,

              device_name:
                device.deviceName,

              os_name:
                device.osName,

              browser_name:
                device.browserName,

              location_city:
                location.city,

              location_country:
                location.country,

              location_label:
                location.label,

              first_login_at:
                now,

              last_login_at:
                now,

              last_seen_at:
                now,

              is_active:
                true,

              revoked_at:
                null,
            })
            .select()
            .single();


        if (error) {
          throw error;
        }


        return data;
      },
      []
    );


  /*
   * Heartbeat.
   *
   * Chỉ cập nhật last_seen_at.
   * Không gọi API vị trí.
   */

  const updateDeviceHeartbeat =
    useCallback(
      async (userId) => {
        const deviceId =
          getOrCreateDeviceId();

        if (
          !userId ||
          !deviceId
        ) {
          return;
        }


        const {
          error,
        } =
          await supabase
            .from(
              'login_devices'
            )
            .update({
              last_seen_at:
                new Date().toISOString(),
            })
            .eq(
              'user_id',
              userId
            )
            .eq(
              'device_id',
              deviceId
            )
            .eq(
              'is_active',
              true
            );


        if (error) {
          console.error(
            'Device heartbeat error:',
            error
          );
        }
      },
      []
    );


  const syncCurrentSession =
    useCallback(
      async ({
        silent = true,
      } = {}) => {
        if (
          syncInProgressRef.current
        ) {
          return {
            user: null,
            role: null,
            profile: null,
            ok: false,
          };
        }


        syncInProgressRef.current =
          true;


        try {
          if (
            !silent &&
            !mountedRef.current
          ) {
            setLoading(true);
          }


          /*
           * Session
           */

          const {
            data: sessionData,
            error: sessionError,
          } =
            await supabase.auth.getSession();


          if (
            sessionError ||
            !sessionData?.session
          ) {
            resetAuthState();

            return {
              user: null,
              role: null,
              profile: null,
              ok: false,
            };
          }


          /*
           * User
           */

          const {
            data: userData,
            error: userError,
          } =
            await supabase.auth.getUser();


          const liveUser =
            userData?.user;


          if (
            userError ||
            !liveUser
          ) {
            await forceLocalLogout(
              'Không thể xác thực phiên đăng nhập.'
            );

            return {
              user: null,
              role: null,
              profile: null,
              ok: false,
            };
          }


          /*
           * Profile
           */

          const {
            data: userProfile,
            error: profileError,
          } =
            await supabase
              .from('profiles')
              .select(
                'id, full_name, role, avatar_url'
              )
              .eq(
                'id',
                liveUser.id
              )
              .maybeSingle();


          if (
            profileError ||
            !userProfile
          ) {
            await forceLocalLogout(
              'Không tìm thấy hồ sơ người dùng.'
            );

            return {
              user: null,
              role: null,
              profile: null,
              ok: false,
            };
          }


          /*
           * Device
           */

          const deviceId =
            getOrCreateDeviceId();


          const {
            data: deviceRecord,
            error: deviceError,
          } =
            await supabase
              .from(
                'login_devices'
              )
              .select(
                'id, device_id, is_active, revoked_at'
              )
              .eq(
                'user_id',
                liveUser.id
              )
              .eq(
                'device_id',
                deviceId
              )
              .maybeSingle();


          if (deviceError) {
            console.error(
              'Device check error:',
              deviceError
            );

            await forceLocalLogout(
              'Không thể kiểm tra thiết bị đăng nhập.'
            );

            return {
              user: null,
              role: null,
              profile: null,
              ok: false,
            };
          }


          /*
           * Thiết bị chưa có trong database.
           */

          if (!deviceRecord) {
            try {
              await registerNewDevice(
                liveUser
              );
            } catch (error) {
              console.error(
                'Device registration error:',
                error
              );

              await forceLocalLogout(
                'Không thể đăng ký thiết bị đăng nhập.'
              );

              return {
                user: null,
                role: null,
                profile: null,
                ok: false,
              };
            }
          }


          /*
           * Thiết bị đã bị revoke.
           */

          if (
            deviceRecord &&
            (
              deviceRecord.is_active ===
                false ||
              deviceRecord.revoked_at
            )
          ) {
            await forceLocalLogout(
              'Thiết bị này đã được đăng xuất khỏi tài khoản.'
            );

            return {
              user: null,
              role: null,
              profile: null,
              ok: false,
            };
          }


          /*
           * Heartbeat.
           */

          await updateDeviceHeartbeat(
            liveUser.id
          );


          /*
           * React state.
           */

          setUser(liveUser);

          setRole(
            userProfile.role ||
              null
          );

          setProfile(
            userProfile
          );


          return {
            user: liveUser,
            role:
              userProfile.role ||
              null,
            profile:
              userProfile,
            ok: true,
          };
        } catch (error) {
          console.error(
            'Auth sync error:',
            error
          );

          resetAuthState();

          return {
            user: null,
            role: null,
            profile: null,
            ok: false,
          };
        } finally {
          mountedRef.current =
            true;

          setLoading(false);

          syncInProgressRef.current =
            false;
        }
      },
      [
        forceLocalLogout,
        registerNewDevice,
        resetAuthState,
        updateDeviceHeartbeat,
      ]
    );


  /*
   * Update profile
   */

  const updateProfile =
    useCallback(
      async ({
        full_name,
      }) => {
        if (!user?.id) {
          return {
            ok: false,
            error:
              new Error(
                'Chưa đăng nhập.'
              ),
          };
        }


        const cleanName =
          String(
            full_name || ''
          ).trim();


        if (!cleanName) {
          return {
            ok: false,
            error:
              new Error(
                'Họ tên không được để trống.'
              ),
          };
        }


        const {
          data,
          error,
        } =
          await supabase
            .from('profiles')
            .update({
              full_name:
                cleanName,
            })
            .eq(
              'id',
              user.id
            )
            .select(
              'id, full_name, role, avatar_url'
            )
            .single();


        if (error) {
          return {
            ok: false,
            error,
          };
        }


        setProfile(data);


        return {
          ok: true,
          profile: data,
        };
      },
      [user]
    );


  /*
   * Logout current device
   */

  const signOut =
    useCallback(
      async () => {
        try {
          const deviceId =
            getOrCreateDeviceId();


          if (
            user?.id &&
            deviceId
          ) {
            await supabase
              .from(
                'login_devices'
              )
              .update({
                is_active:
                  false,

                revoked_at:
                  new Date().toISOString(),
              })
              .eq(
                'user_id',
                user.id
              )
              .eq(
                'device_id',
                deviceId
              );
          }


          await supabase.auth.signOut(
            {
              scope: 'local',
            }
          );
        } catch (error) {
          console.error(
            'Sign out error:',
            error
          );
        } finally {
          resetAuthState();
        }
      },
      [
        resetAuthState,
        user,
      ]
    );


  /*
   * Initial auth
   */

  useEffect(() => {
    let mounted = true;


    const initialize =
      async () => {
        if (!mounted) {
          return;
        }

        await syncCurrentSession(
          {
            silent: false,
          }
        );
      };


    initialize();


    /*
     * Supabase listener
     */

    const {
      data: authListener,
    } =
      supabase.auth.onAuthStateChange(
        (
          event,
          session
        ) => {
          window.setTimeout(
            () => {
              if (!mounted) {
                return;
              }


              if (!session) {
                resetAuthState();
                return;
              }


              if (
                event ===
                  'SIGNED_IN' ||
                event ===
                  'TOKEN_REFRESHED' ||
                event ===
                  'INITIAL_SESSION'
              ) {
                syncCurrentSession(
                  {
                    silent: true,
                  }
                );
              }
            },
            0
          );
        }
      );


    /*
     * Focus
     */

    const onFocus =
      () => {
        syncCurrentSession({
          silent: true,
        });
      };


    /*
     * Visibility
     */

    const onVisibilityChange =
      () => {
        if (
          document.visibilityState ===
          'visible'
        ) {
          syncCurrentSession({
            silent: true,
          });
        }
      };


    /*
     * Heartbeat
     */

    const intervalId =
      window.setInterval(
        () => {
          if (
            document.visibilityState ===
            'visible'
          ) {
            syncCurrentSession({
              silent: true,
            });
          }
        },
        CHECK_INTERVAL_MS
      );


    window.addEventListener(
      'focus',
      onFocus
    );


    document.addEventListener(
      'visibilitychange',
      onVisibilityChange
    );


    return () => {
      mounted = false;

      authListener?.subscription?.unsubscribe();

      window.removeEventListener(
        'focus',
        onFocus
      );

      document.removeEventListener(
        'visibilitychange',
        onVisibilityChange
      );

      window.clearInterval(
        intervalId
      );
    };
  }, [
    resetAuthState,
    syncCurrentSession,
  ]);


  const value = {
    user,
    role,
    profile,
    loading,

    refreshAuth:
      syncCurrentSession,

    updateProfile,

    signOut,
  };


  return (
    <AuthContext.Provider
      value={value}
    >
      {children}
    </AuthContext.Provider>
  );
};


export const useAuth = () =>
  useContext(AuthContext);