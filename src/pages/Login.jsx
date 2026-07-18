// File: src/pages/Login.jsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Lock, Mail, Stethoscope, AlertTriangle, X } from 'lucide-react';

import { useAuth } from '../context/AuthContext';
import { getDeviceLabel, getOrCreateDeviceId } from '../lib/device';
import { clearAuthNotice, getAuthNotice } from '../lib/authNotice';
import { supabase } from '../lib/supabase';

const Login = () => {
const navigate = useNavigate();
const { user, loading: authLoading, refreshAuth } = useAuth();

const [email, setEmail] = useState('');
const [password, setPassword] = useState('');
const [showPass, setShowPass] = useState(false);
const [loading, setLoading] = useState(false);
const [authNotice, setLocalAuthNotice] = useState(null);

useEffect(() => {
const notice = getAuthNotice();
if (notice?.message) {
setLocalAuthNotice(notice.message);
clearAuthNotice();
}
}, []);

useEffect(() => {
if (!authLoading && user) {
navigate('/', { replace: true });
}
}, [authLoading, navigate, user]);

const handleLogin = async (e) => {
e.preventDefault();
setLoading(true);

try {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    alert(error.message);
    return;
  }

  const { data: userData, error: userError } = await supabase.auth.getUser();
  const liveUser = userData?.user || data?.user;

  if (userError || !liveUser) {
    await supabase.auth.signOut({ scope: 'local' });
    alert('Không thể xác thực người dùng.');
    return;
  }

  const deviceId = getOrCreateDeviceId();
  const deviceLabel = getDeviceLabel();
  const now = new Date().toISOString();

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', liveUser.id)
    .single();

  if (profileError || !profile) {
    await supabase.auth.signOut({ scope: 'local' });
    alert('Không tìm thấy hồ sơ.');
    return;
  }

  const { error: updateError } = await supabase
    .from('profiles')
    .update({
      active_device_id: deviceId,
      active_device_name: deviceLabel,
      last_login_at: now,
      last_seen_at: now,
    })
    .eq('id', liveUser.id);

  if (updateError) {
    await supabase.auth.signOut({ scope: 'local' });
    alert(updateError.message || 'Không thể cập nhật thiết bị đăng nhập.');
    return;
  }

  const { error: othersSignOutError } = await supabase.auth.signOut({
    scope: 'others',
  });

  if (othersSignOutError) {
    console.error('Sign out other sessions error:', othersSignOutError);
  }

  const syncResult = await refreshAuth();

  if (syncResult?.ok && syncResult?.user) {
    clearAuthNotice();
    navigate('/', { replace: true });
    return;
  }

  alert('Đăng nhập thành công nhưng chưa đồng bộ được phiên. Vui lòng thử lại.');
} catch (err) {
  console.error(err);
  alert('Có lỗi xảy ra khi đăng nhập.');
} finally {
  setLoading(false);
}

};

const dismissNotice = () => {
setLocalAuthNotice(null);
clearAuthNotice();
};

return (
<div className="flex min-h-screen min-h-[100dvh] items-center justify-center bg-gradient-to-br from-slate-100 via-sky-50 to-primary/5 px-4 py-8">
<div className="w-full max-w-sm">
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

    <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-xl shadow-slate-200/60 sm:p-6">
      <h2 className="mb-1 text-base font-semibold text-slate-700">
        Chào mừng trở lại
      </h2>

      <p className="mb-4 text-xs text-slate-400">
        Nhập thông tin để tiếp tục
      </p>

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
              onClick={dismissNotice}
              className="rounded-lg p-1 text-amber-700 hover:bg-amber-100"
              aria-label="Đóng thông báo"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      <form onSubmit={handleLogin} className="space-y-4">
        <div className="relative">
          <Mail
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />

          <input
            type="email"
            placeholder="Địa chỉ email"
            required
            className="input-portal w-full py-3 pl-9 pr-3"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className="relative">
          <Lock
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />

          <input
            type={showPass ? 'text' : 'password'}
            placeholder="Mật khẩu"
            required
            className="input-portal w-full py-3 pl-9 pr-10"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <button
            type="button"
            onClick={() => setShowPass(!showPass)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-600"
          >
            {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="btn-primary mt-2 w-full"
        >
          {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
        </button>
      </form>

      <div className="mt-6 text-center text-[11px] text-slate-400">
        © 2025 Phương Sen Dental · Hệ thống quản lý phòng khám nha khoa
      </div>
    </div>
  </div>
</div>

);
};

export default Login;