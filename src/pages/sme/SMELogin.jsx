import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { 
  Lock, Mail, ShieldCheck, AlertCircle, 
  Loader2, ChevronLeft, Eye, EyeOff 
} from 'lucide-react';

export default function SMELogin() {
  const { whatsapp } = useParams(); 
  const navigate = useNavigate();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false); // Password toggle state
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      const { data: business, error: bizError } = await supabase
        .from('businesses')
        .select('email, name')
        .eq('whatsapp', whatsapp)
        .eq('email', email.trim())
        .maybeSingle();

      if (bizError) throw new Error("Database connection error. Try again.");
      
      if (!business) {
        throw new Error("Unauthorized: Email not linked to this business link.");
      }

      const { error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password,
      });

      if (authError) throw new Error(authError.message);

      navigate(`/${whatsapp}/admin`);

    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4 md:p-6 relative">
      {/* --- BACK TO HOME --- */}
      <Link 
        to="/" 
        className="absolute top-6 left-6 flex items-center gap-2 text-slate-400 hover:text-slate-600 transition-colors text-xs font-black uppercase tracking-widest active:scale-95"
      >
        <ChevronLeft size={16} /> Home
      </Link>

      <div className="max-w-md w-full bg-white rounded-[2rem] md:rounded-[2.5rem] shadow-2xl shadow-slate-200/50 p-8 md:p-10 border border-slate-100">
        
        {/* Branding Area */}
        <div className="text-center mb-8 md:mb-10">
          <div className="w-16 h-16 md:w-20 md:h-20 bg-slate-900 rounded-3xl flex items-center justify-center mx-auto mb-4 md:mb-6 shadow-xl shadow-indigo-100 transform -rotate-3">
            <Lock className="text-indigo-400" size={32} />
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight uppercase italic leading-none">SME Portal</h1>
          <div className="mt-4 inline-flex items-center gap-2 bg-indigo-50 px-4 py-1.5 rounded-full border border-indigo-100">
            <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest leading-none">
              Portal: {whatsapp}
            </span>
          </div>
        </div>

        {/* Error Handling */}
        {errorMsg && (
          <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-r-2xl flex gap-3 items-start animate-shake">
            <AlertCircle className="text-red-500 shrink-0" size={18} />
            <p className="text-[11px] text-red-800 font-bold leading-tight uppercase">
              {errorMsg}
            </p>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5 md:space-y-6">
          {/* Email Input */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Admin Email</label>
            <div className="relative group">
              <Mail className="absolute left-4 top-4 text-slate-300 group-focus-within:text-indigo-500 transition-colors" size={18} />
              <input 
                type="email" 
                required 
                inputMode="email"
                value={email} 
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-12 pr-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-sm font-semibold" 
                placeholder="admin@business.com" 
              />
            </div>
          </div>

          {/* Password Input with Eye Toggle */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Password</label>
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
                className="absolute right-4 top-4 text-slate-300 hover:text-indigo-500 transition-colors focus:outline-none"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-slate-900 hover:bg-black text-white font-black uppercase text-xs tracking-[0.2em] py-5 rounded-2xl flex items-center justify-center gap-3 shadow-xl shadow-slate-200 transition-all active:scale-95 disabled:bg-slate-300"
          >
            {loading ? (
              <Loader2 className="animate-spin" size={20} />
            ) : (
              <>
                <ShieldCheck size={20} className="text-indigo-400" /> 
                Login to Dashboard
              </>
            )}
          </button>
        </form>

        <div className="mt-8 pt-8 border-t border-slate-50 text-center">
          <p className="text-[9px] text-slate-300 font-bold uppercase tracking-[0.3em]">
            Secured SME Access
          </p>
        </div>
      </div>
    </div>
  );
}