// path: src/pages/Login.jsx
import { useState } from "react";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { Eye, EyeOff, Mail, Lock, Stethoscope } from "lucide-react";


const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();

      if (data.session) {
        navigate("/");
      }
    };

    checkSession();
  }, [navigate]);

  
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      alert(error.message);
      setLoading(false);
      return;
    }

    const userId = data.user.id;

    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (!profile) {
      alert("Không tìm thấy hồ sơ.");
      setLoading(false);
      return;
    }

    navigate("/");
  };

  return (
    <div className="min-h-screen min-h-[100dvh] flex items-center justify-center bg-gradient-to-br from-slate-100 via-sky-50 to-primary/5 px-4 py-8">
      <div className="w-full max-w-sm">

        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary text-white shadow-lg shadow-primary/25 mb-4">
            <Stethoscope className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Phương Sen Dental</h1>
          <p className="text-sm text-slate-500 mt-1.5">Đăng nhập vào hệ thống quản lý</p>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-xl shadow-slate-200/60 border border-slate-100">
          <h2 className="text-base font-semibold text-slate-700 mb-1">Chào mừng trở lại</h2>
          <p className="text-xs text-slate-400 mb-6">Nhập thông tin để tiếp tục</p>

          <form onSubmit={handleLogin} className="space-y-4">

            {/* EMAIL */}
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16}/>
              <input
                type="email"
                placeholder="Địa chỉ email"
                required
                className="input-portal w-full pl-9 pr-3 py-3"
                value={email}
                onChange={(e)=>setEmail(e.target.value)}
              />
            </div>

            {/* PASSWORD */}
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16}/>
              <input
                type={showPass ? "text":"password"}
                placeholder="Mật khẩu"
                required
                className="input-portal w-full pl-9 pr-10 py-3"
                value={password}
                onChange={(e)=>setPassword(e.target.value)}
              />

              <div
                onClick={()=>setShowPass(!showPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-slate-400 hover:text-slate-600 transition-colors"
              >
                {showPass ? <EyeOff size={16}/> : <Eye size={16}/>}
              </div>
            </div>

            {/* BUTTON */}
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full mt-2"
            >
              {loading ? "Đang đăng nhập..." : "Đăng nhập"}
            </button>

          </form>

          {/* FOOTER */}
          <div className="text-center text-[11px] text-slate-400 mt-6">
            © 2025 Phương Sen Dental · Hệ thống quản lý phòng khám nha khoa
          </div>

        </div>

      </div>

    </div>
  );
};

export default Login;