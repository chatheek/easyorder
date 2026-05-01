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
  
  // --- SYNC & NOTIFICATION STATES ---
  const [isSubscribed, setIsSubscribed] = useState(true); // Default to true to prevent UI flash
  const [tagSynced, setTagSynced] = useState(false);

  // --- 🛠️ DATA FETCHING ---
  const fetchMyBusiness = useCallback(async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate(`/${whatsapp}/admin/login`);
        return;
      }
      
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

  // --- 🔔 ONESIGNAL LOGIC ---
  useEffect(() => {
    if (!bizData?.id) return;

    const OneSignal = window.OneSignal || [];

    const syncOneSignal = async () => {
      try {
        const permission = await OneSignal.Notifications.permission;
        setIsSubscribed(permission);

        if (permission) {
          // Identify user and tag for targeted Edge Function notifications
          await OneSignal.login(bizData.id);
          await OneSignal.User.addTag("business_id", bizData.id);
          setTagSynced(true);
          console.log("✅ Device tagged for business:", bizData.id);
        }
      } catch (err) {
        console.error("OneSignal Sync Error:", err);
      }
    };

    // Handle OneSignal Command Queue
    if (Array.isArray(OneSignal)) {
      OneSignal.push(syncOneSignal);
    } else {
      syncOneSignal();
    }
  }, [bizData?.id]);

  const handleEnableNotifications = async () => {
    const OneSignal = window.OneSignal;
    if (!OneSignal || Array.isArray(OneSignal)) return;

    try {
      await OneSignal.Notifications.requestPermission();
      const permission = await OneSignal.Notifications.permission;
      setIsSubscribed(permission);
    } catch (err) {
      console.error("Notification permission denied or crashed:", err);
    }
  };

  useEffect(() => { 
    fetchMyBusiness(); 
  }, [fetchMyBusiness]);

  // --- 🖥️ RENDER HELPERS ---
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
          <h2 className="text-xl font-black text-indigo-400 italic uppercase leading-none">EasyOrder</h2>
          <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest mt-1">Admin Portal</span>
        </div>
        <button 
          onClick={() => setIsMenuOpen(!isMenuOpen)} 
          className="p-3 bg-slate-800 rounded-2xl border border-slate-700 active:scale-95 transition-transform"
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
        
        {/* 🔔 NOTIFICATION ALERT BAR */}
        {!isSubscribed ? (
          <div className="mb-8 p-6 bg-white border-2 border-dashed border-indigo-200 rounded-[2.5rem] flex flex-col md:flex-row items-center justify-between gap-6 animate-in slide-in-from-top-4 duration-700">
            <div className="flex items-center gap-5">
              <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center shrink-0 shadow-inner">
                <Bell size={28} className="animate-pulse" />
              </div>
              <div className="text-center md:text-left">
                <h3 className="text-lg font-black uppercase italic tracking-tighter text-slate-900">Alerts Are Offline</h3>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Enable browser notifications to get live booking alerts.</p>
              </div>
            </div>
            <button 
              onClick={handleEnableNotifications}
              className="w-full md:w-auto bg-indigo-600 text-white px-10 py-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-indigo-100 hover:bg-indigo-700 active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <ShieldAlert size={16} /> Enable Now
            </button>
          </div>
        ) : (
          <div className="mb-6 flex items-center gap-2 px-4">
             {tagSynced ? (
               <span className="flex items-center gap-1.5 text-[9px] font-black text-emerald-600 uppercase tracking-widest bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100 shadow-sm">
                 <CheckCircle size={10}/> Alerts Synced
               </span>
             ) : (
               <span className="flex items-center gap-1.5 text-[9px] font-black text-amber-600 uppercase tracking-widest bg-amber-50 px-3 py-1 rounded-full border border-amber-100 shadow-sm">
                 <RefreshCw size={10} className="animate-spin"/> Syncing System...
               </span>
             )}
          </div>
        )}

        {/* TAB CONTENT ROUTER */}
        <div className="animate-in fade-in duration-500">
          {activeTab === 'dashboard' && <OverviewTab bizData={bizData} />}
          {activeTab === 'products' && <ProductsTab bizData={bizData} />}
          {activeTab === 'schedule' && <ScheduleTab bizData={bizData} />}
          {activeTab === 'orders' && <OrdersTab bizData={bizData} />}
          {activeTab === 'appointments' && <AppointmentsTab bizData={bizData} />}
        </div>
      </main>

      {/* MOBILE SIDEBAR OVERLAY */}
      {isMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-[55] md:hidden backdrop-blur-sm animate-in fade-in duration-300" 
          onClick={() => setIsMenuOpen(false)} 
        />
      )}
    </div>
  );
}