import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { 
  RefreshCw, Menu, X, Bell 
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
  
  // --- 🔔 NOTIFICATION STATES ---
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [tagSynced, setTagSynced] = useState(false);

  // --- 🔒 SECURITY STATES ---
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [updatingPass, setUpdatingPass] = useState(false);

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

  // --- 🔔 ONESIGNAL SYNC LOGIC ---
  useEffect(() => {
    if (!bizData?.id) return;

    const OS = window.OneSignal || [];

    // Inside SMEDashboard.jsx useEffect
const runSyncLogic = async () => {
  try {
    const permission = await OS.Notifications.permission;
    
    // 🚩 FIX: If permission is NOT granted, don't try to tag or login yet
    if (permission !== "granted") {
      setIsSubscribed(false);
      return; 
    }

    await OS.login(bizData.id);
    
    // Use a small delay or a check to ensure the subscription is ready
    let attempts = 0;
    const checkBridge = async () => {
      const pushId = OS.User?.PushSubscription?.id;
      
      if (pushId) {
        await OS.User.addTag("business_id", bizData.id);
        setIsSubscribed(true);
      } else if (attempts < 10) {
        attempts++;
        setTimeout(checkBridge, 1000); // Check every second for 10 seconds
      }
    };
    checkBridge();
  } catch (err) {
    console.error("Sync failed:", err);
  }
};

    if (Array.isArray(OS)) {
      OS.push(runSyncLogic);
    } else {
      runSyncLogic();
    }
  }, [bizData?.id]);

  // --- ⚙️ EVENT HANDLERS ---
  const handleUpdateDetails = async (e) => {
    e.preventDefault();
    if (!bizData) return;
    const { error } = await supabase
      .from('businesses')
      .update({
        name: bizData.name,
        address: bizData.address,
        reg_no: bizData.reg_no
      })
      .eq('id', bizData.id);

    if (error) alert("Update failed: " + error.message);
    else alert("Business details updated successfully!");
  };

  const handlePasswordReset = async (e) => {
    e.preventDefault();
    if (newPassword.length < 6) { 
        alert("Password must be at least 6 characters."); 
        return; 
    }
    setUpdatingPass(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) alert(error.message);
    else { 
      alert("Password updated successfully!"); 
      setNewPassword('');
    }
    setUpdatingPass(false);
  };

  const handleLogoUpdate = async (e) => {
    const file = e.target.files[0];
    if (!file || !bizData) return;
    const fileExt = file.name.split('.').pop();
    const fileName = `${bizData.id}-${Date.now()}.${fileExt}`;

    const { data, error } = await supabase.storage
      .from('business-logos')
      .upload(fileName, file);
    
    if (error) { alert("Logo upload failed"); return; }

    const { error: dbError } = await supabase
      .from('businesses')
      .update({ logo_url: data.path })
      .eq('id', bizData.id);

    if (!dbError) fetchMyBusiness();
  };

  useEffect(() => { 
    fetchMyBusiness(); 
  }, [fetchMyBusiness]);

  // --- 🖥️ RENDER ---
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
        
        {/* TAB CONTENT ROUTER */}
        <div className="animate-in fade-in duration-500">
          {activeTab === 'dashboard' && (
            <OverviewTab 
              bizData={bizData} 
              setBizData={setBizData}
              handleUpdateDetails={handleUpdateDetails}
              handlePasswordReset={handlePasswordReset}
              handleLogoUpdate={handleLogoUpdate}
              securityState={{ 
                newPassword, 
                setNewPassword, 
                showPassword, 
                setShowPassword, 
                updatingPass 
              }}
              isSubscribed={isSubscribed}
              isSyncing={!tagSynced && isSubscribed}
            />
          )}
          
          {activeTab === 'products' && bizData?.id && (
            <ProductsTab bizData={bizData} />
          )}
          
          {activeTab === 'schedule' && bizData?.id && (
            <ScheduleTab bizData={bizData} />
          )}

          {activeTab === 'orders' && <OrdersTab bizData={bizData} />}
          {activeTab === 'appointments' && <AppointmentsTab bizData={bizData} />}
        </div>
      </main>

      {/* MOBILE OVERLAY */}
      {isMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-[55] md:hidden backdrop-blur-sm" 
          onClick={() => setIsMenuOpen(false)} 
        />
      )}
    </div>
  );
}