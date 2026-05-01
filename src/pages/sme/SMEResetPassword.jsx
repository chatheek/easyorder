import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { 
  Lock, ShieldCheck, AlertCircle, 
  Loader2, ChevronLeft, Eye, EyeOff, CheckCircle2 
} from 'lucide-react';

export default function SMEResetPassword() {
  const { whatsapp } = useParams();
  const navigate = useNavigate();
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [success, setSuccess] = useState(false);

  // Check if we actually have a session (the recovery link provides one)
  useEffect(() => {
    supabase.auth.onAuthStateChange(async (event) => {
      if (event !== "PASSWORD_RECOVERY") {
        // If they just land here without a recovery trigger, send them away
        // navigate(`/${whatsapp}/admin/login`);
      }
    });
  }, [navigate, whatsapp]);

  const handleReset = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setErrorMsg("Passwords do not match.");
      return;
    }
    if (password.length < 6) {
      setErrorMsg("Minimum 6 characters required.");
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const { error } = await supabase.auth.updateUser({ 
        password: password 
      });

      if (error) throw error;

      setSuccess(true);
      setTimeout(() => {
        navigate(`/${whatsapp}/admin/login`);
      }, 3000);

    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4 md:p-6 relative">
      <div className="max-w-md w-full bg-white rounded-[2rem] md:rounded-[2.5rem] shadow-2xl p-8 md:p-10 border border-slate-100">
        
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-indigo-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-indigo-100">
            <ShieldCheck className="text-white" size={32} />
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase italic leading-none">New Password</h1>
          <p className="mt-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">Update your admin credentials</p>
        </div>

        {success ? (
          <div className="text-center space-y-4 animate-in zoom-in">
            <div className="flex justify-center text-emerald-500">
              <CheckCircle2 size={48} />
            </div>
            <p className="text-sm font-bold text-slate-700">Password updated successfully!</p>
            <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest">Redirecting to login...</p>
          </div>
        ) : (
          <form onSubmit={handleReset} className="space-y-5">
            {errorMsg && (
              <div className="p-4 bg-red-50 border-l-4 border-red-500 rounded-r-2xl flex gap-3 items-start animate-shake">
                <AlertCircle className="text-red-500 shrink-0" size={18} />
                <p className="text-[11px] text-red-800 font-bold uppercase">{errorMsg}</p>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">New Password</label>
              <div className="relative group">
                <Lock className="absolute left-4 top-4 text-slate-300 group-focus-within:text-indigo-500 transition-colors" size={18} />
                <input 
                  type={showPassword ? "text" : "password"} 
                  required 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-12 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-sm font-semibold" 
                  placeholder="••••••••" 
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-4 text-slate-300 hover:text-indigo-500 transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Confirm Password</label>
              <div className="relative group">
                <Lock className="absolute left-4 top-4 text-slate-300 group-focus-within:text-indigo-500 transition-colors" size={18} />
                <input 
                  type="password" 
                  required 
                  value={confirmPassword} 
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-12 pr-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-sm font-semibold" 
                  placeholder="••••••••" 
                />
              </div>
            </div>

            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-slate-900 hover:bg-black text-white font-black uppercase text-xs tracking-[0.2em] py-5 rounded-2xl flex items-center justify-center gap-3 shadow-xl transition-all active:scale-95 disabled:bg-slate-300"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : "Update Password"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}