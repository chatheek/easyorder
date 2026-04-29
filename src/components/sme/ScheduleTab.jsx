import React, { useState, useEffect } from 'react';
import { 
  Clock, Calendar, Plus, Trash2, X, RefreshCw, 
  ToggleLeft, ToggleRight, CalendarOff, Coffee, Check,
  Moon, Sun, Users, Hourglass, Save
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

export default function ScheduleTab({ bizData }) {
  const [hours, setHours] = useState([]);
  const [exceptions, setExceptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // --- New Slot States ---
  const [slotSettings, setSlotSettings] = useState({
    session_duration: 30,
    concurrent_slots: 1
  });
  const [updatingSlots, setUpdatingSlots] = useState(false);

  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  useEffect(() => { 
    if (bizData?.id) {
      fetchData();
      // Initialize slot settings from bizData
      setSlotSettings({
        session_duration: bizData.session_duration || 30,
        concurrent_slots: bizData.concurrent_slots || 1
      });
    } 
  }, [bizData?.id]);

  const fetchData = async () => {
    setLoading(true);
    try {
      await supabase.rpc('delete_past_exceptions'); 
      const { data: hrData } = await supabase.from('business_hours').select('*').eq('business_id', bizData.id).order('day_of_week', { ascending: true });
      const { data: exData } = await supabase.from('business_exceptions').select('*').eq('business_id', bizData.id).order('exception_date', { ascending: true });
      setHours(hrData || []);
      setExceptions(exData || []);
    } finally {
      setLoading(false);
    }
  };

  // --- SLOT SETTINGS LOGIC ---
  const handleUpdateSlotSettings = async () => {
    setUpdatingSlots(true);
    const { error } = await supabase
      .from('businesses')
      .update({
        session_duration: parseInt(slotSettings.session_duration),
        concurrent_slots: parseInt(slotSettings.concurrent_slots)
      })
      .eq('id', bizData.id);

    if (error) alert("Failed to update settings");
    else alert("Booking settings updated!");
    setUpdatingSlots(false);
  };

  // --- REGULAR HOURS LOGIC (Keep existing) ---
  const addShift = async (dayIdx) => {
    const dayShifts = hours.filter(h => h.day_of_week === dayIdx);
    let nextOpen = "08:00:00";
    if (dayShifts.length > 0) {
      const lastShift = dayShifts[dayShifts.length - 1];
      const [h] = lastShift.close_time.split(':');
      nextOpen = `${(parseInt(h) + 1).toString().padStart(2, '0')}:00:00`;
    }

    const { data, error } = await supabase.from('business_hours').insert([
      { business_id: bizData.id, day_of_week: dayIdx, open_time: nextOpen, close_time: '20:00:00' }
    ]).select();
    
    if (!error && data) setHours(prev => [...prev, ...data]);
  };

  const updateShiftTime = async (id, field, value) => {
    const formattedValue = value.length === 5 ? `${value}:00` : value;
    setHours(prev => prev.map(h => h.id === id ? { ...h, [field]: formattedValue } : h));
    await supabase.from('business_hours').update({ [field]: formattedValue }).eq('id', id);
  };

  const removeShift = async (id) => {
    const { error } = await supabase.from('business_hours').delete().eq('id', id);
    if (!error) setHours(prev => prev.filter(h => h.id !== id));
  };

  const toggleDayClosed = async (dayIdx, isCurrentlyClosed) => {
    if (!isCurrentlyClosed) {
      if (window.confirm(`Mark ${days[dayIdx]} as closed whole day?`)) {
        const { error } = await supabase.from('business_hours').delete().eq('business_id', bizData.id).eq('day_of_week', dayIdx);
        if (!error) setHours(prev => prev.filter(h => h.day_of_week !== dayIdx));
      }
    } else {
      addShift(dayIdx);
    }
  };

  // --- EXCEPTIONS LOGIC (Keep existing) ---
  const [newEx, setNewEx] = useState({ date: '', allDay: false, from: '08:00', until: '17:00', reason: '' });

  const addException = async () => {
    if (!newEx.date) return;
    setSaving(true);
    const { error } = await supabase.from('business_exceptions').insert([{
      business_id: bizData.id,
      exception_date: newEx.date,
      is_closed_all_day: newEx.allDay,
      closed_from: newEx.allDay ? null : `${newEx.from}:00`,
      closed_until: newEx.allDay ? null : `${newEx.until}:00`,
      reason: newEx.reason
    }]);
    if (!error) {
      setNewEx({ date: '', allDay: false, from: '08:00', until: '17:00', reason: '' });
      fetchData();
    }
    setSaving(false);
  };

  if (loading) return <div className="h-screen flex items-center justify-center"><RefreshCw className="animate-spin text-indigo-600" size={32}/></div>;

  return (
    <div className="max-w-6xl mx-auto space-y-12 pb-24 px-2">
      
      {/* 🛠️ SLOT CONFIGURATION SECTION */}
      <section className="space-y-6">
        <div className="px-2">
          <h2 className="text-3xl font-black text-slate-900 uppercase italic tracking-tighter">Booking Strategy</h2>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] italic">Define session lengths and capacity</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-xl flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-indigo-600">
                <Hourglass size={24} />
                <span className="font-black uppercase italic text-sm">Session Duration</span>
              </div>
              <div className="flex items-end gap-2">
                <input 
                  type="number" 
                  value={slotSettings.session_duration}
                  onChange={(e) => setSlotSettings({...slotSettings, session_duration: e.target.value})}
                  className="w-24 text-4xl font-black text-slate-900 border-b-4 border-indigo-100 focus:border-indigo-500 outline-none transition-all"
                />
                <span className="font-black text-slate-400 uppercase text-xs mb-2 italic">Minutes</span>
              </div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-relaxed">
                Time allocated per customer appointment.
              </p>
            </div>
          </div>

          <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-xl flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-emerald-500">
                <Users size={24} />
                <span className="font-black uppercase italic text-sm">Concurrent Capacity</span>
              </div>
              <div className="flex items-end gap-2">
                <input 
                  type="number" 
                  value={slotSettings.concurrent_slots}
                  onChange={(e) => setSlotSettings({...slotSettings, concurrent_slots: e.target.value})}
                  className="w-24 text-4xl font-black text-slate-900 border-b-4 border-emerald-100 focus:border-emerald-500 outline-none transition-all"
                />
                <span className="font-black text-slate-400 uppercase text-xs mb-2 italic">Persons</span>
              </div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-relaxed">
                How many customers can be served at the same time?
              </p>
            </div>
          </div>

          <div className="flex items-center justify-center">
            <button 
              onClick={handleUpdateSlotSettings}
              disabled={updatingSlots}
              className="group bg-slate-900 hover:bg-indigo-600 text-white w-full h-full min-h-[150px] rounded-[3rem] transition-all duration-500 flex flex-col items-center justify-center gap-4 shadow-2xl active:scale-95"
            >
              {updatingSlots ? <RefreshCw className="animate-spin" /> : <Save className="group-hover:scale-125 transition-transform" />}
              <span className="font-black uppercase italic text-xs tracking-[0.2em]">Save Strategy</span>
            </button>
          </div>
        </div>
      </section>

      {/* REGULAR HOURS (Existing) */}
      <section className="space-y-6">
        <div className="px-2">
          <h2 className="text-3xl font-black text-slate-900 uppercase italic tracking-tighter">Operating Hours</h2>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] italic">Toggle days open/closed</p>
        </div>

        <div className="bg-white rounded-[3rem] border border-slate-100 shadow-xl shadow-slate-200/50 overflow-hidden">
          <div className="divide-y divide-slate-50">
            {days.map((day, idx) => {
              const dayShifts = hours.filter(h => h.day_of_week === idx);
              const isClosed = dayShifts.length === 0;

              return (
                <div key={day} className={`p-6 md:p-10 flex flex-col lg:flex-row lg:items-center gap-6 transition-all ${isClosed ? 'bg-slate-50/50' : 'hover:bg-slate-50/30'}`}>
                  <div className="w-48 shrink-0 flex items-center gap-4">
                    <button 
                      onClick={() => toggleDayClosed(idx, isClosed)}
                      className={`w-12 h-6 rounded-full relative transition-colors ${isClosed ? 'bg-slate-200' : 'bg-emerald-500'}`}
                    >
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${isClosed ? 'left-1' : 'left-7'}`} />
                    </button>
                    <div>
                      <span className={`font-black uppercase text-lg tracking-tighter italic ${isClosed ? 'text-slate-300' : 'text-slate-900'}`}>{day}</span>
                      <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 leading-none">
                        {isClosed ? 'Closed Whole Day' : 'Open for business'}
                      </p>
                    </div>
                  </div>

                  <div className="flex-1 flex flex-wrap gap-4">
                    {!isClosed ? (
                      <>
                        {dayShifts.map(shift => (
                          <div key={shift.id} className="flex items-center gap-3 bg-white border-2 border-indigo-50 p-2 pl-4 rounded-[1.5rem] shadow-sm animate-in zoom-in-95">
                            <div className="flex items-center gap-2">
                              <input 
                                type="time" 
                                value={shift.open_time.slice(0,5)} 
                                onChange={(e) => updateShiftTime(shift.id, 'open_time', e.target.value)}
                                className="bg-slate-50 p-1 rounded-lg font-black text-indigo-600 text-sm outline-none cursor-pointer"
                              />
                              <span className="text-[10px] font-black text-slate-300">TO</span>
                              <input 
                                type="time" 
                                value={shift.close_time.slice(0,5)} 
                                onChange={(e) => updateShiftTime(shift.id, 'close_time', e.target.value)}
                                className="bg-slate-50 p-1 rounded-lg font-black text-indigo-600 text-sm outline-none cursor-pointer"
                              />
                            </div>
                            <button onClick={() => removeShift(shift.id)} className="w-8 h-8 flex items-center justify-center bg-red-50 text-red-400 rounded-xl active:scale-75"><X size={14} strokeWidth={3}/></button>
                          </div>
                        ))}
                        <button onClick={() => addShift(idx)} className="flex items-center gap-2 px-6 py-3 border-2 border-dashed border-slate-200 rounded-[1.5rem] text-slate-400 active:scale-95 group">
                          <Plus size={16}/><span className="text-[10px] font-black uppercase">Add Shift</span>
                        </button>
                      </>
                    ) : (
                      <div className="flex items-center gap-2 text-slate-300 italic text-xs font-medium">
                        <Moon size={14} /> Shop remains closed on {day}s
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* EXCEPTIONS (Existing) */}
      <section className="space-y-6">
        <div className="px-2">
          <h2 className="text-3xl font-black text-slate-900 uppercase italic tracking-tighter">Exceptions</h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="bg-slate-900 p-8 rounded-[3rem] text-white space-y-8 shadow-2xl">
            <h3 className="font-black uppercase italic text-indigo-400 text-sm flex items-center gap-2"><CalendarOff size={20}/> New Exception</h3>
            
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Select Date</label>
                <input 
                  type="date" 
                  min={new Date().toISOString().split('T')[0]}
                  value={newEx.date}
                  onChange={e => setNewEx({...newEx, date: e.target.value})}
                  className="w-full bg-slate-800 border-none rounded-2xl p-4 text-sm font-bold outline-none cursor-pointer"
                />
              </div>

              <button type="button" onClick={() => setNewEx({...newEx, allDay: !newEx.allDay})} className="flex items-center justify-between w-full bg-slate-800/50 p-4 rounded-2xl">
                <span className="text-[10px] font-black uppercase tracking-widest">Closed All Day</span>
                {newEx.allDay ? <ToggleRight className="text-indigo-400" size={40}/> : <ToggleLeft className="text-slate-600" size={40}/>}
              </button>

              {!newEx.allDay && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[9px] font-black uppercase text-slate-500 tracking-widest">From</label>
                    <input type="time" value={newEx.from} onChange={e => setNewEx({...newEx, from: e.target.value})} className="w-full bg-slate-800 rounded-xl p-3 text-xs font-bold cursor-pointer" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-black uppercase text-slate-500 tracking-widest">Until</label>
                    <input type="time" value={newEx.until} onChange={e => setNewEx({...newEx, until: e.target.value})} className="w-full bg-slate-800 rounded-xl p-3 text-xs font-bold cursor-pointer" />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Internal Note</label>
                <select 
                  value={newEx.reason} 
                  onChange={e => setNewEx({...newEx, reason: e.target.value})}
                  className="w-full bg-slate-800 border-none rounded-2xl p-4 text-sm font-bold outline-none cursor-pointer"
                >
                  <option value="">Select Reason...</option>
                  <option value="Public Holiday">Public Holiday</option>
                  <option value="Religious Observance">Religious Observance</option>
                  <option value="Staff Training">Staff Training</option>
                  <option value="Maintenance">Maintenance</option>
                  <option value="Emergency Closure">Emergency Closure</option>
                  <option value="Personal Break">Personal Break</option>
                </select>
              </div>

              <button disabled={saving || !newEx.date} onClick={addException} className="w-full bg-indigo-600 py-5 rounded-[2rem] font-black uppercase text-xs tracking-[0.2em] active:scale-95 transition-all flex items-center justify-center gap-2 shadow-xl shadow-indigo-600/20">
                {saving ? <RefreshCw className="animate-spin" size={16}/> : <Check size={18}/>} Add Exception
              </button>
            </div>
          </div>

          <div className="lg:col-span-2">
            {exceptions.length === 0 ? (
              <div className="h-full min-h-[300px] flex flex-col items-center justify-center p-12 bg-slate-50 border-4 border-dashed border-slate-100 rounded-[3rem] text-slate-300">
                <Coffee size={48} className="mb-4 opacity-10" />
                <p className="text-xs font-black uppercase tracking-[0.3em]">No upcoming closures</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {exceptions.map(ex => (
                  <div key={ex.id} className="bg-white p-6 rounded-[2.5rem] border border-slate-100 flex items-center justify-between group animate-in fade-in">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex flex-col items-center justify-center text-indigo-600 shrink-0 shadow-inner">
                        <span className="text-[8px] font-black uppercase">{new Date(ex.exception_date).toLocaleString('default', { month: 'short' })}</span>
                        <span className="text-lg font-black leading-none">{new Date(ex.exception_date).getDate()}</span>
                      </div>
                      <div>
                        <h4 className="font-black text-slate-800 text-xs uppercase">{ex.is_closed_all_day ? 'Closed All Day' : `Closed: ${ex.closed_from?.slice(0,5)} - ${ex.closed_until?.slice(0,5)}`}</h4>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{ex.reason || 'Special Closure'}</p>
                      </div>
                    </div>
                    <button onClick={async () => { await supabase.from('business_exceptions').delete().eq('id', ex.id); fetchData(); }} className="p-3 bg-red-50 text-red-400 rounded-2xl active:scale-75 transition-all"><Trash2 size={16}/></button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}