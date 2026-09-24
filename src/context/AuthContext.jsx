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


  /*
   * Không dùng boolean lock đơn giản nữa.
   *
   * syncPromiseRef chứa promise hiện tại.
   *
   * Nếu Login.jsx và onAuthStateChange
   * cùng gọi refreshAuth(), cả hai sẽ
   * chờ cùng một lần sync thay vì một
   * bên nhận ok:false.
   */

  const syncPromiseRef =
    useRef(null);

  const mountedRef =
    useRef(false);


  // =========================================================
  // RESET
  // =========================================================

  const resetAuthState =
    useCallback(() => {
      setUser(null);
      setRole(null);
      setProfile(null);
      setLoading(false);
    }, []);


  // =========================================================
  // LOCAL LOGOUT
  // =========================================================

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


          await supabase.auth.signOut({
            scope: 'local',
          });
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


  // =========================================================
  // REGISTER / REACTIVATE DEVICE
  // =========================================================

  const registerOrReactivateDevice =
    useCallback(
      async (liveUser) => {
        const device =
          getDeviceInfo();


        if (!device.deviceId) {
          throw new Error(
            'Không xác định được thiết bị.'
          );
        }


        const now =
          new Date().toISOString();


        /*
         * Kiểm tra record hiện tại.
         */

        const {
          data: existingDevice,
          error: existingError,
        } =
          await supabase
            .from('login_devices')
            .select(`
              id,
              device_id,
              device_type,
              device_name,
              os_name,
              browser_name,
              location_city,
              location_country,
              location_label,
              first_login_at,
              last_login_at,
              last_seen_at,
              is_active,
              revoked_at
            `)
            .eq(
              'user_id',
              liveUser.id
            )
            .eq(
              'device_id',
              device.deviceId
            )
            .maybeSingle();


        if (existingError) {
          throw existingError;
        }


        // -----------------------------------------------------
        // DEVICE ALREADY EXISTS
        // -----------------------------------------------------

        if (existingDevice) {

          /*
           * revoked_at != null
           *
           * Đây là thiết bị bị người dùng
           * đăng xuất từ một thiết bị khác.
           *
           * Không tự động kích hoạt lại.
           */

          if (
            existingDevice.revoked_at
          ) {
            throw new Error(
              'Thiết bị này đã bị đăng xuất khỏi tài khoản. Vui lòng đăng nhập bằng thiết bị khác hoặc liên hệ quản trị viên.'
            );
          }


          /*
           * Logout bình thường:
           *
           * is_active = false
           * revoked_at = null
           *
           * Cho phép đăng nhập lại.
           */

          const {
            data,
            error,
          } =
            await supabase
              .from('login_devices')
              .update({
                device_type:
                  device.deviceType,

                device_name:
                  device.deviceName,

                os_name:
                  device.osName,

                browser_name:
                  device.browserName,

                last_login_at:
                  now,

                last_seen_at:
                  now,

                is_active:
                  true,

                revoked_at:
                  null,
              })
              .eq(
                'id',
                existingDevice.id
              )
              .eq(
                'user_id',
                liveUser.id
              )
              .select()
              .single();


          if (error) {
            throw error;
          }


          return data;
        }


        // -----------------------------------------------------
        // NEW DEVICE
        // -----------------------------------------------------

        /*
         * Chỉ thiết bị mới mới cần
         * gọi API xác định location.
         */

        const location =
          await getDeviceLocation();


        const {
          data,
          error,
        } =
          await supabase
            .from('login_devices')
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


  // =========================================================
  // HEARTBEAT
  // =========================================================

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
            .from('login_devices')
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


  // =========================================================
  // SYNC INTERNAL
  // =========================================================

  const syncCurrentSessionInternal =
    useCallback(
      async ({
        silent = true,
      } = {}) => {

        if (
          !silent &&
          !mountedRef.current
        ) {
          setLoading(true);
        }


        // -----------------------------------------------------
        // SESSION
        // -----------------------------------------------------

        const {
          data: sessionData,
          error: sessionError,
        } =
          await supabase.auth.getSession();


        if (
          sessionError
        ) {
          console.error(
            'Get session error:',
            sessionError
          );

          resetAuthState();

          return {
            user: null,
            role: null,
            profile: null,
            ok: false,
            error:
              sessionError,
          };
        }


        if (
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


        // -----------------------------------------------------
        // USER
        // -----------------------------------------------------

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
          const error =
            userError ||
            new Error(
              'Không thể xác thực người dùng.'
            );


          console.error(
            'Get user error:',
            error
          );


          await forceLocalLogout(
            'Không thể xác thực phiên đăng nhập.'
          );


          return {
            user: null,
            role: null,
            profile: null,
            ok: false,
            error,
          };
        }


        // -----------------------------------------------------
        // PROFILE
        // -----------------------------------------------------

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
          const error =
            profileError ||
            new Error(
              'Không tìm thấy hồ sơ người dùng.'
            );


          console.error(
            'Profile sync error:',
            error
          );


          await forceLocalLogout(
            'Không tìm thấy hồ sơ người dùng.'
          );


          return {
            user: null,
            role: null,
            profile: null,
            ok: false,
            error,
          };
        }


        // -----------------------------------------------------
        // DEVICE
        // -----------------------------------------------------

        try {
          await registerOrReactivateDevice(
            liveUser
          );
        } catch (deviceError) {
          console.error(
            'Device synchronization error:',
            deviceError
          );


          await forceLocalLogout(
            deviceError?.message ||
              'Không thể đồng bộ thiết bị đăng nhập.'
          );


          return {
            user: null,
            role: null,
            profile: null,
            ok: false,
            error:
              deviceError,
          };
        }


        // -----------------------------------------------------
        // HEARTBEAT
        // -----------------------------------------------------

        await updateDeviceHeartbeat(
          liveUser.id
        );


        // -----------------------------------------------------
        // STATE
        // -----------------------------------------------------

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
      },
      [
        forceLocalLogout,
        registerOrReactivateDevice,
        resetAuthState,
        updateDeviceHeartbeat,
      ]
    );


  // =========================================================
  // PUBLIC SYNC
  // =========================================================

  const syncCurrentSession =
    useCallback(
      async ({
        silent = true,
      } = {}) => {

        /*
         * Nếu đang có sync:
         *
         * KHÔNG return false.
         *
         * Chờ đúng promise đang chạy.
         */

        if (
          syncPromiseRef.current
        ) {
          return syncPromiseRef.current;
        }


        const promise =
          (async () => {
            try {
              return await syncCurrentSessionInternal({
                silent,
              });
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
                error,
              };
            } finally {
              setLoading(false);
            }
          })();


        syncPromiseRef.current =
          promise;


        try {
          return await promise;
        } finally {
          if (
            syncPromiseRef.current ===
            promise
          ) {
            syncPromiseRef.current =
              null;
          }
        }
      },
      [
        resetAuthState,
        syncCurrentSessionInternal,
      ]
    );


  // =========================================================
  // UPDATE PROFILE
  // =========================================================

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


  // =========================================================
  // LOGOUT CURRENT DEVICE
  // =========================================================

  const signOut =
    useCallback(
      async () => {
        try {
          const deviceId =
            getOrCreateDeviceId();


          /*
           * LOGOUT BÌNH THƯỜNG
           *
           * Không set revoked_at.
           *
           * Vì người dùng vẫn được phép
           * đăng nhập lại trên chính thiết bị.
           */

          if (
            user?.id &&
            deviceId
          ) {
            const {
              error,
            } =
              await supabase
                .from(
                  'login_devices'
                )
                .update({
                  is_active:
                    false,

                  revoked_at:
                    null,

                  last_seen_at:
                    new Date().toISOString(),
                })
                .eq(
                  'user_id',
                  user.id
                )
                .eq(
                  'device_id',
                  deviceId );


            if (error) {
              console.error(
                'Device logout update error:',
                error
              );
            }
          }


          /*
           * CHỈ logout session hiện tại.
           *
           * Không ảnh hưởng thiết bị khác.
           */

          const {
            error: signOutError,
          } =
            await supabase.auth.signOut({
              scope: 'local',
            });


          if (signOutError) {
            throw signOutError;
          }
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


  // =========================================================
  // INITIAL AUTH
  // =========================================================

  useEffect(() => {
    let mounted = true;


    const initialize =
      async () => {
        if (!mounted) {
          return;
        }


        await syncCurrentSession({
          silent: false,
        });
      };


    initialize();


    // -------------------------------------------------------
    // SUPABASE AUTH LISTENER
    // -------------------------------------------------------

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
                syncCurrentSession({
                  silent: true,
                });
              }
            },
            0
          );
        }
      );


    // -------------------------------------------------------
    // FOCUS
    // -------------------------------------------------------

    const onFocus =
      () => {
        syncCurrentSession({
          silent: true,
        });
      };


    // -------------------------------------------------------
    // VISIBILITY
    // -------------------------------------------------------

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


    // -------------------------------------------------------
    // HEARTBEAT
    // -------------------------------------------------------

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


  // =========================================================
  // CONTEXT VALUE
  // =========================================================

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