import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  Search, Package, Plus, Minus, X, ShoppingCart, 
  Check, AlertCircle, ChevronRight, ImageIcon, 
  Trash2, Eye, Info, RefreshCw, MessageSquare
} from 'lucide-react';

export default function CustomerProductView({ bizData }) {
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [viewingProduct, setViewingProduct] = useState(null);
  const [variationQtys, setVariationQtys] = useState({});
  const [cart, setCart] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Checkout States
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [orderId, setOrderId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastOrderTotal, setLastOrderTotal] = useState(0);
  const [customerInfo, setCustomerInfo] = useState({
    name: '',
    whatsapp: '',
    address: '',
    remarks: '',
    otherContact: ''
  });

  useEffect(() => { if (bizData?.id) fetchProducts(); }, [bizData.id]);

  const fetchProducts = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('products')
      .select('*, product_variations(*)')
      .eq('business_id', bizData.id)
      .order('name', { ascending: true });
    setProducts(data || []);
    setFilteredProducts(data || []);
    setLoading(false);
  };

  useEffect(() => {
    const filtered = products.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()));
    setFilteredProducts(filtered);
  }, [searchQuery, products]);

  // --- LOGIC: SHARED STOCK & DECIMAL QUANTITY ---
  const getRemainingModalStock = () => {
    if (!viewingProduct) return 0;
    const usedInModal = Object.values(variationQtys).reduce((sum, q) => sum + parseFloat(q || 0), 0);
    return Math.max(0, viewingProduct.available_stock - usedInModal);
  };

  const handleQtyChange = (varId, value, isRelative = false) => {
    const currentVal = parseFloat(variationQtys[varId] || 0);
    let newVal = isRelative ? currentVal + value : parseFloat(value);
    if (isNaN(newVal) || newVal < 0) newVal = 0;

    const otherVarsTotal = Object.entries(variationQtys)
      .filter(([id]) => id !== varId)
      .reduce((sum, [_, q]) => sum + parseFloat(q || 0), 0);
    
    if (otherVarsTotal + newVal > viewingProduct.available_stock) {
      newVal = viewingProduct.available_stock - otherVarsTotal;
    }
    setVariationQtys(prev => ({ ...prev, [varId]: newVal }));
  };

  // --- CART MANAGEMENT ---
  const addToCart = () => {
    const entries = [];
    const vars = viewingProduct.product_variations || [];
    if (vars.length === 0) {
      if (variationQtys.base > 0) entries.push({ ...viewingProduct, cartQty: variationQtys.base, cartId: `${viewingProduct.id}-base` });
    } else {
      vars.forEach(v => {
        if (variationQtys[v.id] > 0) entries.push({ ...viewingProduct, cartQty: variationQtys[v.id], chosenVariation: v, cartId: `${viewingProduct.id}-${v.id}` });
      });
    }

    setCart(prev => {
      let updated = [...prev];
      entries.forEach(newItem => {
        const idx = updated.findIndex(i => i.cartId === newItem.cartId);
        if (idx > -1) updated[idx].cartQty = newItem.cartQty;
        else updated.push(newItem);
      });
      return updated;
    });
    setViewingProduct(null);
    setVariationQtys({});
  };

  const removeFromCart = (cid) => setCart(prev => prev.filter(i => i.cartId !== cid));

  // --- CHECKOUT LOGIC ---
  const handleCheckout = async () => {
    const slPhoneRegex = /^07\d{8}$/;
    
    if (!customerInfo.name || !customerInfo.whatsapp || !customerInfo.address) {
      alert("Please fill in Name, WhatsApp, and Address.");
      return;
    }

    if (!slPhoneRegex.test(customerInfo.whatsapp)) {
      alert("Please enter a valid Sri Lankan WhatsApp number (07xxxxxxxx).");
      return;
    }

    setIsSubmitting(true);
    const total = cart.reduce((sum, i) => sum + (i.unit_price * i.cartQty), 0);
    setLastOrderTotal(total);

    const { data, error } = await supabase
      .from('orders')
      .insert([{
        business_id: bizData.id,
        customer_name: customerInfo.name,
        customer_whatsapp: customerInfo.whatsapp,
        customer_address: customerInfo.address,
        customer_remarks: customerInfo.remarks,
        other_contact: customerInfo.otherContact,
        items: cart,
        total_amount: total
      }])
      .select()
      .single();

    if (!error && data) {
      setOrderId(data.id.slice(0, 8).toUpperCase());
      setCart([]);
      setIsCheckoutOpen(false);
      setIsCartOpen(false);
    } else {
      alert("Checkout failed. Check your connection.");
    }
    setIsSubmitting(false);
  };

  // --- REFINED WHATSAPP LINK FOR SRI LANKA ---
  const generateWhatsAppUrl = () => {
    // Convert business number 07xxxxxxxx to 947xxxxxxxx
    const rawBizPhone = bizData.whatsapp.replace(/\D/g, '');
    const formattedBizPhone = rawBizPhone.startsWith('0') 
      ? `94${rawBizPhone.substring(1)}` 
      : rawBizPhone;

    const message = `Hi! I placed an order ID: ${orderId}. Total amount: Rs.${lastOrderTotal.toLocaleString()}.`;
    return `https://wa.me/${formattedBizPhone}?text=${encodeURIComponent(message)}`;
  };

  return (
    <div className="space-y-6 pb-32 px-2 md:px-0">
      <div className="relative group">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500" size={16} />
        <input type="text" placeholder="Search catalog..." value={searchQuery} onChange={(e)=>setSearchQuery(e.target.value)} className="w-full pl-11 pr-4 py-4 bg-white border border-slate-100 rounded-2xl shadow-sm outline-none font-bold text-xs focus:ring-4 focus:ring-indigo-500/5 transition-all" />
      </div>

      {/* TABLE VIEW */}
      <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/50 border-b border-slate-50">
              <th className="p-5 text-[9px] font-black uppercase text-slate-400 tracking-widest">Product</th>
              <th className="p-5 text-[9px] font-black uppercase text-slate-400 tracking-widest text-right">Price</th>
              <th className="p-5 text-[9px] font-black uppercase text-slate-400 tracking-widest text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filteredProducts.map(p => (
              <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="p-5">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-slate-100 overflow-hidden shrink-0 border border-slate-100 shadow-inner">
                      {p.images?.[0] ? <img src={p.images[0]} className="w-full h-full object-cover" /> : <ImageIcon className="m-auto text-slate-300" size={18}/>}
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-xs font-black text-slate-800 uppercase leading-none truncate max-w-[120px] md:max-w-xs">{p.name}</p>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">ID: {p.manual_id || 'N/A'}</p>
                    </div>
                  </div>
                </td>
                <td className="p-5 text-right font-black text-indigo-600 italic text-xs whitespace-nowrap">Rs.{p.unit_price}</td>
                <td className="p-5 text-right">
                  <button onClick={() => setViewingProduct(p)} className="p-3 bg-slate-900 text-white rounded-xl active:scale-90 transition-all flex items-center gap-2 ml-auto">
                    <Eye size={14}/> <span className="text-[9px] font-black uppercase tracking-widest hidden md:inline">View</span>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* PRODUCT DETAIL MODAL */}
      {viewingProduct && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-900/80 backdrop-blur-sm p-0 animate-in fade-in">
          <div className="bg-white w-full max-w-2xl rounded-t-[3rem] h-[90vh] overflow-y-auto no-scrollbar shadow-2xl">
            <div className="sticky top-0 z-10 p-6 flex justify-between items-center bg-white/95 backdrop-blur-md border-b border-slate-50">
              <div className="px-4 py-1.5 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-black uppercase tracking-widest">
                Stock: {getRemainingModalStock()} Available
              </div>
              <button onClick={() => { setViewingProduct(null); setVariationQtys({}); }} className="p-2 bg-slate-100 rounded-full text-slate-900"><X size={20}/></button>
            </div>

            <div className="p-8 space-y-8">
              {/* Gallery */}
              <div className="flex gap-4 overflow-x-auto no-scrollbar snap-x pb-4">
                {viewingProduct.images?.length > 0 ? viewingProduct.images.map((img, i) => (
                  <div key={i} className="min-w-[75%] aspect-[4/3] bg-slate-50 rounded-[2rem] overflow-hidden snap-center border border-slate-100 shadow-sm flex items-center justify-center">
                    <img src={img} className="w-full h-full object-cover cursor-zoom-in active:scale-110 transition-transform" />
                  </div>
                )) : (
                  <div className="w-full aspect-[4/3] bg-slate-50 rounded-[2rem] flex items-center justify-center text-slate-300 border-2 border-dashed border-slate-100">
                    <Package size={48} />
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <h2 className="text-3xl font-black text-slate-900 uppercase italic tracking-tighter leading-none">{viewingProduct.name}</h2>
                  <p className="text-2xl font-black text-indigo-600 italic">Rs.{viewingProduct.unit_price}</p>
                </div>
                <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100">
                  <p className="text-sm font-bold text-slate-600 leading-relaxed italic">{viewingProduct.description || "No description provided."}</p>
                </div>
              </div>

              {/* Variations */}
              <div className="space-y-4">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">Configure Selection</h3>
                {(viewingProduct.product_variations?.length > 0 ? viewingProduct.product_variations : [{id: 'base', variation_name: 'Standard Unit'}]).map(v => (
                  <div key={v.id} className="flex items-center justify-between p-5 bg-slate-50 rounded-3xl border border-slate-100">
                    <p className="text-xs font-black text-slate-800 uppercase leading-none">{v.variation_name}</p>
                    <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-2xl shadow-sm border border-slate-200">
                      <button onClick={() => handleQtyChange(v.id, -1, true)} className="p-2 text-slate-400 active:scale-75"><Minus size={14}/></button>
                      <input type="number" step="0.1" value={variationQtys[v.id] || ''} onChange={(e) => handleQtyChange(v.id, e.target.value)} placeholder="0.0" className="w-16 text-center font-black text-sm outline-none bg-transparent" />
                      <button onClick={() => handleQtyChange(v.id, 1, true)} disabled={getRemainingModalStock() <= 0} className="p-2 text-indigo-600 active:scale-75"><Plus size={14}/></button>
                    </div>
                  </div>
                ))}
              </div>

              <button onClick={addToCart} disabled={Object.values(variationQtys).every(q => !q || q === 0)} className="w-full py-6 bg-slate-900 text-white rounded-[2rem] font-black uppercase text-xs tracking-[0.2em] shadow-xl disabled:opacity-20 active:scale-95 transition-all">
                Add to Basket
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CART DRAWER */}
      {isCartOpen && (
        <div className="fixed inset-0 z-[110] flex items-end justify-center bg-slate-900/80 backdrop-blur-sm p-0 animate-in fade-in">
          <div className="bg-white w-full max-w-2xl rounded-t-[3rem] h-[85vh] flex flex-col shadow-2xl">
            <div className="p-8 flex justify-between items-center border-b border-slate-50 bg-slate-50/50 rounded-t-[3rem]">
              <h2 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter flex items-center gap-3"><ShoppingCart className="text-indigo-600" /> My Basket</h2>
              <button onClick={() => setIsCartOpen(false)} className="p-2 bg-slate-200 rounded-full text-slate-900"><X size={20}/></button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4 no-scrollbar">
              {cart.length === 0 ? (
                 <div className="p-10 text-center text-slate-400 font-bold uppercase text-[10px] tracking-widest">Basket is empty</div>
              ) : cart.map(item => (
                <div key={item.cartId} className="flex items-center justify-between p-5 bg-white rounded-3xl border border-slate-100 shadow-sm">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-slate-100 overflow-hidden border border-slate-50 shadow-inner">
                      {item.images?.[0] ? <img src={item.images[0]} className="w-full h-full object-cover" /> : <Package className="m-auto text-slate-200" size={20}/>}
                    </div>
                    <div>
                      <p className="text-xs font-black text-slate-800 uppercase leading-none">{item.name}</p>
                      {item.chosenVariation && <p className="text-[9px] font-bold text-indigo-500 uppercase mt-1 tracking-widest">{item.chosenVariation.variation_name}</p>}
                      <p className="text-[10px] font-black text-slate-400 mt-1 italic">Rs.{item.unit_price} × {item.cartQty}</p>
                    </div>
                  </div>
                  <button onClick={() => removeFromCart(item.cartId)} className="p-3 text-red-400 bg-red-50 rounded-xl hover:bg-red-500 hover:text-white transition-all active:scale-90"><Trash2 size={16}/></button>
                </div>
              ))}
            </div>

            <div className="p-8 border-t border-slate-50 bg-white">
              <div className="flex justify-between items-end mb-6">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Estimated Total</p>
                <p className="text-3xl font-black text-slate-900 italic leading-none">Rs.{cart.reduce((s, i) => s + (i.unit_price * i.cartQty), 0).toLocaleString()}</p>
              </div>
              <button disabled={cart.length === 0} onClick={() => setIsCheckoutOpen(true)} className="w-full py-6 bg-indigo-600 text-white rounded-[2rem] font-black uppercase text-xs tracking-[0.2em] shadow-xl shadow-indigo-200 active:scale-95 transition-all disabled:opacity-20">Proceed to Checkout</button>
            </div>
          </div>
        </div>
      )}

      {/* CHECKOUT DRAWER */}
      {isCheckoutOpen && (
        <div className="fixed inset-0 z-[120] flex items-end justify-center bg-slate-900/90 backdrop-blur-md p-0 animate-in fade-in">
          <div className="bg-white w-full max-w-2xl rounded-t-[3rem] h-[90vh] flex flex-col shadow-2xl overflow-y-auto no-scrollbar">
            <div className="p-8 flex justify-between items-center sticky top-0 bg-white z-10 border-b border-slate-50">
              <h2 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter">Delivery Info</h2>
              <button onClick={() => setIsCheckoutOpen(false)} className="p-2 bg-slate-100 rounded-full"><X size={20}/></button>
            </div>

            <div className="p-8 space-y-6">
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Full Name *</label>
                  <input type="text" value={customerInfo.name} onChange={e => setCustomerInfo({...customerInfo, name: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-indigo-500 font-bold text-sm" placeholder="Enter your name" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">WhatsApp No (07xxxxxxxx) *</label>
                    <input 
                      type="tel" 
                      maxLength={10}
                      value={customerInfo.whatsapp} 
                      onChange={e => {
                        const val = e.target.value.replace(/\D/g, ''); 
                        setCustomerInfo({...customerInfo, whatsapp: val});
                      }} 
                      className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-indigo-500 font-bold text-sm" 
                      placeholder="07xxxxxxxx" 
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Other Contact</label>
                    <input type="tel" value={customerInfo.otherContact} onChange={e => setCustomerInfo({...customerInfo, otherContact: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-indigo-500 font-bold text-sm" placeholder="Optional" />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Delivery Address *</label>
                  <textarea value={customerInfo.address} onChange={e => setCustomerInfo({...customerInfo, address: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-indigo-500 font-bold text-sm h-24 resize-none" placeholder="House No, Street, City" />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Order Remarks</label>
                  <input type="text" value={customerInfo.remarks} onChange={e => setCustomerInfo({...customerInfo, remarks: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-indigo-500 font-bold text-sm" placeholder="Special instructions" />
                </div>
              </div>

              <button 
                onClick={handleCheckout} 
                disabled={isSubmitting}
                className="w-full py-6 bg-slate-900 text-white rounded-[2rem] font-black uppercase text-xs tracking-[0.2em] shadow-xl flex items-center justify-center gap-3 transition-all active:scale-95"
              >
                {isSubmitting ? <RefreshCw className="animate-spin" size={18}/> : <Check size={18}/>}
                Confirm Order
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SUCCESS OVERLAY */}
      {orderId && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-white p-6 text-center animate-in zoom-in-95 duration-500">
          <div className="max-w-sm space-y-8">
            <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-[2.5rem] flex items-center justify-center mx-auto shadow-lg shadow-emerald-100">
              <Check size={48} strokeWidth={3} />
            </div>
            <div className="space-y-2">
              <h2 className="text-4xl font-black text-slate-900 uppercase italic tracking-tighter leading-none">Order Sent!</h2>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Order ID: <span className="text-indigo-600 font-black">{orderId}</span></p>
            </div>
            <a 
              href={generateWhatsAppUrl()} 
              target="_blank" 
              rel="noreferrer"
              className="w-full py-5 bg-emerald-500 text-white rounded-[1.5rem] font-black uppercase text-xs tracking-widest shadow-xl flex items-center justify-center gap-2 active:scale-95 transition-all"
            >
              <MessageSquare size={18}/> Chat on WhatsApp
            </a>
            <button onClick={() => setOrderId(null)} className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-900 block mx-auto underline decoration-indigo-200">Return to Shop</button>
          </div>
        </div>
      )}

      {/* PERSISTENT FLOATING BAR */}
      {cart.length > 0 && !isCartOpen && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 w-[92%] max-w-md bg-slate-900/95 backdrop-blur-md text-white p-4 rounded-[2.5rem] shadow-2xl flex items-center justify-between z-[90] border border-white/10 animate-in slide-in-from-bottom-10">
           <div className="flex items-center gap-4 ml-2">
              <div className="relative">
                <ShoppingCart size={20} className="text-indigo-400" />
                <span className="absolute -top-3 -right-3 bg-indigo-500 text-[8px] font-black w-6 h-6 rounded-full flex items-center justify-center ring-4 ring-slate-900">{cart.length}</span>
              </div>
              <span className="font-black text-sm italic uppercase tracking-tighter leading-none pt-1">Rs.{cart.reduce((s, i) => s + (i.unit_price * i.cartQty), 0).toLocaleString()}</span>
           </div>
           <button onClick={() => setIsCartOpen(true)} className="bg-white text-slate-900 px-8 py-3.5 rounded-full font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all">Review Basket</button>
        </div>
      )}
    </div>
  );
}