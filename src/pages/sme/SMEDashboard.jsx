import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { RefreshCw, Menu, X, Bell, ShieldAlert, CheckCircle } from 'lucide-react';

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
  
  // Notification States
  const [isSubscribed, setIsSubscribed] = useState(true); // Default true to avoid flicker
  const [tagSynced, setTagSynced] = useState(false);

  // Security Sub-states
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [updatingPass, setUpdatingPass] = useState(false);

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

  // --- 🔔 ONESIGNAL SYNC LOGIC ---
  useEffect(() => {
    if (!bizData?.id) return;

    const OS = window.OneSignal || [];

    const syncOneSignal = async () => {
      try {
        const permission = await OS.Notifications.permission;
        
        // Check if we have a valid subscription ID
        const pushId = OS.User?.PushSubscription?.id;
        
        // The button should only be hidden if permission is granted AND device is registered
        setIsSubscribed(permission === "granted" && !!pushId);

        if (permission === "granted") {
          await OS.login(bizData.id);
          
          const finalRegistration = async () => {
            const currentPushId = OS.User?.PushSubscription?.id;
            if (currentPushId) {
              await OS.User.addTag("business_id", bizData.id);
              setIsSubscribed(true); // Hide the button
              setTagSynced(true);     // Show checkmark
            } else {
              // Retry if mobile OS is slow to provide the token
              setTimeout(finalRegistration, 2500);
            }
          };
          finalRegistration();
        }
      } catch (err) {
        console.error("OneSignal sync failed:", err);
      }
    };

    if (Array.isArray(OS)) {
      OS.push(syncOneSignal);
    } else {
      syncOneSignal();
    }
  }, [bizData?.id]);

  const handleEnableNotifications = async () => {
    const OS = window.OneSignal;
    if (!OS || Array.isArray(OS)) return;
    try {
      await OS.Notifications.requestPermission();
      const permission = await OS.Notifications.permission;
      if (permission === "granted") {
        // Trigger the sync logic immediately after permission
        setIsSubscribed(true);
      }
    } catch (err) {
      console.error("Permission request crashed:", err);
    }
  };

  useEffect(() => { 
    fetchMyBusiness(); 
  }, [fetchMyBusiness]);

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
        <button 
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="p-3 bg-slate-800 rounded-2xl active:scale-90 transition-all border border-slate-700"
        >
          {isMenuOpen ? <X size={24} className="text-indigo-400" /> : <Menu size={24} />}
        </button>
      </div>

      <AdminSidebar 
        whatsapp={whatsapp} 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        isMenuOpen={isMenuOpen} 
        setIsMenuOpen={setIsMenuOpen} 
        businessType={bizData.business_type}
        installButton={installButton}
      />

      <main className="flex-1 p-4 md:p-10 md:ml-72 min-h-screen overflow-x-hidden">
        
        {/* 🚩 TOP CONDITIONAL NOTIFICATION BAR */}
        {!isSubscribed ? (
          <div className="mb-8 p-6 bg-white border-2 border-dashed border-indigo-200 rounded-[2.5rem] flex flex-col md:flex-row items-center justify-between gap-6 animate-in slide-in-from-top-4 duration-700">
            <div className="flex items-center gap-5">
              <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center shrink-0">
                <Bell size={28} className="animate-pulse" />
              </div>
              <div className="text-center md:text-left">
                <h3 className="text-lg font-black uppercase italic tracking-tighter text-slate-900">Push Notifications Offline</h3>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-tight">Enable alerts to get sound notifications for new bookings.</p>
              </div>
            </div>
            <button 
              onClick={handleEnableNotifications}
              className="w-full md:w-auto bg-indigo-600 text-white px-10 py-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-indigo-100 hover:bg-indigo-700 active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <ShieldAlert size={16} /> Enable Alerts Now
            </button>
          </div>
        ) : (
          /* STATUS INDICATOR */
          <div className="mb-6 flex items-center gap-2 px-4">
             {tagSynced ? (
               <span className="flex items-center gap-1.5 text-[9px] font-black text-emerald-500 uppercase tracking-widest bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
                 <CheckCircle size={10}/> Alerts Synced
               </span>
             ) : (
               <span className="flex items-center gap-1.5 text-[9px] font-black text-amber-500 uppercase tracking-widest bg-amber-50 px-3 py-1 rounded-full border border-amber-100">
                 <RefreshCw size={10} className="animate-spin"/> Syncing System...
               </span>
             )}
          </div>
        )}

        <div className="animate-in fade-in duration-500">
          {activeTab === 'dashboard' && (
            <OverviewTab 
              bizData={bizData} 
              setBizData={setBizData}
              handleUpdateDetails={() => {}} // Pass your actual handler
              handlePasswordReset={() => {}} // Pass your actual handler
              handleLogoUpdate={() => {}}     // Pass your actual handler
              securityState={{ newPassword, setNewPassword, showPassword, setShowPassword, updatingPass }}
            />
          )}
          {activeTab === 'products' && bizData?.id && <ProductsTab bizData={bizData} />}
          {activeTab === 'schedule' && bizData?.id && <ScheduleTab bizData={bizData} />}
          {activeTab === 'orders' && <OrdersTab bizData={bizData} />}
          {activeTab === 'appointments' && <AppointmentsTab bizData={bizData} />}
        </div>
      </main>

      {isMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-[55] md:hidden backdrop-blur-sm" 
          onClick={() => setIsMenuOpen(false)} 
        />
      )}
    </div>
  );
}