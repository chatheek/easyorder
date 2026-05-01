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

  // --- LOGIC: STOCK STATUS CHECK ---
  const isActuallyOutOfStock = (product) => {
    if (!product) return true;
    return product.stock_status === 'out_of_stock' || product.available_stock <= 0;
  };

  // 🚩 SYNC LOGIC: Keep the modal quantities perfectly synced with the basket
  useEffect(() => {
    if (viewingProduct) {
      const initialQtys = {};
      const productInCart = cart.filter(item => item.id === viewingProduct.id);
      
      if (viewingProduct.product_variations?.length > 0) {
        viewingProduct.product_variations.forEach(v => {
          const cartItem = productInCart.find(ci => ci.chosenVariation?.id === v.id);
          initialQtys[v.id] = cartItem ? cartItem.cartQty : 0;
        });
      } else {
        const baseItem = productInCart.find(ci => ci.cartId === `${viewingProduct.id}-base`);
        initialQtys.base = baseItem ? baseItem.cartQty : 0;
      }
      setVariationQtys(initialQtys);
    }
  }, [viewingProduct, cart]); // Sync when modal opens OR cart changes

  const getRemainingModalStock = () => {
    if (!viewingProduct) return 0;
    if (viewingProduct.stock_status === 'out_of_stock') return 0;
    const usedInModal = Object.values(variationQtys).reduce((sum, q) => sum + parseFloat(q || 0), 0);
    return Math.max(0, viewingProduct.available_stock - usedInModal);
  };

  // 🚩 AUTO-SYNC MODAL TO BASKET
  const handleQtyChange = (varId, value, isRelative = false) => {
    if (isActuallyOutOfStock(viewingProduct)) return;

    const currentVal = parseFloat(variationQtys[varId] || 0);
    let newVal = isRelative ? currentVal + value : parseFloat(value);
    if (isNaN(newVal) || newVal < 0) newVal = 0;

    const otherVarsInModal = Object.entries(variationQtys)
      .filter(([id]) => id !== varId)
      .reduce((sum, [_, q]) => sum + parseFloat(q || 0), 0);
    
    if (otherVarsInModal + newVal > viewingProduct.available_stock) {
      newVal = viewingProduct.available_stock - otherVarsInModal;
    }
    
    const updatedQtys = { ...variationQtys, [varId]: newVal };
    setVariationQtys(updatedQtys);
    
    // Push updates to cart immediately
    syncModalToCart(updatedQtys);
  };

  const syncModalToCart = (currentQtys) => {
    setCart(prev => {
      let updated = [...prev].filter(i => i.id !== viewingProduct.id);
      const vars = viewingProduct.product_variations || [];
      
      if (vars.length === 0) {
        if (currentQtys.base > 0) {
          updated.push({ ...viewingProduct, cartQty: currentQtys.base, cartId: `${viewingProduct.id}-base` });
        }
      } else {
        vars.forEach(v => {
          if (currentQtys[v.id] > 0) {
            updated.push({ ...viewingProduct, cartQty: currentQtys[v.id], chosenVariation: v, cartId: `${viewingProduct.id}-${v.id}` });
          }
        });
      }
      return updated;
    });
  };

  // 🚩 BASKET EDIT LOGIC (Increments/Decrements inside drawer)
  const updateCartQty = (cartId, value, isRelative = false) => {
    setCart(prev => prev.map(item => {
      if (item.cartId !== cartId) return item;
      
      const currentQty = parseFloat(item.cartQty || 0);
      let newQty = isRelative ? currentQty + value : parseFloat(value);
      if (isNaN(newQty) || newQty <= 0) newQty = 0;

      const otherItemsTotalStock = prev
        .filter(i => i.id === item.id && i.cartId !== cartId)
        .reduce((sum, i) => sum + parseFloat(i.cartQty || 0), 0);
      
      const maxAllowed = item.available_stock - otherItemsTotalStock;
      if (newQty > maxAllowed) newQty = maxAllowed;

      return { ...item, cartQty: newQty };
    }).filter(item => item.cartQty > 0));
  };

  const removeFromCart = (cid) => setCart(prev => prev.filter(i => i.cartId !== cid));

  const handleCheckout = async () => {
    const slPhoneRegex = /^07\d{8}$/;
    if (!customerInfo.name || !customerInfo.whatsapp || !customerInfo.address) {
      alert("Please fill in Name, WhatsApp, and Address."); return;
    }
    if (!slPhoneRegex.test(customerInfo.whatsapp)) {
      alert("Please enter a valid Sri Lankan WhatsApp number (07xxxxxxxx)."); return;
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
      .select().single();

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

  const generateWhatsAppUrl = () => {
    const rawBizPhone = bizData.whatsapp.replace(/\D/g, '');
    const formattedBizPhone = rawBizPhone.startsWith('0') ? `94${rawBizPhone.substring(1)}` : rawBizPhone;
    const message = `Hi! I placed an order ID: ${orderId}. Total: Rs.${lastOrderTotal.toLocaleString()}.`;
    return `https://wa.me/${formattedBizPhone}?text=${encodeURIComponent(message)}`;
  };

  return (
    <div className="space-y-6 pb-32 px-2 md:px-0 font-sans">
      {/* Search Bar */}
      <div className="relative group">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500" size={16} />
        <input type="text" placeholder="Search catalog..." value={searchQuery} onChange={(e)=>setSearchQuery(e.target.value)} className="w-full pl-11 pr-4 py-4 bg-white border border-slate-100 rounded-2xl shadow-sm outline-none font-bold text-xs focus:ring-4 focus:ring-indigo-500/5 transition-all" />
      </div>

      {/* Main Catalog Table */}
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
            {filteredProducts.map(p => {
              const outOfStock = isActuallyOutOfStock(p);
              const totalItemsInCart = cart.filter(i => i.id === p.id).reduce((s, i) => s + i.cartQty, 0);
              return (
                <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="p-5">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-xl bg-slate-100 overflow-hidden shrink-0 border border-slate-100 shadow-inner ${outOfStock ? 'grayscale opacity-50' : ''}`}>
                        {p.images?.[0] ? <img src={p.images[0]} className="w-full h-full object-cover" alt={p.name} /> : <ImageIcon className="m-auto text-slate-300" size={18}/>}
                      </div>
                      <div className="space-y-0.5">
                        <p className={`text-xs font-black uppercase leading-none truncate max-w-[120px] md:max-w-xs ${outOfStock ? 'text-slate-400' : 'text-slate-800'}`}>{p.name}</p>
                        <div className="flex items-center gap-2">
                          {outOfStock ? (
                            <span className="text-[8px] font-black bg-red-100 text-red-600 px-2 py-0.5 rounded-full uppercase">Sold Out</span>
                          ) : (
                            <p className="text-[9px] font-bold text-slate-400 uppercase">ID: {p.manual_id || 'N/A'}</p>
                          )}
                          {totalItemsInCart > 0 && (
                            <span className="text-[8px] font-black bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full uppercase italic animate-pulse">In Basket: {totalItemsInCart}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="p-5 text-right font-black text-indigo-600 italic text-xs whitespace-nowrap">Rs.{p.unit_price.toLocaleString()}</td>
                  <td className="p-5 text-right">
                    <button onClick={() => setViewingProduct(p)} className={`p-3 rounded-xl active:scale-90 transition-all flex items-center gap-2 ml-auto ${outOfStock ? 'bg-slate-200 text-slate-500' : 'bg-slate-900 text-white'}`}>
                      <Eye size={14}/> <span className="text-[9px] font-black uppercase tracking-widest hidden md:inline">View</span>
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* PRODUCT DETAIL MODAL (Bottom Drawer Style) */}
      {viewingProduct && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-900/80 backdrop-blur-sm p-0 animate-in fade-in">
          <div className="bg-white w-full max-w-2xl rounded-t-[3rem] h-[90vh] overflow-y-auto no-scrollbar shadow-2xl">
            <div className="sticky top-0 z-10 p-6 flex justify-between items-center bg-white/95 backdrop-blur-md border-b border-slate-50">
              {isActuallyOutOfStock(viewingProduct) ? (
                <div className="px-4 py-1.5 bg-red-50 text-red-600 rounded-full text-[10px] font-black uppercase tracking-widest">Out of Stock</div>
              ) : (
                <div className="px-4 py-1.5 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-black uppercase tracking-widest">
                   {getRemainingModalStock() > 0 ? `${getRemainingModalStock()} more units available` : 'Limit reached'}
                </div>
              )}
              <button onClick={() => setViewingProduct(null)} className="p-2 bg-slate-100 rounded-full text-slate-900 active:scale-75 transition-transform"><X size={20}/></button>
            </div>

            <div className="p-8 space-y-8">
              <div className="flex gap-4 overflow-x-auto no-scrollbar snap-x pb-4">
                {viewingProduct.images?.length > 0 ? viewingProduct.images.map((img, i) => (
                  <div key={i} className="min-w-[75%] aspect-[4/3] bg-slate-50 rounded-[2rem] overflow-hidden snap-center border border-slate-100 flex items-center justify-center">
                    <img src={img} className="w-full h-full object-cover" alt="" />
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
                  <p className="text-2xl font-black text-indigo-600 italic">Rs.{viewingProduct.unit_price.toLocaleString()}</p>
                </div>
                <p className="text-sm font-bold text-slate-500 leading-relaxed italic bg-slate-50 p-6 rounded-[2rem] border border-slate-100">
                  {viewingProduct.description || "No description provided."}
                </p>
              </div>

              <div className="space-y-4">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">Configure Units</h3>
                {(viewingProduct.product_variations?.length > 0 ? viewingProduct.product_variations : [{id: 'base', variation_name: 'Standard'}]).map(v => (
                  <div key={v.id} className="flex items-center justify-between p-5 bg-slate-50 rounded-3xl border border-slate-100">
                    <p className={`text-xs font-black uppercase ${isActuallyOutOfStock(viewingProduct) ? 'text-slate-400' : 'text-slate-800'}`}>{v.variation_name}</p>
                    <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-2xl shadow-sm border border-slate-200">
                      <button onClick={() => handleQtyChange(v.id, -1, true)} className="p-2 text-slate-400 active:scale-75 transition-transform"><Minus size={14}/></button>
                      <input 
                        type="number" step="0.1" 
                        disabled={isActuallyOutOfStock(viewingProduct)}
                        value={variationQtys[v.id] || ''} 
                        onChange={(e) => handleQtyChange(v.id, e.target.value)} 
                        className="w-16 text-center font-black text-sm outline-none bg-transparent" 
                        placeholder="0.0"
                      />
                      <button 
                        onClick={() => handleQtyChange(v.id, 1, true)} 
                        disabled={isActuallyOutOfStock(viewingProduct) || getRemainingModalStock() <= 0} 
                        className={`p-2 transition-all active:scale-75 ${getRemainingModalStock() <= 0 ? 'text-slate-200' : 'text-indigo-600'}`}
                      >
                        <Plus size={14}/>
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <button 
                onClick={() => setViewingProduct(null)} 
                className="w-full py-6 bg-slate-900 text-white rounded-[2rem] font-black uppercase text-xs tracking-[0.2em] shadow-xl active:scale-95 transition-all"
              >
                Close & Return
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BASKET DRAWER */}
      {isCartOpen && (
        <div className="fixed inset-0 z-[110] flex items-end justify-center bg-slate-900/80 backdrop-blur-sm p-0 animate-in fade-in">
          <div className="bg-white w-full max-w-2xl rounded-t-[3rem] h-[85vh] flex flex-col shadow-2xl">
            <div className="p-8 flex justify-between items-center border-b border-slate-50 bg-slate-50/50 rounded-t-[3rem]">
              <h2 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter flex items-center gap-3"><ShoppingCart className="text-indigo-600" /> My Basket</h2>
              <button onClick={() => setIsCartOpen(false)} className="p-2 bg-slate-200 rounded-full text-slate-900"><X size={20}/></button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4 no-scrollbar">
              {cart.length === 0 ? (
                 <div className="p-20 text-center text-slate-400 font-bold uppercase text-[10px] tracking-widest">Basket is empty</div>
              ) : cart.map(item => {
                const otherItemsInBasket = cart
                  .filter(i => i.id === item.id && i.cartId !== item.cartId)
                  .reduce((sum, i) => sum + parseFloat(i.cartQty || 0), 0);
                const reachedMaxInBasket = item.cartQty >= (item.available_stock - otherItemsInBasket);

                return (
                  <div key={item.cartId} className="flex flex-col p-5 bg-white rounded-3xl border border-slate-100 shadow-sm gap-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-slate-100 overflow-hidden border border-slate-50 shadow-inner shrink-0">
                          {item.images?.[0] ? <img src={item.images[0]} className="w-full h-full object-cover" /> : <Package className="m-auto text-slate-200" size={20}/>}
                        </div>
                        <div>
                          <p className="text-xs font-black text-slate-800 uppercase leading-none">{item.name}</p>
                          {item.chosenVariation && <p className="text-[9px] font-bold text-indigo-500 uppercase mt-1 tracking-widest">{item.chosenVariation.variation_name}</p>}
                          <p className="text-[9px] font-black text-slate-400 mt-1 italic">Rs.{item.unit_price.toLocaleString()}</p>
                        </div>
                      </div>
                      <button onClick={() => removeFromCart(item.cartId)} className="p-2.5 text-slate-300 hover:text-red-500 active:scale-90 transition-all"><Trash2 size={16}/></button>
                    </div>

                    <div className="flex items-center justify-between bg-slate-50 p-3 rounded-2xl border border-slate-100">
                      <div className="flex items-center gap-2">
                         <span className="text-[9px] font-black text-slate-400 uppercase">Quantity</span>
                         {reachedMaxInBasket && <span className="text-[7px] font-black bg-amber-100 text-amber-600 px-2 py-0.5 rounded-full uppercase animate-pulse">Max Stock</span>}
                      </div>
                      <div className="flex items-center gap-1 bg-white px-2 py-1.5 rounded-xl border border-slate-200 shadow-sm">
                        <button onClick={() => updateCartQty(item.cartId, -1, true)} className="p-1 text-slate-400 active:scale-75"><Minus size={12}/></button>
                        <input 
                          type="number" step="0.1" 
                          value={item.cartQty} 
                          onChange={(e) => updateCartQty(item.cartId, e.target.value)}
                          className="w-10 text-center font-black text-xs bg-transparent outline-none"
                        />
                        <button 
                          onClick={() => updateCartQty(item.cartId, 1, true)} 
                          disabled={reachedMaxInBasket}
                          className={`p-1 transition-all active:scale-75 ${reachedMaxInBasket ? 'text-slate-200' : 'text-indigo-600'}`}
                        >
                          <Plus size={12}/>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="p-8 border-t border-slate-50 bg-white">
              <div className="flex justify-between items-end mb-6">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Basket Total</p>
                <p className="text-3xl font-black text-slate-900 italic tracking-tighter">Rs.{cart.reduce((s, i) => s + (i.unit_price * i.cartQty), 0).toLocaleString()}</p>
              </div>
              <button disabled={cart.length === 0} onClick={() => setIsCheckoutOpen(true)} className="w-full py-6 bg-indigo-600 text-white rounded-[2rem] font-black uppercase text-xs tracking-[0.2em] shadow-xl disabled:opacity-20 active:scale-95 transition-all">Checkout Now</button>
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
              <button onClick={() => setIsCheckoutOpen(false)} className="p-2 bg-slate-100 rounded-full active:scale-75 transition-transform"><X size={20}/></button>
            </div>

            <div className="p-8 space-y-6">
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Full Name *</label>
                  <input type="text" value={customerInfo.name} onChange={e => setCustomerInfo({...customerInfo, name: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-indigo-500 font-bold text-sm" placeholder="Enter your name" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">WhatsApp No *</label>
                    <input type="tel" maxLength={10} value={customerInfo.whatsapp} onChange={e => setCustomerInfo({...customerInfo, whatsapp: e.target.value.replace(/\D/g, '')})} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-indigo-500 font-bold text-sm" placeholder="07xxxxxxxx" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Other Contact</label>
                    <input type="tel" value={customerInfo.otherContact} onChange={e => setCustomerInfo({...customerInfo, otherContact: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-indigo-500 font-bold text-sm" placeholder="Optional" />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Address *</label>
                  <textarea value={customerInfo.address} onChange={e => setCustomerInfo({...customerInfo, address: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-indigo-500 font-bold text-sm h-24 resize-none" placeholder="Delivery destination" />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Remarks</label>
                  <input type="text" value={customerInfo.remarks} onChange={e => setCustomerInfo({...customerInfo, remarks: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-indigo-500 font-bold text-sm" placeholder="Any instructions?" />
                </div>
              </div>

              <button onClick={handleCheckout} disabled={isSubmitting} className="w-full py-6 bg-slate-900 text-white rounded-[2rem] font-black uppercase text-xs tracking-[0.2em] shadow-xl flex items-center justify-center gap-3 active:scale-95 transition-all">
                {isSubmitting ? <RefreshCw className="animate-spin" size={18}/> : <Check size={18}/>} Confirm Order
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
            <a href={generateWhatsAppUrl()} target="_blank" rel="noreferrer" className="w-full py-5 bg-emerald-500 text-white rounded-[1.5rem] font-black uppercase text-xs tracking-widest shadow-xl flex items-center justify-center gap-2 active:scale-95 transition-all">
              <MessageSquare size={18}/> Chat on WhatsApp
            </a>
            <button onClick={() => setOrderId(null)} className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-900 block mx-auto underline">Back to Shop</button>
          </div>
        </div>
      )}

      {/* FLOATING CART BAR */}
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