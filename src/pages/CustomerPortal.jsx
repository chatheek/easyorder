import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { ShoppingBag, Calendar, Info, RefreshCw } from 'lucide-react';

// --- SUB-COMPONENTS ---
import CustomerProductView from '../components/customer/CustomerProductView';
import CustomerServiceView from '../components/customer/CustomerServiceView';
import BusinessInfoView from '../components/customer/BusinessInfoView';

export default function CustomerPortal() {
  const { whatsapp } = useParams();
  const [bizData, setBizData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('');

  useEffect(() => {
    // --- 🛡️ SYSTEM SHIELD ---
    // Prevents "Business Not Found" or Supabase 406 errors when 
    // the browser requests system files through this dynamic route.
    const isSystemFile = 
      !whatsapp || 
      whatsapp.includes('.js') || 
      whatsapp.includes('.json') || 
      whatsapp.includes('.txt') ||
      whatsapp === 'undefined';

    if (isSystemFile) {
      setLoading(false);
      return;
    }

    const fetchBusiness = async () => {
      try {
        const { data, error } = await supabase
          .from('businesses')
          .select('*')
          .eq('whatsapp', whatsapp)
          .single();

        if (data) {
          setBizData(data);
          // Maintain existing logic: default tab based on business type
          setActiveTab(data.business_type === 'service' ? 'schedule' : 'buy');
        }
      } catch (err) {
        console.error("Portal Fetch Error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchBusiness();
  }, [whatsapp]);

  // 1. Silent return for system files to let Vercel/OneSignal handle them
  if (whatsapp?.includes('.js')) return null;

  // 2. Existing Loading State
  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50">
        <RefreshCw className="animate-spin text-indigo-600" size={32} />
      </div>
    );
  }

  // 3. Existing Error State
  if (!bizData) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50">
        <div className="p-20 text-center font-black uppercase italic text-slate-400 tracking-widest">
          Business Not Found
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-24 font-sans selection:bg-indigo-100">
      {/* --- STICKY HEADER --- */}
      <header className="bg-white p-6 border-b border-slate-100 sticky top-0 z-40">
        <div className="max-w-2xl mx-auto flex items-center gap-4">
          <div className="w-12 h-12 bg-slate-100 rounded-xl overflow-hidden flex items-center justify-center shrink-0 border border-slate-50">
            {bizData.logo_url ? (
              <img 
                src={`https://qntcbkkwflxeyjvpkoro.supabase.co/storage/v1/object/public/business-logos/${bizData.logo_url}`} 
                className="w-full h-full object-cover" 
                alt={bizData.name} 
              />
            ) : (
              <ShoppingBag className="text-slate-300" />
            )}
          </div>
          <h1 className="text-lg font-black text-slate-900 uppercase italic tracking-tighter">
            {bizData.name}
          </h1>
        </div>
      </header>

      {/* --- MAIN CONTENT AREA --- */}
      <main className="max-w-2xl mx-auto p-4 animate-in fade-in duration-500">
        {activeTab === 'buy' && <CustomerProductView bizData={bizData} />}
        {activeTab === 'schedule' && <CustomerServiceView bizData={bizData} />}
        {activeTab === 'info' && <BusinessInfoView bizData={bizData} />}
      </main>

      {/* --- FLOATING NAVIGATION --- */}
      <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-md bg-slate-900 p-2 rounded-[2rem] shadow-2xl z-50 flex justify-around border border-slate-800">
        {/* Product Tab (Conditional) */}
        {(bizData.business_type === 'product' || bizData.business_type === 'both') && (
          <button 
            onClick={() => setActiveTab('buy')} 
            className={`flex-1 flex flex-col items-center py-3 rounded-2xl transition-all duration-300 ${
              activeTab === 'buy' ? 'bg-white text-slate-900 shadow-lg' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShoppingBag size={20} />
            <span className="text-[9px] font-black uppercase mt-1">Buy</span>
          </button>
        )}

        {/* Service Tab (Conditional) */}
        {(bizData.business_type === 'service' || bizData.business_type === 'both') && (
          <button 
            onClick={() => setActiveTab('schedule')} 
            className={`flex-1 flex flex-col items-center py-3 rounded-2xl transition-all duration-300 ${
              activeTab === 'schedule' ? 'bg-white text-slate-900 shadow-lg' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Calendar size={20} />
            <span className="text-[9px] font-black uppercase mt-1">Book</span>
          </button>
        )}

        {/* Info Tab */}
        <button 
          onClick={() => setActiveTab('info')} 
          className={`flex-1 flex flex-col items-center py-3 rounded-2xl transition-all duration-300 ${
            activeTab === 'info' ? 'bg-white text-slate-900 shadow-lg' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Info size={20} />
          <span className="text-[9px] font-black uppercase mt-1">Info</span>
        </button>
      </nav>
    </div>
  );
}