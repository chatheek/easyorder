import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  Calendar, Clock, MessageSquare, Bell, 
  Phone, RefreshCw, Send, Filter, Hash, Search, X, Sparkles
} from 'lucide-react';

export default function AppointmentsTab({ bizData }) {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);
  const [searchQuery, setSearchQuery] = useState('');
  const [customMessages, setCustomMessages] = useState({});

  // --- 1. DATA FETCHING ---
  const fetchAppointments = useCallback(async (silent = false) => {
    if (!silent) setIsRefreshing(true);
    try {
      const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .eq('business_id', bizData.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAppointments(data || []);
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [bizData?.id]);

  // --- 2. REALTIME SUBSCRIPTION ---
  useEffect(() => {
    if (!bizData?.id) return;
    fetchAppointments();
    const channel = supabase
      .channel(`db_realtime_${bizData.id}`)
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'appointments', filter: `business_id=eq.${bizData.id}` }, 
        () => fetchAppointments(true)
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [bizData?.id, fetchAppointments]);

  // --- 🔗 UTILS ---
  const openWhatsApp = (number, message) => {
    const cleanNumber = number.replace(/\D/g, '');
    const formattedNumber = cleanNumber.startsWith('0') 
      ? `94${cleanNumber.substring(1)}` 
      : cleanNumber.startsWith('94') ? cleanNumber : `94${cleanNumber}`;
    window.open(`https://wa.me/${formattedNumber}?text=${encodeURIComponent(message)}`, '_blank');
  };

  // 🔔 UPCOMING REMINDER LOGIC (12h, 6h, 1h)
  const getReminderStatus = (date, time) => {
    const apptTime = new Date(`${date}T${time}`);
    const now = new Date();
    const diffHrs = (apptTime - now) / (1000 * 60 * 60);

    if (diffHrs > 0 && diffHrs <= 1.1) return '1h'; 
    if (diffHrs > 5.5 && diffHrs <= 6.5) return '6h'; 
    if (diffHrs > 11.5 && diffHrs <= 12.5) return '12h'; 
    return null;
  };

  // --- 🗓️ GROUPING LOGIC ---
  const now = new Date();
  const next24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const upcomingList = appointments
    .filter(a => {
      const d = new Date(`${a.appointment_date}T${a.appointment_time}`);
      return d >= now && d <= next24h;
    })
    .sort((a, b) => new Date(`${a.appointment_date}T${a.appointment_time}`) - new Date(`${b.appointment_date}T${b.appointment_time}`));

  const scheduleList = appointments
    .filter(a => a.appointment_date === filterDate)
    .sort((a, b) => a.appointment_time.localeCompare(b.appointment_time));

  const filteredMasterLog = appointments.filter(appt => {
    const shortId = appt.id.substring(0, 8).toUpperCase();
    const query = searchQuery.toUpperCase();
    return shortId.includes(query) || appt.whatsapp_no.includes(query) || appt.customer_name.toUpperCase().includes(query);
  });

  // --- 🎴 APPOINTMENT CARD ---
  const AppointmentCard = ({ appt, isUpcomingView = false }) => {
    const reminderType = getReminderStatus(appt.appointment_date, appt.appointment_time);
    const displayId = appt.id.substring(0, 8).toUpperCase();
    
    return (
      <div className="bg-white rounded-[2.5rem] p-6 md:p-8 border border-slate-100 shadow-xl flex flex-col lg:flex-row lg:items-center gap-8 relative overflow-hidden group">
        <div className={`absolute top-0 left-0 w-2 h-full transition-colors ${isUpcomingView ? 'bg-indigo-600' : 'bg-slate-900 group-hover:bg-indigo-400'}`} />
        
        <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-[10px] font-black text-indigo-500 uppercase tracking-widest cursor-pointer" onClick={() => navigator.clipboard.writeText(displayId)}>
              <Hash size={10}/> #{displayId}
            </div>
            <h3 className="font-black text-xl text-slate-900 leading-tight italic uppercase">{appt.customer_name}</h3>
            <div className="flex items-center gap-2 text-indigo-600 font-bold text-xs uppercase italic">
              <Calendar size={12}/> {appt.appointment_date} | <Clock size={12}/> {appt.appointment_time.slice(0,5)}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Contacts</p>
            <div className="space-y-1 font-bold text-slate-600 text-sm">
              <div className="flex items-center gap-2"><MessageSquare size={14} className="text-emerald-500"/> {appt.whatsapp_no}</div>
              {appt.contact_no && <div className="flex items-center gap-2"><Phone size={14} className="text-slate-400"/> {appt.contact_no}</div>}
            </div>
          </div>

          <div className="space-y-1">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Remarks</p>
            <p className="text-xs text-slate-500 italic font-medium leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
              {appt.remarks || 'None'}
            </p>
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-center gap-4 lg:border-l lg:pl-8 border-slate-100">
          {/* REMINDER BUTTON - ONLY IN UPCOMING */}
          {isUpcomingView && (
            <button 
              onClick={() => {
                const msg = `Hi ${appt.customer_name}, this is a reminder for your appointment #${displayId} at ${appt.appointment_time.slice(0,5)} on ${appt.appointment_date}. See you soon!`;
                openWhatsApp(appt.whatsapp_no, msg);
              }}
              className={`relative p-5 rounded-2xl transition-all active:scale-90 ${reminderType ? 'bg-indigo-600 text-white animate-pulse shadow-lg shadow-indigo-200' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}
            >
              <Bell size={24} />
              {reminderType && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-[8px] font-black text-white px-2 py-1 rounded-full uppercase">
                  {reminderType}
                </span>
              )}
            </button>
          )}

          {/* CHAT FIELD - ALWAYS AVAILABLE */}
          <div className="flex items-center bg-slate-50 rounded-2xl p-2 border border-slate-100 w-full md:w-60">
            <input 
              placeholder="Chat message..."
              className="bg-transparent border-none outline-none flex-1 px-3 text-xs font-bold text-slate-600"
              value={customMessages[appt.id] || ''}
              onChange={(e) => setCustomMessages({...customMessages, [appt.id]: e.target.value})}
            />
            <button 
              onClick={() => openWhatsApp(appt.whatsapp_no, customMessages[appt.id])}
              className="p-3 bg-slate-900 text-white rounded-xl active:scale-75 transition-all"
            >
              <Send size={14} />
            </button>
          </div>
        </div>
      </div>
    );
  };

  if (loading) return <div className="h-screen flex items-center justify-center bg-slate-50"><RefreshCw className="animate-spin text-indigo-600" size={40}/></div>;

  return (
    <div className="max-w-6xl mx-auto space-y-16 pb-24 px-4 animate-in fade-in duration-500">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-2 pt-6">
        <h2 className="text-4xl font-black text-slate-900 uppercase italic tracking-tighter flex items-center gap-4">
          Appointments
          <button onClick={() => fetchAppointments()} disabled={isRefreshing} className="p-2 bg-white rounded-full shadow-lg border active:rotate-180 transition-all duration-500">
            <RefreshCw size={18} className={`${isRefreshing ? 'animate-spin text-indigo-600' : 'text-slate-400'}`} />
          </button>
        </h2>

        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-3 bg-white p-3 rounded-3xl shadow-xl border border-slate-100">
             <Filter size={18} className="ml-2 text-slate-400" />
             <input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} className="bg-transparent border-none outline-none font-black text-indigo-600 text-sm" />
          </div>
          <div className="relative">
            <input placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="bg-white p-4 pl-12 rounded-3xl shadow-xl border border-slate-100 outline-none font-bold text-sm w-64"/>
            <Search className="absolute left-4 top-4 text-slate-400" size={18} />
          </div>
        </div>
      </div>

      {/* 🚀 NEW SECTION: UPCOMING 24 HOURS */}
      <section className="space-y-6">
        <div className="flex items-center gap-3 ml-4">
          <Sparkles className="text-amber-500" size={20} />
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] italic">Priority: Next 24 Hours</p>
        </div>
        <div className="space-y-6">
          {upcomingList.length === 0 ? (
            <div className="bg-slate-50 rounded-[3rem] py-10 text-center border-2 border-dashed border-slate-200 text-slate-300 font-bold uppercase text-[10px]">No priority sessions coming up</div>
          ) : (
            upcomingList.map(appt => <AppointmentCard key={`up-${appt.id}`} appt={appt} isUpcomingView={true} />)
          )}
        </div>
      </section>

      {/* MY SCHEDULE */}
      <section className="space-y-6">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] ml-4 italic">Daily Timeline: {filterDate}</p>
        <div className="space-y-6">
          {scheduleList.length === 0 ? (
            <div className="bg-white rounded-[3rem] py-16 text-center border-4 border-dashed border-slate-100 text-slate-200 font-black uppercase text-xs tracking-widest">Date Empty</div>
          ) : (
            scheduleList.map(appt => <AppointmentCard key={`sched-${appt.id}`} appt={appt} />)
          )}
        </div>
      </section>

      {/* MASTER LOG */}
      <section className="space-y-6">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] ml-4 italic">Complete Log</p>
        <div className="space-y-6">
          {filteredMasterLog.map(appt => <AppointmentCard key={`master-${appt.id}`} appt={appt} />)}
        </div>
      </section>
    </div>
  );
}