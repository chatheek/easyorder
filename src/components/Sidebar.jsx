import { UserPlus, Building2, LogOut, Download, Shield } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { usePWAInstall } from '../hooks/usePWAInstall';

export default function Sidebar({ closeMobileMenu }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { installPrompt, installApp } = usePWAInstall();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    if (closeMobileMenu) closeMobileMenu();
    navigate('/devlogin');
  };

  const handleNavigation = (path) => {
    navigate(path);
    if (closeMobileMenu) closeMobileMenu(); // Closes sidebar on mobile after click
  };

  const menuItems = [
    { name: 'Onboard SME', icon: <UserPlus size={20} />, path: '/devdashboard' },
    { name: 'Businesses', icon: <Building2 size={20} />, path: '/devdashboard/businesses' },
  ];

  return (
    <aside className="w-72 bg-slate-900 text-white flex flex-col h-screen shadow-2xl">
      {/* Branding */}
      <div className="p-8 border-b border-slate-800 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tighter text-indigo-400 italic uppercase">EasyOrder</h1>
          <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-widest font-bold">Platform Dev</p>
        </div>
        <Shield size={20} className="text-slate-700" />
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2 mt-4">
        {menuItems.map((item) => (
          <button
            key={item.path}
            onClick={() => handleNavigation(item.path)}
            className={`w-full flex items-center gap-3 p-4 rounded-2xl transition-all active:scale-95 ${
              location.pathname === item.path 
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/40' 
                : 'text-slate-400 hover:bg-slate-800'
            }`}
          >
            {item.icon}
            <span className="font-bold text-sm tracking-tight">{item.name}</span>
          </button>
        ))}

        {/* PWA Install Option Inside Sidebar */}
        {installPrompt && (
          <button
            onClick={installApp}
            className="w-full flex items-center gap-3 p-4 mt-4 rounded-2xl bg-slate-800 border border-slate-700 text-indigo-400 hover:border-indigo-500 transition-all active:scale-95"
          >
            <Download size={20} />
            <span className="font-bold text-sm tracking-tight italic">Install Dev App</span>
          </button>
        )}
      </nav>

      {/* Footer / Logout */}
      <div className="p-4 border-t border-slate-800">
        <button 
          onClick={handleLogout} 
          className="flex items-center gap-3 w-full p-4 text-slate-500 hover:text-red-400 transition-colors font-bold text-sm"
        >
          <LogOut size={20} />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}