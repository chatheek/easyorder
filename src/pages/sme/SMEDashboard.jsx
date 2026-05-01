import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { 
  RefreshCw, Menu, X, Bell, ShieldAlert, CheckCircle 
} from 'lucide-react';

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

  // --- UI STATES ---
  const [activeTab, setActiveTab] = useState('dashboard');
  const [bizData, setBizData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  // --- 🔒 SECURITY STATES (Missing in previous version) ---
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [updatingPass, setUpdatingPass] = useState(false);

  // --- 🔔 SYNC & NOTIFICATION STATES ---
  const [isSubscribed, setIsSubscribed] = useState(true); 
  const [tagSynced, setTagSynced] = useState(false);

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

      if (error || !data) navigate(`/${whatsapp}/admin/login`);
      else setBizData(data);
    } catch (err) {
      console.error("Dashboard Load Error:", err);
    } finally {
      setLoading(false);
    }
  }, [whatsapp, navigate]);

  const handleUpdateDetails = async (e) => {
    e.preventDefault();
    const { error } = await supabase.from('businesses').update({
      name: bizData.name, address: bizData.address, reg_no: bizData.reg_no
    }).eq('id', bizData.id);
    if (error) alert(error.message); else alert("Updated!");
  };

  const handlePasswordReset = async (e) => {
    e.preventDefault();
    setUpdatingPass(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) alert(error.message); else { alert("Success!"); setNewPassword(''); }
    setUpdatingPass(false);
  };

  const handleLogoUpdate = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const fileName = `${bizData.id}-${Date.now()}`;
    const { data } = await supabase.storage.from('business-logos').upload(fileName, file);
    if (data) {
      await supabase.from('businesses').update({ logo_url: data.path }).eq('id', bizData.id);
      fetchMyBusiness();
    }
  };

  // --- 🔔 ONESIGNAL ---
  useEffect(() => {
    if (!bizData?.id) return;
    const OneSignal = window.OneSignal || [];
  



const syncOneSignal = async () => {
  try {
    const OS = window.OneSignal;
    if (!OS) return;

    // 1. Check browser permission
    const permission = await OS.Notifications.permission;

    // 2. We only hide the button if BOTH permission is granted AND we have a Push ID
    const pushId = OS.User?.PushSubscription?.id;
    setIsSubscribed(permission === "granted" && !!pushId);

    if (permission === "granted") {
      await OS.login(bizData.id);

      let attempts = 0;
      const finalSync = async () => {
        const currentPushId = OS.User?.PushSubscription?.id;

        if (currentPushId) {
          // 🚩 DEVICE IS FULLY REGISTERED NOW
          await OS.User.addTag("business_id", bizData.id);
          setIsSubscribed(true); // Hide the button now
          setTagSynced(true);     // Show the green "Synced" checkmark
          console.log("✅ Mobile Fully Registered & Tagged");
        } else if (attempts < 12) {
          attempts++;
          // Still waiting for mobile OS to provide the push token
          setTimeout(finalSync, 2500); 
        }
      };

      finalSync();
    } else {
      // Permission was denied or not yet asked
      setIsSubscribed(false);
    }
  } catch (err) {
    console.error("OS Sync Error:", err);
  }
};


    if (Array.isArray(OneSignal)) OneSignal.push(syncOneSignal);
    else syncOneSignal();
  }, [bizData?.id]);

  const handleEnableNotifications = async () => {
    const OneSignal = window.OneSignal;
    if (!OneSignal || Array.isArray(OneSignal)) return;
    await OneSignal.Notifications.requestPermission();
    setIsSubscribed(await OneSignal.Notifications.permission);
  };

  useEffect(() => { fetchMyBusiness(); }, [fetchMyBusiness]);

  if (loading) return <div className="h-screen flex items-center justify-center"><RefreshCw className="animate-spin text-indigo-600" /></div>;
  if (!bizData) return null;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-sans relative">
      <div className="md:hidden flex items-center justify-between p-5 bg-slate-900 text-white sticky top-0 z-[80]">
        <h2 className="text-xl font-black text-indigo-400 italic uppercase">EasyOrder</h2>
        <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-3 bg-slate-800 rounded-2xl">
          {isMenuOpen ? <X size={24} className="text-indigo-400" /> : <Menu size={24} />}
        </button>
      </div>

      <AdminSidebar 
        whatsapp={whatsapp} activeTab={activeTab} setActiveTab={setActiveTab} 
        isMenuOpen={isMenuOpen} setIsMenuOpen={setIsMenuOpen} 
        businessType={bizData.business_type} installButton={installButton}
      />

      <main className="flex-1 p-4 md:p-10 md:ml-72 min-h-screen overflow-x-hidden">
        {!isSubscribed ? (
          <div className="mb-8 p-6 bg-white border-2 border-dashed border-indigo-200 rounded-[2.5rem] flex flex-col md:flex-row items-center justify-between gap-6 animate-in slide-in-from-top-4 duration-700">
            <div className="flex items-center gap-5">
              <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center shrink-0">
                <Bell size={28} className="animate-pulse" />
              </div>
              <div className="text-center md:text-left">
                <h3 className="text-lg font-black uppercase italic text-slate-900">Alerts Offline</h3>
                <p className="text-xs font-bold text-slate-400 uppercase">Enable notifications to get live booking alerts.</p>
              </div>
            </div>
            <button 
              onClick={handleEnableNotifications}
              className="w-full md:w-auto bg-indigo-600 text-white px-10 py-4 rounded-2xl font-black uppercase text-xs"
            >
              <ShieldAlert size={16} className="inline mr-2" /> Enable Now
            </button>
          </div>
        ) : (
          <div className="mb-6 px-4">
             {tagSynced ? (
               <span className="text-[9px] font-black text-emerald-600 uppercase bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
                 <CheckCircle size={10} className="inline mr-1"/> Alerts Synced
               </span>
             ) : (
               <span className="text-[9px] font-black text-amber-600 uppercase bg-amber-50 px-3 py-1 rounded-full border border-amber-100">
                 <RefreshCw size={10} className="inline mr-1 animate-spin"/> Syncing...
               </span>
             )}
          </div>
        )}

        <div className="animate-in fade-in duration-500">
          {activeTab === 'dashboard' && (
            <OverviewTab 
              bizData={bizData} 
              setBizData={setBizData}
              handleUpdateDetails={handleUpdateDetails}
              handlePasswordReset={handlePasswordReset}
              handleLogoUpdate={handleLogoUpdate}
              isSubscribed={isSubscribed}
              handleEnableNotifications={handleEnableNotifications}
              securityState={{ newPassword, setNewPassword, showPassword, setShowPassword, updatingPass }}
            />
          )}
          {activeTab === 'products' && <ProductsTab bizData={bizData} />}
          {activeTab === 'schedule' && <ScheduleTab bizData={bizData} />}
          {activeTab === 'orders' && <OrdersTab bizData={bizData} />}
          {activeTab === 'appointments' && <AppointmentsTab bizData={bizData} />}
        </div>
      </main>

      {isMenuOpen && <div className="fixed inset-0 bg-black/60 z-[55] md:hidden backdrop-blur-sm" onClick={() => setIsMenuOpen(false)} />}
    </div>
  );
}