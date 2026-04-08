// path: src/pages/Login.jsx
import { useState } from "react";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { Eye, EyeOff, Mail, Lock } from "lucide-react";


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
        navigate("/admin/dashboard");
      }
    };

    checkSession();
  }, [navigate]);

  useEffect(() => {
    const check = async () => {
      const { data } = await supabase.auth.getSession();

      if (data.session) {
        navigate("/admin/dashboard");
      }
    };

    check();
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

    navigate("/admin/dashboard");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] px-4">

      <div className="w-full max-w-md">

        {/* BRAND */}
        <div className="text-center mb-8">
          <div className="text-3xl font-bold text-[#025899]">
            🦷 Phương Sen Dental
          </div>
          <p className="text-sm text-slate-500 mt-2">
            Hệ thống quản lý phòng khám nha khoa
          </p>
        </div>

        {/* CARD */}
        <div className="bg-white shadow-xl rounded-2xl p-8 border border-slate-200">

          <h2 className="text-xl font-semibold text-slate-700 text-center mb-6">
            Đăng nhập hệ thống
          </h2>

          <form onSubmit={handleLogin} className="space-y-5">

            {/* EMAIL */}
            <div className="relative">
              <Mail className="absolute left-3 top-3.5 text-slate-400" size={18}/>
              <input
                type="email"
                placeholder="Email"
                required
                className="w-full border border-slate-200 focus:border-[#025899] focus:ring-2 focus:ring-[#025899]/20 transition-all p-3 pl-10 rounded-lg outline-none text-slate-700 placeholder:text-slate-400"
                value={email}
                onChange={(e)=>setEmail(e.target.value)}
              />
            </div>

            {/* PASSWORD */}
            <div className="relative">
              <Lock className="absolute left-3 top-3.5 text-slate-400" size={18}/>
              <input
                type={showPass ? "text":"password"}
                placeholder="Mật khẩu"
                required
                className="w-full border border-slate-200 focus:border-[#025899] focus:ring-2 focus:ring-[#025899]/20 transition-all p-3 pl-10 pr-10 rounded-lg outline-none text-slate-700 placeholder:text-slate-400"
                value={password}
                onChange={(e)=>setPassword(e.target.value)}
              />

              <div
                onClick={()=>setShowPass(!showPass)}
                className="absolute right-3 top-3.5 cursor-pointer text-slate-400 hover:text-slate-600"
              >
                {showPass ? <EyeOff size={18}/> : <Eye size={18}/>}
              </div>
            </div>

            {/* BUTTON */}
            <button
              disabled={loading}
              className="w-full bg-[#025899] hover:bg-[#01487a] transition-all text-white py-3 rounded-lg font-medium shadow-sm disabled:opacity-60"
            >
              {loading ? "Đang đăng nhập..." : "Đăng nhập"}
            </button>

          </form>

          {/* FOOTER */}
          <div className="text-center text-xs text-slate-400 mt-6">
            © 2026 Phuong Sen Dental
          </div>

        </div>

      </div>

    </div>
  );
};

export default Login;