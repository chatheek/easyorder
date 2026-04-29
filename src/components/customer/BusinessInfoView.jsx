import React, { useState, useEffect } from 'react';
import { 
  MapPin, MessageSquare, ChevronRight, Info, Clock, 
  ShoppingBag, Calendar, Hash, Tag, RefreshCw, Search, Send,
  History, AlertCircle
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

export default function BusinessInfoView({ bizData }) {
  const [orders, setOrders] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [lookupNumber, setLookupNumber] = useState('');
  const [hasSearched, setHasSearched] = useState(false);

  const fetchCustomerHistory = async (e) => {
    if (e) e.preventDefault();
    if (!lookupNumber || lookupNumber.length < 10) {
      alert("Please enter a valid 10-digit WhatsApp number");
      return;
    }

    setLoading(true);
    try {
      // 1. Fetch Orders - Latest First
      const { data: ordData } = await supabase
        .from('orders')
        .select('*')
        .eq('business_id', bizData.id)
        .eq('customer_whatsapp', lookupNumber)
        .order('created_at', { ascending: false });

      // 2. Fetch All Appointments - Latest First
      const { data: apptData } = await supabase
        .from('appointments')
        .select('*')
        .eq('business_id', bizData.id)
        .eq('whatsapp_no', lookupNumber)
        .order('appointment_date', { ascending: false })
        .order('appointment_time', { ascending: false });

      setOrders(ordData || []);
      setAppointments(apptData || []);
      setHasSearched(true);
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const checkIsUpcoming = (date, time) => {
    const apptDateTime = new Date(`${date}T${time}`);
    return apptDateTime > new Date();
  };

  const formatWA = (num) => {
    const clean = num.replace(/\D/g, '');
    return clean.startsWith('0') ? `94${clean.substring(1)}` : clean;
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8 pb-24 animate-in fade-in duration-500">
      
      {/* SECTION 1: BUSINESS PROFILE */}
      <div className="bg-white p-8 rounded-[3rem] shadow-xl border border-slate-50 space-y-6 text-center">
        <img 
          src={bizData.logo_url ? `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/business-logos/${bizData.logo_url}` : "/placeholder.png"} 
          className="w-24 h-24 mx-auto rounded-[2.5rem] object-cover shadow-2xl border-4 border-white mb-2"
        />
        <h1 className="text-3xl font-black uppercase italic text-slate-900 tracking-tighter leading-none">{bizData.name}</h1>
        <button 
          onClick={() => window.open(`https://wa.me/${formatWA(bizData.whatsapp)}`, '_blank')}
          className="w-full flex items-center justify-center gap-3 p-5 bg-emerald-500 text-white rounded-[2rem] shadow-lg active:scale-95 transition-all font-black uppercase italic tracking-widest text-xs"
        >
          <MessageSquare size={18} /> Chat with Store
        </button>
      </div>

      {/* SECTION 2: HISTORY LOOKUP */}
      <div className="bg-slate-900 p-8 rounded-[3rem] shadow-2xl text-white space-y-6">
        <div className="space-y-1">
          <h3 className="font-black uppercase italic text-indigo-400 text-sm flex items-center gap-2">
            <Search size={18}/> Tracking Center
          </h3>
          <p className="text-[9px] text-slate-400 uppercase font-black tracking-widest">Lookup your orders & bookings</p>
        </div>

        <form onSubmit={fetchCustomerHistory} className="relative">
          <input 
            type="tel"
            placeholder="07XXXXXXXX"
            maxLength={10}
            value={lookupNumber}
            onChange={(e) => setLookupNumber(e.target.value.replace(/\D/g,''))}
            className="w-full bg-slate-800 border-none rounded-2xl p-5 text-lg font-black tracking-widest text-indigo-400 placeholder:text-slate-700 outline-none"
          />
          <button 
            type="submit"
            disabled={loading || lookupNumber.length < 10}
            className="absolute right-2 top-2 bottom-2 bg-indigo-600 hover:bg-indigo-500 px-6 rounded-xl transition-all active:scale-90 disabled:opacity-20"
          >
            {loading ? <RefreshCw className="animate-spin" size={20}/> : <Send size={20}/>}
          </button>
        </form>
      </div>

      {hasSearched && (
        <div className="space-y-12 px-2 animate-in slide-in-from-bottom-4">
          
          {/* SECTION 3: ORDER SUMMARY */}
          <div className="space-y-4">
            <h3 className="flex items-center gap-3 text-lg font-black uppercase italic text-slate-800 tracking-tighter">
              <ShoppingBag className="text-indigo-600" size={20} /> Order History
            </h3>
            
            {orders.length === 0 ? (
              <div className="bg-white p-10 rounded-[2.5rem] text-center border-2 border-dashed border-slate-100 text-slate-300 font-bold uppercase text-[10px]">No orders found</div>
            ) : (
              <div className="space-y-3">
                {orders.map(order => (
                  <div key={order.id} className="bg-white p-6 rounded-[2rem] border border-slate-50 shadow-sm flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-[9px] font-black text-indigo-400 uppercase">#{order.id.substring(0,8).toUpperCase()}</p>
                      <p className="text-sm font-black text-slate-700 uppercase italic">Rs. {order.total_amount}</p>
                      <p className="text-[10px] text-slate-400 font-medium line-clamp-1 italic">
                        {order.items?.map(i => `${i.name} x${i.quantity}`).join(', ')}
                      </p>
                    </div>
                    <div className="text-right space-y-1">
                      <span className="block px-3 py-1 bg-slate-50 text-slate-500 rounded-full text-[8px] font-black uppercase border border-slate-100">
                        {order.status}
                      </span>
                      <p className="text-[8px] font-bold text-slate-300 uppercase">{new Date(order.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* SECTION 4: APPOINTMENT SUMMARY (Marked Past/Upcoming) */}
          <div className="space-y-4 pb-10">
            <h3 className="flex items-center gap-3 text-lg font-black uppercase italic text-slate-800 tracking-tighter">
              <Calendar className="text-indigo-600" size={20} /> Booking History
            </h3>
            
            {appointments.length === 0 ? (
              <div className="bg-white p-10 rounded-[2.5rem] text-center border-2 border-dashed border-slate-100 text-slate-300 font-bold uppercase text-[10px]">No bookings found</div>
            ) : (
              <div className="space-y-4">
                {appointments.map(appt => {
                  const isUpcoming = checkIsUpcoming(appt.appointment_date, appt.appointment_time);
                  
                  return (
                    <div key={appt.id} className={`p-6 rounded-[2rem] shadow-lg flex items-center justify-between relative overflow-hidden group border-2 ${isUpcoming ? 'bg-indigo-600 text-white border-indigo-500' : 'bg-white text-slate-400 border-slate-50 opacity-80'}`}>
                      
                      <div className="space-y-1 relative z-10">
                        <div className="flex items-center gap-2 mb-1">
                           {isUpcoming ? (
                             <span className="px-2 py-0.5 bg-white text-indigo-600 text-[8px] font-black rounded-full uppercase animate-pulse">Upcoming</span>
                           ) : (
                             <span className="px-2 py-0.5 bg-slate-100 text-slate-400 text-[8px] font-black rounded-full uppercase">Past Session</span>
                           )}
                           <p className={`text-[9px] font-black uppercase ${isUpcoming ? 'text-indigo-200' : 'text-slate-300'}`}>#{appt.id.substring(0,8).toUpperCase()}</p>
                        </div>
                        
                        <p className={`text-xl font-black uppercase italic tracking-wider ${isUpcoming ? 'text-white' : 'text-slate-600'}`}>
                          {appt.appointment_time.slice(0,5)}
                        </p>
                        <p className={`text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 ${isUpcoming ? 'text-indigo-100' : 'text-slate-400'}`}>
                          <Calendar size={12}/> {appt.appointment_date}
                        </p>
                      </div>

                      <div className={`p-4 rounded-2xl relative z-10 ${isUpcoming ? 'bg-white/10' : 'bg-slate-50'}`}>
                        {isUpcoming ? <Clock size={24} className="text-white" /> : <History size={24} className="text-slate-200" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}