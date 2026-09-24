// src/pages/Login.jsx

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import {
  Eye,
  EyeOff,
  Lock,
  Mail,
  Stethoscope,
  AlertTriangle,
  X,
} from 'lucide-react';

import { useAuth } from '../context/AuthContext';

import {
  clearAuthNotice,
  getAuthNotice,
} from '../lib/authNotice';

import { supabase } from '../lib/supabase';


const Login = () => {
  const navigate = useNavigate();

  const {
    user,
    loading: authLoading,
    refreshAuth,
  } = useAuth();


  const [email, setEmail] =
    useState('');

  const [password, setPassword] =
    useState('');

  const [showPass, setShowPass] =
    useState(false);

  const [loading, setLoading] =
    useState(false);

  const [authNotice, setLocalAuthNotice] =
    useState(null);


  // =========================================================
  // AUTH NOTICE
  // =========================================================

  useEffect(() => {
    const notice =
      getAuthNotice();

    if (notice?.message) {
      setLocalAuthNotice(
        notice.message
      );

      clearAuthNotice();
    }
  }, []);


  // =========================================================
  // REDIRECT WHEN AUTHENTICATED
  // =========================================================

  useEffect(() => {
    if (
      !authLoading &&
      user
    ) {
      navigate('/', {
        replace: true,
      });
    }
  }, [
    authLoading,
    navigate,
    user,
  ]);


  // =========================================================
  // LOGIN
  // =========================================================

  const handleLogin = async (e) => {
    e.preventDefault();

    if (loading) {
      return;
    }

    setLoading(true);


    try {
      // -----------------------------------------------------
      // 1. Supabase login
      // -----------------------------------------------------

      const {
        data,
        error,
      } =
        await supabase.auth.signInWithPassword({
          email:
            email.trim(),

          password,
        });


      if (error) {
        alert(
          error.message ||
            'Đăng nhập không thành công.'
        );

        return;
      }


      const liveUser =
        data?.user;


      if (!liveUser) {
        await supabase.auth.signOut({
          scope: 'local',
        });

        alert(
          'Không thể xác thực người dùng.'
        );

        return;
      }


      /*
       * KHÔNG:
       *
       * - cập nhật active_device_id
       * - cập nhật active_device_name
       * - signOut({ scope: 'others' })
       *
       * Các logic này thuộc cơ chế 1 thiết bị
       * và đã bị loại bỏ.
       */


      // -----------------------------------------------------
      // 2. Đồng bộ auth + login_devices
      // -----------------------------------------------------

      const syncResult =
        await refreshAuth();


      if (
        syncResult?.ok &&
        syncResult?.user
      ) {
        clearAuthNotice();

        navigate('/', {
          replace: true,
        });

        return;
      }


      /*
       * Trường hợp Supabase đã login nhưng
       * đồng bộ profile/device thất bại.
       */

      console.error(
        'Login synchronization failed:',
        syncResult
      );


      /*
       * Không để session lỗi treo trong browser.
       */

      await supabase.auth.signOut({
        scope: 'local',
      });


      alert(
        syncResult?.error?.message ||
          'Đăng nhập thành công nhưng chưa đồng bộ được phiên. Vui lòng thử lại.'
      );
    } catch (err) {
      console.error(
        'Login error:',
        err
      );


      await supabase.auth.signOut({
        scope: 'local',
      });


      alert(
        err?.message ||
          'Có lỗi xảy ra khi đăng nhập.'
      );
    } finally {
      setLoading(false);
    }
  };


  // =========================================================
  // DISMISS NOTICE
  // =========================================================

  const dismissNotice = () => {
    setLocalAuthNotice(null);
    clearAuthNotice();
  };


  // =========================================================
  // RENDER
  // =========================================================

  return (
    <div className="flex min-h-screen min-h-[100dvh] items-center justify-center bg-gradient-to-br from-slate-100 via-sky-50 to-primary/5 px-4 py-8">

      <div className="w-full max-w-sm">

        {/* LOGO */}

        <div className="mb-8 text-center">

          <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-white shadow-lg shadow-primary/25">

            <Stethoscope className="h-8 w-8" />

          </div>


          <h1 className="text-2xl font-bold tracking-tight text-slate-800">
            Phương Sen Dental
          </h1>


          <p className="mt-1.5 text-sm text-slate-500">
            Đăng nhập vào hệ thống quản lý
          </p>

        </div>


        {/* CARD */}

        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-xl shadow-slate-200/60 sm:p-6">

          <h2 className="mb-1 text-base font-semibold text-slate-700">
            Chào mừng trở lại
          </h2>


          <p className="mb-4 text-xs text-slate-400">
            Nhập thông tin để tiếp tục
          </p>


          {/* AUTH NOTICE */}

          {authNotice && (
            <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-3 sm:p-4">

              <div className="flex items-start gap-3">

                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700">

                  <AlertTriangle className="h-4 w-4" />

                </div>


                <div className="min-w-0 flex-1">

                  <p className="text-sm font-semibold text-amber-900">
                    Phiên đăng nhập đã thay đổi
                  </p>


                  <p className="mt-1 text-xs leading-5 text-amber-800 sm:text-sm">
                    {authNotice}
                  </p>

                </div>


                <button
                  type="button"
                  onClick={
                    dismissNotice
                  }
                  className="rounded-lg p-1 text-amber-700 hover:bg-amber-100"
                  aria-label="Đóng thông báo"
                >

                  <X className="h-4 w-4" />

                </button>

              </div>

            </div>
          )}


          {/* FORM */}

          <form
            onSubmit={handleLogin}
            className="space-y-4"
          >

            {/* EMAIL */}

            <div className="relative">

              <Mail
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />


              <input
                type="email"
                placeholder="Địa chỉ email"
                required
                autoComplete="username"
                className="input-portal w-full py-3 pl-9 pr-3"
                value={email}
                onChange={(e) =>
                  setEmail(
                    e.target.value
                  )
                }
              />

            </div>


            {/* PASSWORD */}

            <div className="relative">

              <Lock
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />


              <input
                type={
                  showPass
                    ? 'text'
                    : 'password'
                }
                placeholder="Mật khẩu"
                required
                autoComplete="current-password"
                className="input-portal w-full py-3 pl-9 pr-10"
                value={password}
                onChange={(e) =>
                  setPassword(
                    e.target.value
                  )
                }
              />


              <button
                type="button"
                onClick={() =>
                  setShowPass(
                    (value) => !value
                  )
                }
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-600"
                aria-label={
                  showPass
                    ? 'Ẩn mật khẩu'
                    : 'Hiện mật khẩu'
                }
              >

                {showPass ? (
                  <EyeOff size={16} />
                ) : (
                  <Eye size={16} />
                )}

              </button>

            </div>


            {/* SUBMIT */}

            <button
              type="submit"
              disabled={
                loading ||
                authLoading
              }
              className="btn-primary mt-2 w-full disabled:cursor-not-allowed disabled:opacity-60"
            >

              {loading
                ? 'Đang đăng nhập...'
                : 'Đăng nhập'}

            </button>

          </form>


          {/* FOOTER */}

          <div className="mt-6 text-center text-[11px] text-slate-400">
            © 2025 Phương Sen Dental · Hệ thống quản lý phòng khám nha khoa
          </div>

        </div>

      </div>

    </div>
  );
};


export default Login;