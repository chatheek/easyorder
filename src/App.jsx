import React, { useState, useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useParams,
} from "react-router-dom";
import OneSignal from 'react-onesignal';
import { supabase } from "./lib/supabase";
import { RefreshCw } from 'lucide-react';

// Page & Layout Imports
import DevLogin from "./pages/DevLogin";
import DevLayout from "./components/DevLayout";
import SMELogin from "./pages/sme/SMELogin";
import SMEDashboard from "./pages/sme/SMEDashboard";
import DynamicManifest from "./components/DynamicManifest";
import CustomerPortal from "./pages/CustomerPortal";

// --- CUSTOMER PORTAL GUARD ---
// This blocks the public view if the business is paused, but allows admin access.
const CustomerRouteGuard = ({ children }) => {
  const { whatsapp } = useParams();
  const [status, setStatus] = useState({ loading: true, paused: false });

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const { data, error } = await supabase
          .from("businesses")
          .select("is_paused")
          .eq("whatsapp", whatsapp)
          .maybeSingle();

        if (error || !data || data.is_paused) {
          setStatus({ loading: false, paused: true });
        } else {
          setStatus({ loading: false, paused: false });
        }
      } catch (err) {
        setStatus({ loading: false, paused: true });
      }
    };
    checkStatus();
  }, [whatsapp]);

  if (status.loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 font-black text-slate-400 uppercase tracking-widest">
        <RefreshCw className="animate-spin mr-2" size={18} />
        Loading Store...
      </div>
    );
  }

  if (status.paused) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-white p-6 text-center">
        <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic">
          Store Unavailable
        </h1>
        <p className="mt-2 text-[10px] font-black uppercase tracking-[0.2em] text-red-500">
          This business is currently paused or not found.
        </p>
        <a href="/" className="mt-8 text-[10px] font-bold uppercase underline text-slate-400">
          Back to Home
        </a>
      </div>
    );
  }

  return children;
};

// --- PROTECTED ROUTE COMPONENT (FOR DEVELOPER) ---
const ProtectedDevRoute = ({ children }) => {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });
  }, []);

  if (loading)
    return (
      <div className="flex h-screen items-center justify-center font-black text-slate-400 uppercase tracking-widest bg-slate-50">
        <RefreshCw className="animate-spin mr-2" size={18} />
        Verifying Session...
      </div>
    );

  if (!session || session.user.email !== "easyorder_dev@gmail.com") {
    return <Navigate to="/devlogin" />;
  }

  return children;
};

function App() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);

  useEffect(() => {
    // 1. SESSION SYNC & PERSISTENCE
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        setDeferredPrompt(null);
        window.deferredPrompt = null;
      }
    });

    // 2. PWA INSTALL LOGIC
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      window.deferredPrompt = e;
      console.log("✅ PWA: Install prompt captured and saved globally.");
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // 3. STANDALONE CHECK
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setDeferredPrompt(null);
      window.deferredPrompt = null;
    }

    // 4. ONESIGNAL INITIALIZATION
    const initOneSignal = async () => {
  if (window.OneSignalInitialized) return;

  try {
    await OneSignal.init({
      appId: "42e5b71c-8a96-40c9-88c7-7268b2fe54e8",
      allowLocalhostAsSecureOrigin: true,
      // Change: Ensure no leading slash if your host treats it as relative, 
      // or keep it if it's absolute. Most importantly, set the scope.
      serviceWorkerPath: "OneSignalSDKWorker.js", 
      serviceWorkerParam: { scope: "/" }, 
      notifyButton: { enable: false },
    });
    
    // Check if the worker is actually registered
    const registration = await navigator.serviceWorker.getRegistration("/");
    if (registration) {
      console.log("✅ OneSignal Service Worker is registered at root scope.");
    } else {
      console.warn("⚠️ OneSignal Service Worker not found at root. Check public folder.");
    }

    window.OneSignalInitialized = true;
    console.log("🔔 OneSignal: Service Initialized");
  } catch (error) {
    if (error.message?.includes("already initialized")) return;
    console.error("OneSignal Error:", error);
  }
};

    initOneSignal();

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      subscription.unsubscribe();
    };
  }, []);

  // 5. MANUAL INSTALL TRIGGER
  const handleInstallClick = async () => {
    const promptToUse = deferredPrompt || window.deferredPrompt;
    if (!promptToUse) return;

    promptToUse.prompt();
    const { outcome } = await promptToUse.userChoice;
    
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
      window.deferredPrompt = null;
      console.log("User accepted the PWA install");
    }
  };

  const renderSubPageInstallButton = (label) => (
    (deferredPrompt || window.deferredPrompt) ? (
      <button
        onClick={handleInstallClick}
        className="fixed bottom-6 right-6 bg-slate-900 text-white px-6 py-3 rounded-full font-bold shadow-2xl flex items-center gap-2 z-50 text-[10px] animate-pulse border border-slate-700"
      >
        <span className="uppercase tracking-[0.2em]">{label}</span>
      </button>
    ) : null
  );

  return (
    <Router>
      <div className="min-h-screen text-gray-900 font-sans selection:bg-indigo-100 selection:text-indigo-900">
        <Routes>
          {/* --- PUBLIC LANDING --- */}
          <Route
            path="/"
            element={
              <div className="flex h-screen flex-col items-center justify-center bg-slate-50 p-6 text-center">
                <div className="space-y-2">
                  <h1 className="text-5xl md:text-7xl font-black text-slate-900 tracking-tighter uppercase italic">
                    EasyOrder
                  </h1>
                  <p className="text-[11px] font-black uppercase tracking-[0.4em] text-slate-400">
                    SME Management Platform
                  </p>
                </div>
              </div>
            }
          />

          {/* --- DEV PORTAL --- */}
          <Route path="/devlogin" element={<DevLogin />} />
          <Route
            path="/devdashboard/*"
            element={
              <ProtectedDevRoute>
                <DevLayout />
              </ProtectedDevRoute>
            }
          />

          {/* --- SME ADMIN ROUTES --- */}
          <Route 
            path="/:whatsapp/admin/login" 
            element={
              <>
                <DynamicManifest />
                <SMELogin installButton={renderSubPageInstallButton("Install App")} />
              </>
            } 
          />

          <Route 
            path="/:whatsapp/admin" 
            element={
              <>
                <DynamicManifest />
                <SMEDashboard installButton={renderSubPageInstallButton("Install App")} />
              </>
            } 
          />

          {/* --- PROTECTED CUSTOMER PORTAL --- */}
          <Route 
            path="/:whatsapp" 
            element={
              <CustomerRouteGuard>
                <CustomerPortal />
              </CustomerRouteGuard>
            } 
          />

          {/* --- 404 CATCH-ALL --- */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;