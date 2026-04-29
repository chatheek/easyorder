import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, Package, CalendarClock, 
  LogOut, Download, X, ShoppingBag, CheckCircle2 
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

export default function AdminSidebar({ 
  whatsapp, 
  activeTab, 
  setActiveTab, 
  isMenuOpen, 
  setIsMenuOpen, 
  installButton,
  businessType 
}) {
  const [showInstall, setShowInstall] = useState(false);

  useEffect(() => {
    const checkPrompt = () => {
      if (window.deferredPrompt) {
        setShowInstall(true);
      }
    };
    checkPrompt();
    const interval = setInterval(checkPrompt, 1000);
    const timeout = setTimeout(() => clearInterval(interval), 5000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [activeTab]);

  // --- DYNAMIC MENU FILTERING LOGIC ---
  const getMenuItems = () => {
    const baseItems = [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    ];

    // 1. Handle PRODUCT related tabs
    if (businessType === 'product' || businessType === 'both') {
      baseItems.push({ id: 'orders', label: 'Orders', icon: ShoppingBag });
      baseItems.push({ id: 'products', label: 'Inventory', icon: Package });
    }

    // 2. Handle SERVICE related tabs
    if (businessType === 'service' || businessType === 'both') {
      baseItems.push({ id: 'appointments', label: 'Appointments', icon: CheckCircle2 });
      baseItems.push({ id: 'schedule', label: 'Schedule', icon: CalendarClock });
    }

    return baseItems;
  };

  const handleInstallClick = async () => {
    const promptEvent = window.deferredPrompt;
    if (!promptEvent) return;
    promptEvent.prompt();
    const { outcome } = await promptEvent.userChoice;
    if (outcome === 'accepted') {
      window.deferredPrompt = null;
      setShowInstall(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = `/${whatsapp}/admin/login`;
  };

  return (
    <>
      <aside className={`
        fixed inset-y-0 left-0 z-[60] w-72 bg-slate-900 text-white transform transition-transform duration-300 ease-in-out
        md:relative md:translate-x-0 h-screen overflow-hidden flex flex-col
        ${isMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* FIXED HEADER */}
        <div className="p-6 pt-10 md:pt-6">
          <div className="flex items-center justify-between mb-2">
            <div className="space-y-1">
              <h1 className="text-2xl font-black text-indigo-400 italic tracking-tighter uppercase leading-none">
                EasyOrder
              </h1>
              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.3em]">
                {businessType === 'both' ? 'Hybrid' : businessType} Admin
              </p>
            </div>
            <button onClick={() => setIsMenuOpen(false)} className="md:hidden p-2 bg-slate-800 rounded-xl text-slate-400">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* SCROLLABLE NAV AREA */}
        <nav className="flex-1 px-6 space-y-2 overflow-y-auto no-scrollbar pt-4 pb-10"> 
          <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-4 mb-4">Main Menu</p>
          
          {getMenuItems().map((item) => (
            <button
              key={item.id}
              onClick={() => { setActiveTab(item.id); setIsMenuOpen(false); }}
              className={`w-full flex items-center gap-4 px-4 py-4 rounded-2xl font-bold text-sm transition-all active:scale-95 ${
                activeTab === item.id 
                  ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/20' 
                  : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'
              }`}
            >
              <item.icon size={20} />
              {item.label}
            </button>
          ))}
        </nav>

        {/* FIXED FOOTER */}
        <div className="p-6 border-t border-slate-800 space-y-3 bg-slate-900">
          {showInstall && (
            <button 
              onClick={handleInstallClick}
              className="w-full flex items-center justify-between px-5 py-4 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-500 hover:text-white transition-all group active:scale-95 shadow-lg shadow-emerald-900/10"
            >
              <div className="flex items-center gap-3">
                <Download size={16} className="group-hover:animate-bounce" />
                <span>Install App</span>
              </div>
              <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
            </button>
          )}

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-4 px-5 py-4 text-slate-400 hover:text-red-400 hover:bg-red-400/5 rounded-2xl font-bold text-sm transition-all active:scale-95"
          >
            <LogOut size={20} />
            Sign Out
          </button>
        </div>
      </aside>

      {isMenuOpen && (
        <div className="fixed inset-0 bg-black/60 z-[55] md:hidden backdrop-blur-sm" onClick={() => setIsMenuOpen(false)} />
      )}
    </>
  );
}