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
    const fetchBusiness = async () => {
      try {
        const { data, error } = await supabase
          .from('businesses')
          .select('*')
          .eq('whatsapp', whatsapp)
          .single();

        if (data) {
          setBizData(data);
          setActiveTab(data.business_type === 'service' ? 'schedule' : 'buy');
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchBusiness();
  }, [whatsapp]);

  if (loading) return <div className="h-screen flex items-center justify-center"><RefreshCw className="animate-spin text-indigo-600" /></div>;
  if (!bizData) return <div className="p-20 text-center font-black uppercase italic">Business Not Found</div>;

  return (
    <div className="min-h-screen bg-slate-50 pb-24 font-sans">
      <header className="bg-white p-6 border-b border-slate-100 sticky top-0 z-40">
        <div className="max-w-2xl mx-auto flex items-center gap-4">
          <div className="w-12 h-12 bg-slate-100 rounded-xl overflow-hidden flex items-center justify-center shrink-0">
            {bizData.logo_url ? (
              <img src={`https://qntcbkkwflxeyjvpkoro.supabase.co/storage/v1/object/public/business-logos/${bizData.logo_url}`} className="w-full h-full object-cover" alt="" />
            ) : <ShoppingBag className="text-slate-300" />}
          </div>
          <h1 className="text-lg font-black text-slate-900 uppercase italic tracking-tighter">{bizData.name}</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-4">
        {activeTab === 'buy' && <CustomerProductView bizData={bizData} />}
        {activeTab === 'schedule' && <CustomerServiceView bizData={bizData} />}
        {activeTab === 'info' && <BusinessInfoView bizData={bizData} />}
      </main>

      <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-md bg-slate-900 p-2 rounded-[2rem] shadow-2xl z-50 flex justify-around">
        {(bizData.business_type === 'product' || bizData.business_type === 'both') && (
          <button onClick={() => setActiveTab('buy')} className={`flex-1 flex flex-col items-center py-3 rounded-2xl ${activeTab === 'buy' ? 'bg-white text-slate-900' : 'text-slate-400'}`}>
            <ShoppingBag size={20} /><span className="text-[9px] font-black uppercase mt-1">Buy</span>
          </button>
        )}
        {(bizData.business_type === 'service' || bizData.business_type === 'both') && (
          <button onClick={() => setActiveTab('schedule')} className={`flex-1 flex flex-col items-center py-3 rounded-2xl ${activeTab === 'schedule' ? 'bg-white text-slate-900' : 'text-slate-400'}`}>
            <Calendar size={20} /><span className="text-[9px] font-black uppercase mt-1">Book</span>
          </button>
        )}
        <button onClick={() => setActiveTab('info')} className={`flex-1 flex flex-col items-center py-3 rounded-2xl ${activeTab === 'info' ? 'bg-white text-slate-900' : 'text-slate-400'}`}>
          <Info size={20} /><span className="text-[9px] font-black uppercase mt-1">Info</span>
        </button>
      </nav>
    </div>
  );
}