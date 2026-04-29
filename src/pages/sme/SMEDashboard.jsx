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
  if (!bizData?.id) return;

  const OneSignal = window.OneSignal || [];

  OneSignal.push(async () => {
    console.log("🚩 [CP 1] OneSignal Logic Start");
    try {
      // 1. AVOID CRASH: Only init if not already initialized
      if (OneSignal.initialized) {
        console.log("🚩 [CP 2] SDK already initialized, skipping init.");
      } else {
        console.log("🚩 [CP 2] Initializing SDK...");
        await OneSignal.init({
          appId: "42e5b71c-8a96-40c9-88c7-7268b2fe54e8",
          allowLocalhostAsSecureOrigin: true,
          serviceWorkerPath: "OneSignalSDKWorker-v3.js",
          serviceWorkerParam: { scope: "/" }
        });
      }

      // 2. CHECK PERMISSION
      const permission = await OneSignal.Notifications.permission;
      console.log("🚩 [CP 3] Permission status:", permission);
      setIsSubscribed(permission === 'granted');

      // 3. ATTEMPT SYNC
    const syncUser = async () => {
  console.log("🚩 [CP 4] Bridge Check Started...");
  try {
    // Force a login to trigger the handshake
    await OneSignal.login(bizData.id);

    let attempts = 0;
    const checkBridge = async () => {
      // The pushId only populates when the postMessage bridge is successful
      const pushId = OneSignal.User.PushSubscription.id;
      
      if (pushId) {
        console.log("✅ [CP 5] Bridge Open! ID:", pushId);
        await OneSignal.User.addTag("business_id", bizData.id);
        
        // Final verification
        const tags = await OneSignal.User.getTags();
        if (tags?.business_id) {
          console.log("🎊 SUCCESS: Desktop Identity Synced!");
          setIsSubscribed(true);
        }
      } else if (attempts < 8) {
        attempts++;
        console.log(`⏳ [CP 5.1] Bridge blocked by browser (Attempt ${attempts})...`);
        // If this keeps failing, the 'Service-Worker-Allowed' header is definitely missing
        setTimeout(checkBridge, 2000);
      } else {
        console.error("❌ [CP 6] Bridge Timeout. Please check if Service-Worker-Allowed header is live.");
      }
    };

    checkBridge();
  } catch (err) {
    console.error("Sync Error:", err);
  }
};

      if (permission === 'granted') {
        // Wait 2 seconds for the "sw.ts:21" evaluation warning to pass
        setTimeout(syncUser, 2000);
      }

      OneSignal.Notifications.addEventListener("permissionChange", async (granted) => {
        console.log("🔄 Permission Change Event:", granted);
        setIsSubscribed(granted);
        if (granted) setTimeout(syncUser, 2000);
      });

    } catch (err) {
      // This catches the "Already Initialized" error if my check fails
      if (!err.message?.includes("already initialized")) {
        console.error("🚩 OneSignal Setup Error:", err);
      } else {
        console.log("🚩 Prevented Duplicate Init Crash.");
      }
    }
  });
}, [bizData?.id]);

  const handleEnableNotifications = () => {
    if (window.OneSignal) {
      window.OneSignal.push(() => {
        window.OneSignal.Notifications.requestPermission();
      });
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