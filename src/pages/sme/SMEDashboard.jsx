import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { RefreshCw, Menu, X, Bell } from 'lucide-react';

// Component Imports
import AdminSidebar from "../../components/sme/AdminSidebar";
import OverviewTab from "../../components/sme/OverviewTab";
import ProductsTab from "../../components/sme/ProductsTab";
import OrdersTab from '../../components/sme/OrdersTab';
import ScheduleTab from "../../components/sme/ScheduleTab";

export default function SMEDashboard({ installButton }) {
  const { whatsapp } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [bizData, setBizData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);

  // Security Sub-states
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [updatingPass, setUpdatingPass] = useState(false);

  // --- 🛠️ HANDLERS (Defined early to prevent ReferenceErrors) ---
  const fetchMyBusiness = async () => {
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
  };

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
    else alert("Business details updated!");
  };

  const handlePasswordReset = async (e) => {
    e.preventDefault();
    if (newPassword.length < 6) { alert("Min 6 characters required"); return; }
    setUpdatingPass(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) alert(error.message);
    else { 
      alert("Password reset successfully!"); 
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
    
    if (error) { alert("Upload failed"); return; }

    const { error: dbError } = await supabase
      .from('businesses')
      .update({ logo_url: data.path })
      .eq('id', bizData.id);

    if (!dbError) fetchMyBusiness();
  };

  // --- 🔔 ONESIGNAL LOGIC ---
// --- 🔔 ONESIGNAL PUSH NOTIFICATION LOGIC ---
useEffect(() => {
  console.log("🔄 [Bridge 1] UseEffect Triggered. BizData ID:", bizData?.id);
  if (!bizData?.id) return;

  const OS = window.OneSignal || [];

  const runSyncLogic = async () => {
    try {
      console.log("🔄 [Bridge 2] Running Sync Logic. Calling Login...");
      await OS.login(bizData.id);
      console.log("🔄 [Bridge 3] Login successful for:", bizData.id);
      
      let attempts = 0;
      const checkBridge = async () => {
        console.log(`🔄 [Bridge 4] Checking Subscription state (Attempt ${attempts})...`);
        
        // Detailed log of the User object
        console.log("🔄 [Bridge 4.1] Current User Object:", OS.User);

        const pushId = OS.User?.PushSubscription?.id;
        
        if (pushId) {
          console.log("✅ [Bridge 5] SUCCESS: Bridge Open! Push ID:", pushId);
          await OS.User.addTag("business_id", bizData.id);
          console.log("✅ [Bridge 6] Tag synced successfully.");
          setIsSubscribed(true);
        } else if (attempts < 10) {
          attempts++;
          setTimeout(checkBridge, 2000);
        } else {
          console.error("❌ [Bridge 7] TIMEOUT: No Push ID found. Check Service Worker tab.");
        }
      };
      checkBridge();
    } catch (err) {
      console.error("❌ [Bridge Error] Sync failed:", err);
    }
  };

  if (Array.isArray(OS)) {
    console.log("🔄 [Bridge 1.1] OS is an Array. Pushing logic to queue...");
    OS.push(runSyncLogic);
  } else {
    console.log("🔄 [Bridge 1.2] OS is already initialized. Running logic immediately.");
    runSyncLogic();
  }
}, [bizData?.id]);

const handleEnableNotifications = async () => {
  console.log("🖱️ [Click] Enable Notifications button clicked.");
  const OS = window.OneSignal;
  
  if (!OS || Array.isArray(OS) || !OS.Notifications) {
    console.error("❌ [Click Error] OneSignal object is hollow or missing Notifications namespace.");
    return;
  }

  try {
    console.log("🖱️ [Click 2] Requesting Permission...");
    await OS.Notifications.requestPermission();
    console.log("🖱️ [Click 3] Permission request triggered.");
  } catch (err) {
    console.error("❌ [Click Error] Permission request crashed:", err);
  }
};



  useEffect(() => { 
    fetchMyBusiness(); 
  }, [whatsapp]);

  if (loading) return (
    <div className="h-screen flex items-center justify-center bg-slate-50">
      <RefreshCw className="animate-spin text-indigo-600" size={32} />
    </div>
  );

  if (!bizData) return null;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-sans">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-4 bg-slate-900 text-white sticky top-0 z-50">
        <h2 className="text-xl font-black text-indigo-400 italic">EASYORDER</h2>
        <button onClick={() => setIsMenuOpen(!isMenuOpen)}>
          {isMenuOpen ? <X size={28} /> : <Menu size={28} />}
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

      <main className="flex-1 p-4 md:p-10 overflow-x-hidden">
        {/* 🔔 Notification Alert Bar - Only shows if not subscribed */}
        {!isSubscribed && (
          <div className="mb-6 p-4 bg-indigo-600 rounded-2xl flex items-center justify-between text-white shadow-lg">
            <div className="flex items-center gap-3">
              <Bell className="animate-bounce" size={20} />
              <div>
                <p className="text-xs font-black uppercase tracking-widest">Orders Alerts Disabled</p>
                <p className="text-[10px] opacity-80">Enable notifications to receive live order alerts.</p>
              </div>
            </div>
            <button 
              onClick={handleEnableNotifications}
              className="bg-white text-indigo-600 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95"
            >
              Enable Now
            </button>
          </div>
        )}

        {activeTab === 'dashboard' && (
          <OverviewTab 
            bizData={bizData} 
            setBizData={setBizData}
            handleUpdateDetails={handleUpdateDetails}
            handlePasswordReset={handlePasswordReset}
            handleLogoUpdate={handleLogoUpdate}
            securityState={{ newPassword, setNewPassword, showPassword, setShowPassword, updatingPass }}
          />
        )}
        
        {activeTab === 'products' && bizData?.id && (
          <ProductsTab bizData={bizData} />
        )}
        
        {activeTab === 'schedule' && bizData?.id && (
          <ScheduleTab bizData={bizData} />
        )}

        {activeTab === 'orders' && <OrdersTab bizData={bizData} />}
      </main>

      {isMenuOpen && <div className="fixed inset-0 bg-black/50 z-30 md:hidden" onClick={() => setIsMenuOpen(false)} />}
    </div>
  );
}