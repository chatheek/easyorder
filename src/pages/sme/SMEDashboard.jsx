import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { RefreshCw, Menu, X, Bell, BellRing, CheckCircle, ShieldAlert } from 'lucide-react';

// Component Imports
import AdminSidebar from "../../components/sme/AdminSidebar";
import OverviewTab from "../../components/sme/OverviewTab";
import ProductsTab from "../../components/sme/ProductsTab";
import OrdersTab from '../../components/sme/OrdersTab';
import ScheduleTab from "../../components/sme/ScheduleTab";
import AppointmentsTab from "../../components/sme/AppointmentsTab";

export default function SMEDashboard({ installButton }) {
  const { whatsapp } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [bizData, setBizData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Security Sub-states
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [updatingPass, setUpdatingPass] = useState(false);

  // --- 🛠️ HANDLERS ---
  const fetchMyBusiness = useCallback(async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate(`/${whatsapp}/admin/login`); return; }
      
      const { data, error } = await supabase
        .from('businesses')
        .select('*')
        .eq('whatsapp', whatsapp)
        .eq('admin_id', user.id)
        .single();

      if (error || !data) {
        navigate(`/${whatsapp}/admin/login`);
      } else {
        setBizData(data);
      }
    } catch (err) {
      console.error("Dashboard Load Error:", err);
    } finally {
      setLoading(false);
    }
  }, [whatsapp, navigate]);

  const handleUpdateDetails = async (e) => {
    e.preventDefault();
    if (!bizData) return;
    const { error } = await supabase
      .from('businesses')
      .update({ name: bizData.name, address: bizData.address, reg_no: bizData.reg_no })
      .eq('id', bizData.id);
    if (error) alert("Update failed: " + error.message);
    else alert("Business details updated!");
  };

  const handlePasswordReset = async (e) => {
    e.preventDefault();
    if (newPassword.length < 6) { alert("Min 6 characters required"); return; }
    setUpdatingPass(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) alert(error.message);
    else { alert("Password reset successfully!"); setNewPassword(''); }
    setUpdatingPass(false);
  };

  const handleLogoUpdate = async (e) => {
    const file = e.target.files[0];
    if (!file || !bizData) return;
    const fileExt = file.name.split('.').pop();
    const fileName = `${bizData.id}-${Date.now()}.${fileExt}`;
    const { data, error } = await supabase.storage.from('business-logos').upload(fileName, file);
    if (error) { alert("Upload failed"); return; }
    const { error: dbError } = await supabase.from('businesses').update({ logo_url: data.path }).eq('id', bizData.id);
    if (!dbError) fetchMyBusiness();
  };

  // --- 🔔 ONESIGNAL LOGIC ---
  const runSyncLogic = useCallback(async () => {
    const OS = window.OneSignal;
    if (!OS || !bizData?.id) return;
    
    setIsSyncing(true);
    try {
      await OS.login(bizData.id);
      
      let attempts = 0;
      const checkBridge = async () => {
        const pushId = OS.User?.PushSubscription?.id;
        const permission = await OS.Notifications.permission;
        
        if (pushId && permission === "granted") {
          await OS.User.addTag("business_id", bizData.id);
          setIsSubscribed(true);
          setIsSyncing(false);
        } else if (attempts < 5) {
          attempts++;
          setTimeout(checkBridge, 2000);
        } else {
          setIsSubscribed(false);
          setIsSyncing(false);
        }
      };
      checkBridge();
    } catch (err) {
      console.error("OneSignal sync failed:", err);
      setIsSyncing(false);
    }
  }, [bizData?.id]);

  useEffect(() => {
    const OS = window.OneSignal || [];
    if (Array.isArray(OS)) {
      OS.push(() => runSyncLogic());
    } else {
      runSyncLogic();
    }
  }, [runSyncLogic]);

  const handleEnableNotifications = async () => {
    const OS = window.OneSignal;
    if (!OS || Array.isArray(OS) || !OS.Notifications) return;

    try {
      const permission = await OS.Notifications.permission;
      if (permission !== "granted") {
        await OS.Notifications.requestPermission();
      }
      // Re-run sync logic regardless to ensure tags are fresh
      runSyncLogic();
    } catch (err) {
      console.error("Permission request crashed:", err);
    }
  };

  useEffect(() => { fetchMyBusiness(); }, [fetchMyBusiness]);

  if (loading) return (
    <div className="h-screen flex items-center justify-center bg-slate-50">
      <RefreshCw className="animate-spin text-indigo-600" size={32} />
    </div>
  );

  if (!bizData) return null;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-sans relative">
      
      {/* MOBILE HEADER */}
      <div className="md:hidden flex items-center justify-between p-5 bg-slate-900 text-white sticky top-0 z-[80] shadow-xl">
        <div className="flex flex-col">
          <h2 className="text-xl font-black text-indigo-400 italic leading-none uppercase">EasyOrder</h2>
          <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest mt-1">Admin Portal</span>
        </div>
        <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-3 bg-slate-800 rounded-2xl border border-slate-700">
          {isMenuOpen ? <X size={24} className="text-indigo-400" /> : <Menu size={24} />}
        </button>
      </div>

      <AdminSidebar 
        whatsapp={whatsapp} activeTab={activeTab} setActiveTab={setActiveTab} 
        isMenuOpen={isMenuOpen} setIsMenuOpen={setIsMenuOpen} 
        businessType={bizData.business_type} installButton={installButton}
      />

      <main className="flex-1 p-4 md:p-10 md:ml-72 min-h-screen overflow-x-hidden">
        
        {/* 🔔 FIXED Notification Status Bar */}
        <div className={`mb-8 p-5 rounded-[2rem] flex flex-col sm:flex-row items-center justify-between gap-4 transition-all duration-500 border ${
          isSubscribed 
            ? "bg-white border-emerald-100 shadow-sm" 
            : "bg-indigo-600 border-indigo-500 text-white shadow-xl shadow-indigo-100"
        }`}>
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-2xl ${isSubscribed ? "bg-emerald-50 text-emerald-600" : "bg-white/20 text-white"}`}>
              {isSubscribed ? <BellRing size={24} /> : <Bell className="animate-pulse" size={24} />}
            </div>
            <div>
              <p className={`text-xs font-black uppercase tracking-widest ${isSubscribed ? "text-emerald-600" : "text-white"}`}>
                {isSubscribed ? "System Online" : "Alerts Disabled"}
              </p>
              <p className={`text-[10px] font-bold ${isSubscribed ? "text-slate-400" : "text-indigo-100"}`}>
                {isSubscribed 
                  ? "Real-time order notifications are active on this device." 
                  : "Enable notifications to receive live order alerts."}
              </p>
            </div>
          </div>

          <button 
            onClick={handleEnableNotifications}
            disabled={isSyncing}
            className={`w-full sm:w-auto px-8 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-[0.1em] transition-all active:scale-95 flex items-center justify-center gap-2 ${
              isSubscribed 
                ? "bg-slate-100 text-slate-600 hover:bg-slate-200" 
                : "bg-white text-indigo-600 shadow-lg hover:shadow-indigo-200"
            }`}
          >
            {isSyncing ? (
              <RefreshCw size={14} className="animate-spin" />
            ) : isSubscribed ? (
              <CheckCircle size={14} className="text-emerald-500" />
            ) : (
              <ShieldAlert size={14} />
            )}
            {isSubscribed ? "Notification Enabled" : "Enable Alerts"}
          </button>
        </div>

        {/* Tab Content */}
        <div className="animate-in fade-in duration-500">
          {activeTab === 'dashboard' && (
            <OverviewTab 
              bizData={bizData} setBizData={setBizData}
              handleUpdateDetails={handleUpdateDetails}
              handlePasswordReset={handlePasswordReset}
              handleLogoUpdate={handleLogoUpdate}
              securityState={{ newPassword, setNewPassword, showPassword, setShowPassword, updatingPass }}
            />
          )}
          {activeTab === 'products' && bizData?.id && <ProductsTab bizData={bizData} />}
          {activeTab === 'schedule' && bizData?.id && <ScheduleTab bizData={bizData} />}
          {activeTab === 'orders' && <OrdersTab bizData={bizData} />}
          {activeTab === 'appointments' && <AppointmentsTab bizData={bizData} />}
        </div>
      </main>

      {isMenuOpen && <div className="fixed inset-0 bg-black/60 z-[55] md:hidden backdrop-blur-sm" onClick={() => setIsMenuOpen(false)} />}
    </div>
  );
}