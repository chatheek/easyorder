import React, { useState, useEffect, useCallback } from 'react';
import { 
  Search, Star, MessageSquare, RefreshCw, Truck, Send, 
  User, StickyNote, ShoppingCart, Phone, MapPin, Tag
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

export default function OrdersTab({ bizData }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showDetails, setShowDetails] = useState({}); 
  
  const [highlightStatus, setHighlightStatus] = useState({});
  const [highlightMsg, setHighlightMsg] = useState({});

  // --- 1. DATA FETCHING (Latest First) ---
  const fetchOrders = useCallback(async (silent = false) => {
    if (!silent) setIsRefreshing(true);
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('business_id', bizData.id)
        .order('created_at', { ascending: false });
      
      if (!error) setOrders(data || []);
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [bizData.id]);

  // --- 2. REALTIME SUBSCRIPTION (Auto-Refresh) ---
  useEffect(() => {
    if (!bizData?.id) return;

    fetchOrders(); // Initial Load

    const channel = supabase
      .channel(`orders_realtime_${bizData.id}`)
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'orders', filter: `business_id=eq.${bizData.id}` }, 
        () => fetchOrders(true) // Silent fetch on changes
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [bizData.id, fetchOrders]);

  // --- 3. STATUS & FIELD UPDATES ---
  const updateOrderStatus = async (order, newStatus) => {
    const { error } = await supabase.from('orders').update({ status: newStatus }).eq('id', order.id);
    if (!error) {
      setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: newStatus } : o));
      setHighlightStatus(prev => ({ ...prev, [order.id]: true }));
    }
  };

  const saveField = async (id, field, value) => {
    const { error } = await supabase.from('orders').update({ [field]: value }).eq('id', id);
    if (!error) {
      // Local state update ensures Send button has the latest text without a full refresh
      setOrders(prev => prev.map(o => o.id === id ? { ...o, [field]: value } : o));
      if (field === 'status_message') {
        setHighlightMsg(prev => ({ ...prev, [id]: true }));
      }
    }
  };

  // --- 4. WHATSAPP ENGINE (With Preload Logic) ---
  const sendWA = (order, type) => {
    const rawPhone = order.customer_whatsapp.replace(/\D/g, '');
    const formattedPhone = rawPhone.startsWith('0') ? `94${rawPhone.substring(1)}` : rawPhone;

    let msg = "";
    if (type === 'status') {
      const statusLabel = order.status.replace(/_/g, ' ').toUpperCase();
      msg = `Hi ${order.customer_name}, your order ID: ${order.id.slice(0,8)} is now: ${statusLabel}.`;
      setHighlightStatus(prev => ({ ...prev, [order.id]: false }));
    } else {
      // 🚩 PULL LATEST SAVED STATUS MESSAGE
      msg = order.status_message || "";
      setHighlightMsg(prev => ({ ...prev, [order.id]: false }));
    }

    if (!msg && type === 'msg') {
      alert("Please type a message first.");
      return;
    }
    
    window.open(`https://wa.me/${formattedPhone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const filteredOrders = orders.filter(o => {
    const query = searchQuery.toLowerCase();
    return (
      o.customer_name.toLowerCase().includes(query) || 
      o.customer_whatsapp.includes(query) ||
      o.id.toLowerCase().includes(query)
    );
  });

  if (loading) return <div className="p-10 text-center animate-pulse font-black text-slate-400 text-xs tracking-widest uppercase italic">Syncing Live Feed...</div>;

  return (
    <div className="space-y-6 pb-20">
      <style>
        {`
          @keyframes realistic-blink {
            0%, 100% { opacity: 1; transform: scale(1); box-shadow: 0 0 0px rgba(16, 185, 129, 0); }
            50% { opacity: 0.8; transform: scale(1.03); filter: brightness(1.1); box-shadow: 0 0 15px rgba(16, 185, 129, 0.4); }
          }
          .animate-real-blink { animation: realistic-blink 0.8s infinite ease-in-out; }
        `}
      </style>

      {/* SEARCH & REFRESH */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 px-2">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input 
            type="text" 
            placeholder="Search Name, Phone or ID..." 
            className="w-full pl-12 pr-4 py-4 bg-white border border-slate-100 rounded-2xl outline-none font-bold text-xs shadow-sm focus:ring-4 focus:ring-indigo-500/5 transition-all"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <button 
          onClick={() => fetchOrders()}
          disabled={isRefreshing}
          className="flex items-center gap-3 px-6 py-4 bg-white border border-slate-100 rounded-2xl font-black text-[10px] uppercase tracking-widest text-slate-500 hover:text-indigo-600 active:scale-95 transition-all shadow-sm"
        >
          <RefreshCw size={14} className={isRefreshing ? "animate-spin text-indigo-600" : ""} />
          {isRefreshing ? "Syncing..." : "Refresh"}
        </button>
      </div>

      <div className="grid gap-6">
        {filteredOrders.length === 0 ? (
          <div className="p-20 text-center bg-white rounded-[3rem] border border-dashed border-slate-200">
             <p className="text-slate-300 font-black uppercase text-xs tracking-widest italic tracking-[0.2em]">No records found</p>
          </div>
        ) : filteredOrders.map(order => (
          <div key={order.id} className={`bg-white border transition-all rounded-[2.5rem] p-6 md:p-8 shadow-sm hover:shadow-md ${order.is_favourite ? 'border-amber-200 ring-4 ring-amber-500/5' : 'border-slate-100'}`}>
            
            {/* HEADER */}
            <div className="flex flex-wrap justify-between items-center gap-4 border-b border-slate-50 pb-6">
              <div className="flex items-center gap-4">
                <button onClick={() => saveField(order.id, 'is_favourite', !order.is_favourite)}>
                  <Star size={22} className={order.is_favourite ? "fill-amber-400 text-amber-400" : "text-slate-200"} />
                </button>
                <div className="space-y-1">
                  <h3 className="font-black text-slate-900 uppercase italic tracking-tighter text-xl leading-none">#{order.id.slice(0, 8)}</h3>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    {new Date(order.created_at).toLocaleDateString('en-GB')} • {new Date(order.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <select 
                  value={order.status}
                  onChange={(e) => updateOrderStatus(order, e.target.value)}
                  className="bg-slate-100 text-slate-900 text-[10px] font-black uppercase px-4 py-3 rounded-xl outline-none cursor-pointer border-none"
                >
                  <option value="pending">⏳ Pending</option>
                  <option value="packed">📦 Packed</option>
                  <option value="in_delivery">🚚 In Delivery</option>
                  <option value="delivered">✅ Delivered</option>
                  <option value="delayed">⚠️ Delayed</option>
                  <option value="cancelled">❌ Cancelled</option>
                </select>

                <button 
                  onClick={() => sendWA(order, 'status')}
                  className={`p-3.5 rounded-xl transition-all relative ${
                    highlightStatus[order.id] ? 'bg-indigo-600 text-white animate-real-blink' : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  <Truck size={18} />
                </button>
              </div>
            </div>

            {/* ORDER ITEMS */}
            <div className="mt-8 space-y-4">
              <div className="bg-slate-50/50 rounded-3xl border border-slate-100 overflow-hidden">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-100/50">
                      <th className="p-4 text-[9px] font-black uppercase text-slate-500 tracking-widest">Items</th>
                      <th className="p-4 text-[9px] font-black uppercase text-slate-500 text-center tracking-widest">Qty</th>
                      <th className="p-4 text-[9px] font-black uppercase text-slate-500 text-right tracking-widest">Rs.</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {order.items?.map((item, i) => (
                      <tr key={i}>
                        <td className="p-4">
                          <p className="text-xs font-black text-slate-800 uppercase leading-none">{item.name}</p>
                          {item.chosenVariation && (
                            <p className="text-[9px] font-bold text-indigo-500 uppercase mt-1">{item.chosenVariation.variation_name}</p>
                          )}
                        </td>
                        <td className="p-4 text-center text-xs font-black text-slate-600 italic">x{item.cartQty}</td>
                        <td className="p-4 text-right text-xs font-black text-slate-800">{(item.unit_price * item.cartQty).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-white font-black italic text-indigo-600">
                      <td colSpan="2" className="p-4 text-right uppercase text-[10px] tracking-widest">Total</td>
                      <td className="p-4 text-right text-sm">Rs.{order.total_amount?.toLocaleString()}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* LOWER DETAILS */}
            <div className="mt-8 grid lg:grid-cols-2 gap-8">
              <div className="space-y-4">
                <button 
                  onClick={() => setShowDetails(prev => ({...prev, [order.id]: !prev[order.id]}))}
                  className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-all"
                >
                  <User size={14} /> {showDetails[order.id] ? 'Hide' : 'Show'} Customer Info
                </button>

                {showDetails[order.id] && (
  <div className="bg-indigo-50/50 p-6 rounded-[2rem] border border-indigo-100 space-y-4 animate-in slide-in-from-top-2">
    <div className="grid grid-cols-2 gap-4">
      <div>
        <p className="text-[10px] text-indigo-400 uppercase font-black tracking-widest">Name</p>
        <p className="text-xs font-black text-slate-800 uppercase">{order.customer_name}</p>
      </div>
      <div>
        <p className="text-[10px] text-indigo-400 uppercase font-black tracking-widest">WhatsApp</p>
        <p className="text-xs font-black text-slate-800">{order.customer_whatsapp}</p>
      </div>
    </div>

    {/* 🚩 NEW: Secondary/Other Contact Field */}
    {order.other_contact && (
      <div>
        <p className="text-[10px] text-indigo-400 uppercase font-black tracking-widest">Other Contact</p>
        <p className="text-xs font-black text-slate-800">{order.other_contact}</p>
      </div>
    )}

    <div>
      <p className="text-[10px] text-indigo-400 uppercase font-black tracking-widest leading-none mb-1">Address</p>
      <p className="text-xs font-bold text-slate-600 leading-relaxed">{order.customer_address}</p>
    </div>
    
    <div className="pt-3 border-t border-indigo-100">
      <p className="text-[10px] text-indigo-400 uppercase font-black tracking-widest mb-1">Customer Remarks</p>
      <p className="text-xs font-bold italic text-slate-500">{order.customer_remarks || "No notes."}</p>
    </div>
  </div>
)}

                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                    <StickyNote size={12}/> Admin Notes
                  </label>
                  <textarea 
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-xs font-bold h-24 resize-none outline-none focus:border-indigo-300 transition-all"
                    placeholder="Private notes..."
                    defaultValue={order.internal_remarks}
                    onBlur={(e) => saveField(order.id, 'internal_remarks', e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Preload WhatsApp Message</label>
                <div className="flex gap-3">
                  <textarea 
                    placeholder="Type custom update..."
                    className="flex-1 bg-slate-50 border border-slate-100 rounded-2xl p-4 text-xs font-bold h-24 resize-none outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all"
                    defaultValue={order.status_message}
                    // 🚩 ONBLUR saves to state/DB so the sendWA button works instantly
                    onBlur={(e) => saveField(order.id, 'status_message', e.target.value)}
                  />
                  <button 
                    onClick={() => sendWA(order, 'msg')}
                    className={`p-6 rounded-2xl transition-all ${
                      highlightMsg[order.id] ? 'bg-emerald-500 text-white animate-real-blink shadow-lg shadow-emerald-200' : 'bg-slate-100 text-slate-300'
                    }`}
                  >
                    <Send size={22} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}