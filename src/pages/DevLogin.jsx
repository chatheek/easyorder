import React, { useState } from "react";
import { supabase } from "../lib/supabase";
import { useNavigate, Link } from "react-router-dom";
import { Lock, Mail, ShieldCheck, Eye, EyeOff, Loader2, ChevronLeft } from "lucide-react";

export default function DevLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleDevLogin = async (e) => {
    e.preventDefault();

    // Strict credential check
    if (email !== "easyorder_dev@gmail.com" || password !== "EASYorderDev2004") {
      alert("Unauthorized: These are not the Developer credentials.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      alert(`Login failed: ${error.message}`);
    } else {
      navigate("/devdashboard");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4 relative overflow-hidden">
      {/* Decorative Background Elements for Dev Feel */}
      <div className="absolute top-[-10%] left-[-10%] w-64 h-64 bg-indigo-600/10 rounded-full blur-3xl"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl"></div>

      {/* Back to Site */}
      <Link 
        to="/" 
        className="absolute top-6 left-6 flex items-center gap-2 text-slate-500 hover:text-indigo-400 transition-colors text-[10px] font-black uppercase tracking-widest z-50"
      >
        <ChevronLeft size={16} /> Home
      </Link>

      <div className="max-w-md w-full bg-white rounded-[2.5rem] shadow-2xl overflow-hidden relative z-10 border border-slate-800/10">
        <div className="bg-slate-900 p-10 text-center relative">
          <div className="relative inline-block">
            <ShieldCheck className="mx-auto text-indigo-400 w-14 h-14 mb-4 drop-shadow-[0_0_15px_rgba(129,140,248,0.5)]" />
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 border-4 border-slate-900 rounded-full"></div>
          </div>
          <h2 className="text-3xl font-black text-white tracking-tighter uppercase italic">Dev Portal</h2>
          <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em] mt-2">Platform Administration</p>
        </div>

        <form onSubmit={handleDevLogin} className="p-8 md:p-10 space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Secure Email</label>
            <div className="relative group">
              <Mail className="absolute left-4 top-4 w-5 h-5 text-slate-300 group-focus-within:text-indigo-500 transition-colors" />
              <input
                type="email"
                inputMode="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Developer Email"
                className="pl-12 w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-semibold text-sm"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Access Key</label>
            <div className="relative group">
              <Lock className="absolute left-4 top-4 w-5 h-5 text-slate-300 group-focus-within:text-indigo-500 transition-colors" />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="pl-12 pr-12 w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-semibold text-sm"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-4 text-slate-300 hover:text-slate-600 transition-colors"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-slate-900 hover:bg-black text-white font-black uppercase text-xs tracking-[0.2em] py-5 rounded-2xl transition-all transform active:scale-[0.98] disabled:bg-slate-300 shadow-xl shadow-indigo-100 flex items-center justify-center gap-3"
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin" size={20} />
                Verifying...
              </>
            ) : (
              "Access Dashboard"
            )}
          </button>
        </form>

        <div className="bg-slate-50 p-6 text-center border-t border-slate-100">
          <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest leading-relaxed">
            Unauthorized access is strictly prohibited <br /> & monitored by the EasyOrder security layer.
          </p>
        </div>
      </div>
    </div>
  );
}