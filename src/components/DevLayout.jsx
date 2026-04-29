import React, { useState } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import DevDashboard from '../pages/DevDashboard';
import BusinessList from '../pages/BusinessList';
import { Menu, X, PlusCircle, LayoutGrid } from 'lucide-react';

const DevLayout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const location = useLocation();

  // Helper to highlight active mobile nav items
  const isActive = (path) => {
    if (path === '/devdashboard' && location.pathname === '/devdashboard') return true;
    return location.pathname.includes(path) && path !== '/devdashboard';
  };

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-slate-50 font-sans">
      
      {/* --- MOBILE TOP BAR --- */}
      <div className="md:hidden flex items-center justify-between p-5 bg-slate-900 text-white sticky top-0 z-50 shadow-lg">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center">
            <span className="text-xs font-black italic">EO</span>
          </div>
          <h2 className="text-lg font-black tracking-tighter italic text-indigo-400">DEV PANEL</h2>
        </div>
        <button 
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="p-2 bg-slate-800 rounded-xl active:scale-90 transition-transform"
        >
          {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* --- SHARED SIDEBAR --- */}
      {/* Logic for mobile: Overlay. Logic for desktop: Fixed sidebar. */}
      <div className={`
        fixed inset-0 z-40 transform transition-transform duration-300 md:relative md:translate-x-0 md:z-auto
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <Sidebar closeMobileMenu={() => setIsSidebarOpen(false)} />
        
        {/* Mobile Overlay Background */}
        {isSidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/60 md:hidden -z-10"
            onClick={() => setIsSidebarOpen(false)}
          ></div>
        )}
      </div>

      {/* --- MAIN CONTENT AREA --- */}
      <main className="flex-1 h-screen overflow-y-auto pb-24 md:pb-0">
        <Routes>
          <Route index element={<DevDashboard />} /> 
          <Route path="businesses" element={<BusinessList />} />
        </Routes>
      </main>

      {/* --- MOBILE BOTTOM NAVIGATION (PWA EXCLUSIVE) --- */}
      {/* This only shows on mobile to give a "native app" feel */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 px-6 py-3 flex justify-around items-center z-50">
        <Link 
          to="/devdashboard" 
          className={`flex flex-col items-center gap-1 ${isActive('/devdashboard') ? 'text-indigo-600' : 'text-slate-400'}`}
        >
          <PlusCircle size={20} />
          <span className="text-[10px] font-black uppercase tracking-widest">Onboard</span>
        </Link>
        
        <Link 
          to="/devdashboard/businesses" 
          className={`flex flex-col items-center gap-1 ${isActive('businesses') ? 'text-indigo-600' : 'text-slate-400'}`}
        >
          <LayoutGrid size={20} />
          <span className="text-[10px] font-black uppercase tracking-widest">Ledger</span>
        </Link>
      </nav>
    </div>
  );
};

export default DevLayout;