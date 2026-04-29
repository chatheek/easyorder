import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { 
  Calendar as CalIcon, Clock, Users, CheckCircle2, 
  ChevronRight, AlertCircle, RefreshCw, MessageSquare, Phone, Send
} from 'lucide-react';

export default function CustomerServiceView() {
  const { whatsapp } = useParams();
  const [biz, setBiz] = useState(null);
  const [hours, setHours] = useState([]);
  const [exceptions, setExceptions] = useState([]);
  const [existingAppts, setExistingAppts] = useState([]);
  
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);
  const [successData, setSuccessData] = useState(null); // Stores ID for success view

  const [formData, setFormData] = useState({
    name: '',
    whatsapp_no: '',
    contact_no: '',
    remarks: ''
  });

  // Validation: Sri Lankan Format 07xxxxxxxx (10 digits)
  const isWhatsAppValid = /^07\d{8}$/.test(formData.whatsapp_no);

  useEffect(() => { if (whatsapp) fetchBusinessData(); }, [whatsapp]);
  useEffect(() => { if (biz) fetchAvailability(); }, [selectedDate, biz]);

  const fetchBusinessData = async () => {
    try {
      const { data } = await supabase.from('businesses').select('*').eq('whatsapp', whatsapp).single();
      if (data) {
        setBiz(data);
        const { data: hr } = await supabase.from('business_hours').select('*').eq('business_id', data.id);
        setHours(hr || []);
      }
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const fetchAvailability = async () => {
    const { data: ex } = await supabase.from('business_exceptions')
      .select('*').eq('business_id', biz.id).eq('exception_date', selectedDate);
    setExceptions(ex || []);

    const { data: appts } = await supabase.from('appointments')
      .select('appointment_time').eq('business_id', biz.id).eq('appointment_date', selectedDate);
    setExistingAppts(appts || []);
  };

  const availableSlots = useMemo(() => {
    if (!biz || hours.length === 0) return [];

    const now = new Date();
    const isToday = selectedDate === now.toISOString().split('T')[0];
    const dayOfWeek = new Date(selectedDate).getDay();
    const dayShifts = hours.filter(h => h.day_of_week === dayOfWeek);
    
    let slots = [];
    const duration = biz.session_duration || 30;

    dayShifts.forEach(shift => {
      let current = new Date(`${selectedDate}T${shift.open_time}`);
      const shiftEnd = new Date(`${selectedDate}T${shift.close_time}`);

      while (current < shiftEnd) {
        const potentialEndTime = new Date(current.getTime() + duration * 60000);
        
        // 🚩 FIX: Cannot book if the session duration overflows the closing time
        if (potentialEndTime > shiftEnd) break;

        const timeStr = current.toTimeString().slice(0, 8);
        const isPast = isToday && current < now;

        const isException = exceptions.some(ex => {
          if (ex.is_closed_all_day) return true;
          return timeStr >= ex.closed_from && timeStr < ex.closed_until;
        });

        if (!isException && !isPast) {
          const bookedCount = existingAppts.filter(a => a.appointment_time === timeStr).length;
          const isFull = bookedCount >= (biz.concurrent_slots || 1);

          slots.push({
            time: timeStr.slice(0, 5),
            full: isFull,
            raw: timeStr,
            id: `${shift.id}-${timeStr}`
          });
        }
        current = new Date(current.getTime() + duration * 60000);
      }
    });

    return Array.from(new Map(slots.map(item => [item.raw, item])).values());
  }, [biz, hours, exceptions, existingAppts, selectedDate]);

  const handleBook = async () => {
    if (!selectedSlot || !formData.name || !isWhatsAppValid) return;
    setBooking(true);
    
    try {
      // 🚩 Force Supabase to return the specific ID it just created
      const { data, error } = await supabase
        .from('appointments')
        .insert([{
          business_id: biz.id,
          customer_name: formData.name,
          whatsapp_no: formData.whatsapp_no,
          contact_no: formData.contact_no,
          remarks: formData.remarks,
          appointment_date: selectedDate,
          appointment_time: selectedSlot.raw,
          status: 'pending'
        }])
        .select('id') 
        .single();

      if (error) throw error;

      if (data) {
        // 🚩 Immediately lock this ID into the Success State
        setSuccessData({ 
          id: data.id, 
          time: selectedSlot.time, 
          date: selectedDate 
        });
      }
    } catch (err) {
      console.error("Booking failed:", err);
      alert("Booking failed. Please try a different slot.");
    } finally {
      setBooking(false);
    }
  };

  const handleWhatsAppChat = () => {
    const cleanNumber = whatsapp.replace(/\D/g, '');
    const formattedNumber = cleanNumber.startsWith('0') 
      ? `94${cleanNumber.substring(1)}` 
      : cleanNumber.startsWith('94') ? cleanNumber : `94${cleanNumber}`;

    // 🚩 MATCHING ID: We use the same substring logic here for the message
    const displayId = successData.id.substring(0, 8).toUpperCase();

    const msg = `Hi, I placed an appointment (ID: #${displayId}), at ${successData.time}, on ${successData.date}`;
    const encodedMsg = encodeURIComponent(msg);

    window.open(`https://wa.me/${formattedNumber}?text=${encodedMsg}`, '_blank');
  };



  if (loading) return <div className="h-screen flex items-center justify-center bg-white"><RefreshCw className="animate-spin text-indigo-600" /></div>;

  // ... inside your successData conditional rendering ...
if (successData) return (
  <div className="h-screen flex flex-col items-center justify-center p-6 text-center space-y-8 bg-white animate-in fade-in duration-700">
    <div className="space-y-4">
      <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto shadow-inner">
        <CheckCircle2 size={40} />
      </div>
      <h1 className="text-3xl font-black uppercase italic tracking-tighter">Booking Placed!</h1>
      
      {/* 🚩 Standardized ID Display */}
      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Appointment ID</p>
        <p className="font-mono text-indigo-600 font-bold">#{successData.id.substring(0, 8).toUpperCase()}</p>
      </div>

      <p className="text-slate-500 font-bold uppercase text-[10px] tracking-[0.2em]">
        {successData.time} | {successData.date}
      </p>
    </div>

    <div className="w-full max-w-xs space-y-3">
      <button 
        onClick={handleWhatsAppChat}
        className="w-full bg-emerald-500 text-white p-5 rounded-2xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-3 shadow-lg shadow-emerald-200 active:scale-95 transition-all"
      >
        <MessageSquare size={18} /> Chat with Business
      </button>
      <button onClick={() => window.location.reload()} className="w-full text-slate-400 font-black uppercase text-[10px] tracking-widest py-2">Done</button>
    </div>
  </div>
);

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-20">
      <div className="bg-white p-10 rounded-b-[4rem] shadow-sm border-b border-slate-100 text-center space-y-4">
        <div className="relative inline-block">
          <img src={biz.logo_url ? `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/business-logos/${biz.logo_url}` : "/placeholder.png"} 
               className="w-24 h-24 mx-auto rounded-[2rem] object-cover shadow-2xl border-4 border-white" />
        </div>
        <h1 className="text-3xl font-black uppercase italic text-slate-900 tracking-tighter">{biz.name}</h1>
      </div>

      <div className="max-w-md mx-auto p-6 space-y-10 mt-4">
        {/* Step 1: Date */}
        <div className="space-y-4">
          <label className="text-[11px] font-black uppercase text-slate-400 tracking-widest ml-4 flex items-center gap-2"><CalIcon size={14}/> 1. Choose Date</label>
          <input 
            type="date" 
            min={new Date().toISOString().split('T')[0]}
            value={selectedDate}
            onChange={(e) => { setSelectedDate(e.target.value); setSelectedSlot(null); }}
            className="w-full bg-white p-6 rounded-[2.5rem] shadow-xl shadow-slate-200/50 border-none outline-none font-black text-indigo-600 italic cursor-pointer"
          />
        </div>

        {/* Step 2: Slots */}
        <div className="space-y-4">
          <label className="text-[11px] font-black uppercase text-slate-400 tracking-widest ml-4 flex items-center gap-2"><Clock size={14}/> 2. Select Time</label>
          {availableSlots.length === 0 ? (
            <div className="bg-white p-12 rounded-[3rem] text-center border-4 border-dashed border-slate-100">
              <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest italic">No slots available for this date</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              {availableSlots.map(slot => (
                <button
                  key={slot.id}
                  disabled={slot.full}
                  onClick={() => setSelectedSlot(slot)}
                  className={`p-4 rounded-2xl font-black text-sm transition-all active:scale-95 border-2 ${
                    slot.full 
                      ? 'bg-slate-50 border-slate-100 text-slate-200 cursor-not-allowed line-through' 
                      : selectedSlot?.time === slot.time
                        ? 'bg-indigo-600 border-indigo-600 text-white shadow-xl shadow-indigo-200'
                        : 'bg-white border-white text-slate-600 hover:border-indigo-100'
                  }`}
                >
                  {slot.time}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Step 3: Detailed Form */}
        {selectedSlot && (
          <div className="space-y-6 bg-white p-8 rounded-[3rem] shadow-2xl animate-in slide-in-from-bottom-8 duration-500">
            <h3 className="font-black uppercase italic text-sm text-slate-400 tracking-widest mb-4">3. Customer Information</h3>
            
            <div className="space-y-4">
              <input 
                placeholder="YOUR FULL NAME"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value.toUpperCase()})}
                className="w-full bg-slate-50 p-5 rounded-2xl border-none outline-none font-bold text-slate-700"
              />
              
              <div className="space-y-1">
                <div className="relative">
                  <input 
                    placeholder="WHATSAPP NO (07XXXXXXXX)"
                    value={formData.whatsapp_no}
                    maxLength={10}
                    onChange={(e) => setFormData({...formData, whatsapp_no: e.target.value.replace(/\D/g,'')})}
                    className={`w-full bg-slate-50 p-5 pl-12 rounded-2xl border-2 outline-none font-bold text-slate-700 transition-all ${formData.whatsapp_no && !isWhatsAppValid ? 'border-red-200' : 'border-transparent'}`}
                  />
                  <MessageSquare className="absolute left-4 top-5 text-emerald-500" size={20} />
                </div>
                {formData.whatsapp_no && !isWhatsAppValid && (
                  <p className="text-[9px] text-red-400 font-black uppercase ml-4 tracking-widest">Enter valid 10-digit number</p>
                )}
              </div>

              <div className="relative">
                <input 
                  placeholder="ALT CONTACT (OPTIONAL)"
                  value={formData.contact_no}
                  onChange={(e) => setFormData({...formData, contact_no: e.target.value.replace(/\D/g,'')})}
                  className="w-full bg-slate-50 p-5 pl-12 rounded-2xl border-none outline-none font-bold text-slate-700"
                />
                <Phone className="absolute left-4 top-5 text-slate-300" size={20} />
              </div>

              <textarea 
                placeholder="REMARKS (OPTIONAL)"
                rows={2}
                value={formData.remarks}
                onChange={(e) => setFormData({...formData, remarks: e.target.value})}
                className="w-full bg-slate-50 p-5 rounded-2xl border-none outline-none font-bold text-slate-700 resize-none"
              />
            </div>

            <button 
              onClick={handleBook}
              disabled={booking || !formData.name || !isWhatsAppValid}
              className="w-full bg-slate-900 text-white p-6 rounded-2xl font-black uppercase italic tracking-[0.2em] shadow-xl flex items-center justify-center gap-3 active:scale-95 transition-all disabled:opacity-20"
            >
              {booking ? <RefreshCw className="animate-spin" size={20} /> : <Send size={18} />}
              Confirm Booking
            </button>
          </div>
        )}
      </div>
    </div>
  );
}