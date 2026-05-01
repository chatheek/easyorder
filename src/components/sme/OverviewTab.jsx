import { 
  CreditCard, Calendar, Clock, Activity, Lock, Eye, 
  EyeOff, ShieldCheck, RefreshCw, ImageIcon, Save, 
  Info, Mail, User, Hash, MapPin, Briefcase, Bell, BellRing
} from 'lucide-react';

export default function OverviewTab({ bizData, setBizData, handleUpdateDetails, handlePasswordReset, handleLogoUpdate, securityState }) {
  const formatBilling = (val) => (!val || val === 'N/A') ? <span className="text-amber-600 italic text-sm">Pending</span> : val;
  const { newPassword, setNewPassword, showPassword, setShowPassword, updatingPass } = securityState;

  // --- ONESIGNAL MANUAL PROMPT ---
// In OverviewTab.jsx
const handleEnableNotifications = () => {
  // Use the native browser prompt instead of the slidedown
  // This satisfies the "User Gesture" requirement
  if (window.OneSignal) {
    window.OneSignal.Notifications.requestPermission();
  } else {
    alert("Notification service is loading...");
  }
};

  const Label = ({ icon: Icon, text }) => (
    <div className="flex items-center gap-1.5 mb-2 ml-1">
      <Icon size={12} className="text-slate-400" />
      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{text}</label>
    </div>
  );

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* BILLING GRID */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
        {[
          { label: 'Monthly Sub', val: bizData.monthly_subscription, icon: <CreditCard size={18}/>, color: 'text-indigo-500' },
          { label: 'Start Date', val: bizData.subscription_start_date, icon: <Calendar size={18}/>, color: 'text-indigo-500' },
          { label: 'Total Due', val: bizData.total_due, icon: <Clock size={18}/>, color: 'text-red-500', bg: 'ring-2 ring-red-100 bg-red-50/30' },
          { label: 'Next Payment', val: bizData.next_payment_date, icon: <Calendar size={18}/>, color: 'text-indigo-500' }
        ].map((item, i) => (
          <div key={i} className={`bg-white p-4 md:p-5 rounded-[1.5rem] md:rounded-[2rem] shadow-sm border border-slate-100 flex flex-col gap-1 ${item.bg}`}>
            <div className={`flex items-center gap-2 ${item.color} mb-1`}>
              {item.icon} 
              <span className="text-[9px] md:text-[10px] font-black uppercase tracking-widest">{item.label}</span>
            </div>
            <div className="text-base md:text-xl font-black text-slate-800 truncate">{formatBilling(item.val)}</div>
          </div>
        ))}
      </div>

      <div className="flex flex-col lg:flex-row gap-6 md:gap-10">
        <div className="flex-1 space-y-6 md:space-y-8">
          
          {/* MAIN PROFILE FORM */}
          <form onSubmit={handleUpdateDetails} className="bg-white p-6 md:p-10 rounded-[2rem] md:rounded-[2.5rem] shadow-sm border border-slate-100 space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-50">
              <h3 className="font-black text-slate-900 text-sm uppercase tracking-tighter italic">Business Profile</h3>
              <div className="flex items-center gap-1.5 bg-indigo-50 px-3 py-1 rounded-full">
                <Briefcase size={12} className="text-indigo-600" />
                <span className="text-[10px] font-bold text-indigo-700 uppercase">{bizData.business_type}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              <div className="group">
                <Label icon={Activity} text="Business Name" />
                <input type="text" value={bizData.name || ''} onChange={e => setBizData({...bizData, name: e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl font-semibold outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-200 transition-all" />
              </div>

              <div className="group">
                <Label icon={Hash} text="Registration No" />
                <input type="text" value={bizData.reg_no || ''} onChange={e => setBizData({...bizData, reg_no: e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl font-semibold outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-200 transition-all" />
              </div>

              <div className="md:col-span-2 group">
                <Label icon={MapPin} text="Official Address" />
                <textarea value={bizData.address || ''} onChange={e => setBizData({...bizData, address: e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl h-24 font-semibold outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-200 transition-all resize-none" />
              </div>
            </div>

            <button type="submit" className="w-full bg-slate-900 text-white font-black uppercase text-[11px] tracking-[0.2em] py-5 rounded-2xl shadow-xl shadow-slate-200 hover:bg-black active:scale-[0.98] transition-all">
              Update Business Info
            </button>
          </form>

          {/* NOTIFICATIONS SECTION - Added for OneSignal Fix */}
          <div className="bg-indigo-600 p-6 md:p-10 rounded-[2rem] md:rounded-[2.5rem] text-white shadow-xl shadow-indigo-200">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-2">
                <h3 className="text-lg font-black italic flex items-center gap-2 uppercase tracking-tighter">
                  <BellRing size={20} className="text-indigo-200" /> Notifications
                </h3>
                <p className="text-[11px] font-bold text-indigo-100 uppercase tracking-widest leading-relaxed">
                  Get instant alerts for new orders. On iOS, you must "Add to Home Screen" first.
                </p>
              </div>
              <button 
                onClick={handleEnableNotifications}
                className="bg-white text-indigo-600 px-8 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <Bell size={14} /> Enable Alerts
              </button>
            </div>
          </div>

          {/* SECURITY SECTION */}
          <div className="bg-slate-900 p-6 md:p-10 rounded-[2rem] md:rounded-[2.5rem] text-white shadow-2xl shadow-slate-900/20">
            <h3 className="text-lg font-bold mb-6 italic flex items-center gap-2 uppercase tracking-tighter">
              <Lock size={20} className="text-indigo-400" /> Security
            </h3>
            <div className="relative mb-4">
              <input type={showPassword ? "text" : "password"} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full p-4 bg-slate-800/50 border border-slate-700 rounded-2xl outline-none focus:border-indigo-500 transition-colors" placeholder="New Password" />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors">
                {showPassword ? <EyeOff size={18}/> : <Eye size={18}/>}
              </button>
            </div>
            <button onClick={handlePasswordReset} disabled={updatingPass} className="w-full md:w-auto px-10 py-4 bg-indigo-600 rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-all shadow-lg shadow-indigo-600/20">
              {updatingPass ? <RefreshCw className="animate-spin" size={14}/> : <ShieldCheck size={14}/>} 
              Change Account Password
            </button>
          </div>
        </div>

        {/* SIDEBAR INFO */}
        <div className="w-full lg:w-80 space-y-6">
          <div className="bg-white p-6 rounded-[2rem] md:rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col items-center">
             <div className="relative group mb-8">
                <div className="w-32 h-32 md:w-36 md:h-36 bg-slate-50 rounded-[3rem] border-4 border-white shadow-2xl overflow-hidden flex items-center justify-center">
                   {bizData.logo_url ? (
                     <img src={`https://qntcbkkwflxeyjvpkoro.supabase.co/storage/v1/object/public/business-logos/${bizData.logo_url}`} className="w-full h-full object-cover" alt="Logo" />
                   ) : (
                     <ImageIcon className="text-slate-200" size={40}/>
                   )}
                </div>
                <label className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 rounded-[3rem] flex items-center justify-center cursor-pointer transition-all">
                  <input type="file" className="hidden" onChange={handleLogoUpdate} /> 
                  <Save size={24} className="text-white animate-bounce" />
                </label>
             </div>

             <div className="w-full space-y-5 pt-6 border-t border-slate-50">
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-1 flex items-center gap-1.5"><User size={10} /> Contact Person</span>
                  <p className="text-sm font-bold text-slate-600 italic">{bizData.contact_person || 'Not Set'}</p>
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-1 flex items-center gap-1.5"><Mail size={10} /> Admin Email</span>
                  <p className="text-sm font-bold text-slate-600 break-all">{bizData.email || 'Not Set'}</p>
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-1 flex items-center gap-1.5"><Activity size={10} /> WhatsApp Identity</span>
                  <p className="text-sm font-bold text-slate-600">{bizData.whatsapp}</p>
                </div>
             </div>
          </div>

          <div className="bg-amber-50 p-5 rounded-[2rem] border border-amber-100 flex gap-3 items-start shadow-sm">
             <Info size={18} className="text-amber-600 shrink-0 mt-0.5" />
             <p className="text-[10px] text-amber-800 font-bold leading-relaxed uppercase tracking-tight">
                Contact Person and Email are fixed for security. To update these or billing cycles, please open a support ticket.
             </p>
          </div>
        </div>
      </div>
    </div>
  );
}