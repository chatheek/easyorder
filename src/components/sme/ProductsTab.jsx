import React, { useState, useEffect } from 'react';
import { 
  Package, Plus, Edit3, Trash2, X, Save, 
  RefreshCw, ArrowLeft, UploadCloud, 
  CheckCircle2, AlertCircle, ToggleLeft, ToggleRight,
  PlusCircle, MinusCircle, Layers, Search, FileText
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

export default function ProductsTab({ bizData }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [uploadingIdx, setUploadingIdx] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  const initialForm = {
    manual_id: '', name: '', description: '', unit_price: '', available_stock: 0, 
    stock_status: 'in_stock', remarks: '', images: [null, null, null, null, null], variations: [] 
  };
  const [formData, setFormData] = useState(initialForm);

  useEffect(() => { if (bizData?.id) fetchProducts(); }, [bizData?.id]);

  const fetchProducts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('products')
      .select('*, product_variations(*)')
      .eq('business_id', bizData.id)
      .order('created_at', { ascending: false });
    if (!error) setProducts(data || []);
    setLoading(false);
  };

  const filteredProducts = products.filter(p => {
    const query = searchQuery.toLowerCase();
    return (
      p.name?.toLowerCase().includes(query) ||
      p.manual_id?.toLowerCase().includes(query) ||
      p.remarks?.toLowerCase().includes(query)
    );
  });

  const handleInstantUpdate = async (id, field, value, currentVal) => {
    if (value === currentVal) return;
    
    let confirmMsg = field === 'stock_status' 
      ? (value === 'in_stock' ? "Set product as AVAILABLE?" : "Set product as OUT OF STOCK?")
      : `Update remarks to: "${value}"?`;

    if (!window.confirm(confirmMsg)) {
      fetchProducts(); // Revert UI
      return;
    }

    const { error } = await supabase.from('products').update({ [field]: value }).eq('id', id);
    if (!error) fetchProducts();
    else alert("Update failed: " + error.message);
  };

  const handleImageUpload = async (e, index) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingIdx(index);
    const filePath = `${bizData.id}/${Date.now()}-${index}.${file.name.split('.').pop()}`;
    try {
      const { data, error } = await supabase.storage.from('product-images').upload(filePath, file);
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from('product-images').getPublicUrl(data.path);
      const updatedImages = [...formData.images];
      updatedImages[index] = publicUrl;
      setFormData({ ...formData, images: updatedImages });
    } catch (err) {
      alert("Upload failed.");
    } finally { setUploadingIdx(null); }
  };

  const removeImageSlot = (idx) => {
    const updatedImages = [...formData.images];
    updatedImages[idx] = null;
    setFormData({ ...formData, images: updatedImages });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const cleanImages = formData.images.filter(img => img !== null);
      const payload = {
        name: formData.name, manual_id: formData.manual_id,
        description: formData.description, unit_price: parseFloat(formData.unit_price),
        available_stock: parseInt(formData.available_stock) || 0,
        stock_status: formData.stock_status, remarks: formData.remarks,
        business_id: bizData.id, images: cleanImages
      };

      const { data: pData, error } = editingId 
        ? await supabase.from('products').update(payload).eq('id', editingId).select().single()
        : await supabase.from('products').insert([payload]).select().single();

      if (error) throw error;
      
      await supabase.from('product_variations').delete().eq('product_id', pData.id);
      const varPayload = formData.variations.filter(v => v.variation_name.trim() !== '').map(v => ({ variation_name: v.variation_name, product_id: pData.id }));
      if (varPayload.length > 0) await supabase.from('product_variations').insert(varPayload);

      setIsAdding(false); setEditingId(null); setFormData(initialForm); fetchProducts();
    } catch (err) { alert(err.message); } finally { setSaving(false); }
  };

  if (loading) return <div className="h-screen flex items-center justify-center bg-slate-50"><RefreshCw className="animate-spin text-indigo-600" size={40} /></div>;

  return (
    <div className="max-w-[1400px] mx-auto space-y-6 pb-24 md:pb-12 px-2 md:px-4">
      {!isAdding ? (
        <>
          {/* Search Header */}
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 pt-4">
            <div className="shrink-0">
              <h2 className="text-3xl font-black text-slate-900 italic uppercase tracking-tighter">Inventory</h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] italic opacity-70">{filteredProducts.length} Items Listed</p>
            </div>

            <div className="relative w-full lg:max-w-xl group">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={20} />
              <input 
                type="text" placeholder="Search SKU, Name, or Remarks..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-14 pr-12 py-4 bg-white border border-slate-100 rounded-3xl font-bold text-sm shadow-xl shadow-slate-200/50 outline-none focus:ring-4 focus:ring-indigo-50 transition-all"
              />
              {searchQuery && <button onClick={() => setSearchQuery("")} className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-slate-100 text-slate-400 rounded-full active:scale-90 transition-all"><X size={14} /></button>}
            </div>

            <button onClick={() => setIsAdding(true)} className="w-full lg:w-auto bg-slate-900 text-white px-8 py-5 rounded-3xl font-black uppercase text-[11px] tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-all shadow-xl shadow-slate-300">
              <Plus size={20}/> New Item
            </button>
          </div>

          {/* DESKTOP TABLE */}
          <div className="hidden lg:block bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-slate-50/50 border-b border-slate-100">
                <tr className="text-[9px] font-black text-slate-400 uppercase tracking-widest italic">
                  <th className="p-6">Product Info</th>
                  <th className="p-6">Price & Stock</th>
                  <th className="p-6">Live Remarks</th>
                  <th className="p-6 text-center">Availability</th>
                  <th className="p-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredProducts.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50/40 transition-all group">
                    <td className="p-6">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-slate-100 rounded-xl overflow-hidden border border-slate-50 flex items-center justify-center shrink-0">
                          {p.images?.[0] ? <img src={p.images[0]} className="w-full h-full object-cover" alt="" /> : <Package className="text-slate-200" size={20} />}
                        </div>
                        <div>
                          <p className="font-black text-slate-800 text-sm uppercase leading-none mb-1">{p.name}</p>
                          <p className="text-[10px] font-mono text-indigo-400 font-bold">#{p.manual_id || '---'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-6">
                      <p className="font-black text-slate-900 text-sm italic italic tracking-tighter">Rs.{p.unit_price}</p>
                      <p className="text-[9px] font-bold text-slate-400 uppercase mt-0.5 tracking-tighter">Stock: {p.available_stock}</p>
                    </td>
                    <td className="p-6">
                      <input 
                        key={p.remarks} defaultValue={p.remarks} 
                        onBlur={(e) => handleInstantUpdate(p.id, 'remarks', e.target.value, p.remarks)}
                        className="bg-transparent text-[10px] font-semibold italic border-b border-transparent hover:border-slate-200 focus:border-indigo-400 focus:bg-white p-2 outline-none w-full transition-all"
                        placeholder="Add note..."
                      />
                    </td>
                    <td className="p-6 text-center">
                      <button onClick={() => handleInstantUpdate(p.id, 'stock_status', p.stock_status === 'in_stock' ? 'out_of_stock' : 'in_stock', p.stock_status)} className="transition-all active:scale-75">
                        {p.stock_status === 'in_stock' ? <ToggleRight size={40} className="text-emerald-500" /> : <ToggleLeft size={40} className="text-red-400" />}
                      </button>
                    </td>
                    <td className="p-6 text-right space-x-2">
                      <button onClick={() => { setEditingId(p.id); setFormData({...p, images: [...p.images, ...Array(5 - p.images.length).fill(null)], variations: p.product_variations || []}); setIsAdding(true); }} className="p-2 text-slate-300 hover:text-indigo-600 transition-colors"><Edit3 size={18}/></button>
                      <button onClick={() => { if(window.confirm('Delete?')) supabase.from('products').delete().eq('id', p.id).then(fetchProducts) }} className="p-2 text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={18}/></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* MOBILE CARDS (Remarks editable here) */}
          <div className="lg:hidden space-y-4">
            {filteredProducts.map(p => (
              <div key={p.id} className="bg-white p-5 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/50 space-y-4">
                <div className="flex items-center gap-4">
                   <div className="w-20 h-20 bg-slate-100 rounded-3xl overflow-hidden flex items-center justify-center shrink-0">
                      {p.images?.[0] ? <img src={p.images[0]} className="w-full h-full object-cover" alt="" /> : <Package className="text-slate-200" size={32} />}
                   </div>
                   <div className="flex-1 min-w-0">
                      <p className="font-black text-slate-800 text-lg uppercase leading-tight truncate">{p.name}</p>
                      <p className="text-[10px] font-mono text-indigo-500 font-bold">SKU: {p.manual_id || '---'}</p>
                      <div className="flex items-center justify-between mt-2">
                        <p className="font-black text-slate-900 text-base italic">Rs.{p.unit_price}</p>
                        <span className={`text-[8px] font-black uppercase px-2 py-1 rounded-lg ${p.stock_status === 'in_stock' ? 'bg-emerald-50 text-emerald-500' : 'bg-red-50 text-red-500'}`}>{p.stock_status.replace('_',' ')}</span>
                      </div>
                   </div>
                </div>

                {/* Mobile Instant Remarks Editor */}
                <div className="relative group">
                  <FileText size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" />
                  <input 
                    key={p.remarks}
                    defaultValue={p.remarks} 
                    onBlur={(e) => handleInstantUpdate(p.id, 'remarks', e.target.value, p.remarks)}
                    placeholder="Tap to add internal remarks..."
                    className="w-full bg-slate-50 pl-9 pr-4 py-4 rounded-2xl text-[10px] font-bold italic outline-none border border-transparent focus:border-indigo-100 focus:bg-white transition-all shadow-inner"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div className="bg-slate-50 p-4 rounded-2xl flex flex-col justify-center shadow-inner">
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Stock Level</p>
                    <p className="text-sm font-black text-slate-700">{p.available_stock} <span className="text-[10px] opacity-40">Units</span></p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-2xl flex items-center justify-between shadow-inner">
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Availability</p>
                    <button onClick={() => handleInstantUpdate(p.id, 'stock_status', p.stock_status === 'in_stock' ? 'out_of_stock' : 'in_stock', p.stock_status)} className="active:scale-75 transition-all">
                      {p.stock_status === 'in_stock' ? <ToggleRight size={38} className="text-emerald-500" /> : <ToggleLeft size={38} className="text-red-400" />}
                    </button>
                  </div>
                </div>

                <div className="flex gap-2 pt-1">
                  <button onClick={() => { setEditingId(p.id); setFormData({...p, images: [...p.images, ...Array(5 - p.images.length).fill(null)], variations: p.product_variations || []}); setIsAdding(true); }} className="flex-1 py-4 bg-slate-900 text-white rounded-2xl flex items-center justify-center gap-2 font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all shadow-lg shadow-slate-200">
                    <Edit3 size={16}/> Edit Item
                  </button>
                  <button onClick={() => { if(window.confirm('Delete?')) supabase.from('products').delete().eq('id', p.id).then(fetchProducts) }} className="w-14 bg-red-50 rounded-2xl flex items-center justify-center text-red-500 active:scale-95 transition-all border border-red-100"><Trash2 size={22}/></button>
                </div>
              </div>
            ))}
            {filteredProducts.length === 0 && <NoResults searchQuery={searchQuery} />}
          </div>
        </>
      ) : (
        /* RESPONSIVE FULL FORM (ADD/EDIT) */
        <div className="max-w-4xl mx-auto bg-white rounded-[3rem] md:rounded-[4rem] shadow-2xl border border-slate-100 overflow-hidden animate-in slide-in-from-bottom-10 duration-500">
          <div className="p-6 md:p-8 bg-slate-900 text-white flex justify-between items-center sticky top-0 z-30">
            <button onClick={() => {setIsAdding(false); setEditingId(null); setFormData(initialForm);}} className="text-[10px] font-black uppercase flex items-center gap-2 opacity-70 active:scale-90 transition-all"><ArrowLeft size={18}/> Back</button>
            <span className="font-black italic uppercase text-indigo-400 text-sm">{editingId ? 'Modify Product' : 'New Product'}</span>
          </div>

          <form onSubmit={handleSave} className="p-6 md:p-12 space-y-12">
            <section className="space-y-4">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic">Media (Max 5)</h4>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-4">
                {formData.images.map((img, idx) => (
                  <div key={idx} className="relative aspect-square">
                    <label className="w-full h-full bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl flex flex-col items-center justify-center cursor-pointer hover:bg-white transition-all overflow-hidden group active:scale-95">
                      {img ? <img src={img} className="w-full h-full object-cover" /> : (uploadingIdx === idx ? <RefreshCw className="animate-spin text-indigo-500" size={24} /> : <UploadCloud size={28} className="text-slate-200" />)}
                      <input type="file" className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, idx)} />
                    </label>
                    {img && <button type="button" onClick={() => removeImageSlot(idx)} className="absolute -top-1 -right-1 bg-white text-red-500 rounded-full p-2 shadow-lg border border-slate-100 active:scale-75"><X size={12} strokeWidth={4}/></button>}
                  </div>
                ))}
              </div>
            </section>

            <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Title *</label>
                <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full p-5 bg-slate-50 border-none rounded-2xl font-bold focus:ring-4 focus:ring-indigo-50 outline-none text-base" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Price (Rs) *</label>
                <input required type="number" inputMode="decimal" value={formData.unit_price} onChange={e => setFormData({...formData, unit_price: e.target.value})} className="w-full p-5 bg-slate-50 border-none rounded-2xl font-bold focus:ring-4 focus:ring-indigo-50 outline-none text-base" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Manual SKU</label>
                <input value={formData.manual_id} onChange={e => setFormData({...formData, manual_id: e.target.value})} className="w-full p-5 bg-slate-50 border-none rounded-2xl font-bold focus:ring-4 focus:ring-indigo-50 outline-none text-base" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Quantity</label>
                <input type="number" inputMode="numeric" value={formData.available_stock} onChange={e => setFormData({...formData, available_stock: e.target.value})} className="w-full p-5 bg-slate-50 border-none rounded-2xl font-bold focus:ring-4 focus:ring-indigo-50 outline-none text-base" />
              </div>
              <div className="md:col-span-2 space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Internal Admin Remarks</label>
                <input value={formData.remarks} onChange={e => setFormData({...formData, remarks: e.target.value})} className="w-full p-5 bg-slate-50 border-none rounded-2xl font-bold focus:ring-4 focus:ring-indigo-50 outline-none text-base" />
              </div>
              <div className="md:col-span-2 space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Public Description</label>
                <textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full p-5 bg-slate-50 border-none rounded-2xl font-bold h-32 md:h-48 resize-none outline-none focus:ring-4 focus:ring-indigo-50 text-base" />
              </div>
            </section>

            <section className="space-y-6">
              <div className="flex justify-between items-center border-b border-slate-50 pb-4">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2 italic"><Layers size={14}/> Variations</h4>
                <button type="button" onClick={() => setFormData({...formData, variations: [...formData.variations, {variation_name: ''}]})} className="text-[9px] font-black text-indigo-600 uppercase flex items-center gap-1 bg-indigo-50 px-4 py-3 rounded-2xl active:scale-95 transition-all"><PlusCircle size={16}/> Add Variant</button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {formData.variations.map((v, i) => (
                  <div key={i} className="relative group animate-in zoom-in-95">
                    <input placeholder="Red" value={v.variation_name} onChange={e => {const updated = [...formData.variations]; updated[i].variation_name = e.target.value; setFormData({...formData, variations: updated});}} className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold outline-none focus:ring-4 focus:ring-indigo-50 uppercase text-sm shadow-inner" />
                    <button type="button" onClick={() => setFormData({...formData, variations: formData.variations.filter((_, idx) => idx !== i)})} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 active:scale-75 transition-all"><MinusCircle size={18}/></button>
                  </div>
                ))}
              </div>
            </section>

            <button disabled={saving} type="submit" className="w-full bg-slate-900 text-white py-6 rounded-[2.5rem] font-black uppercase text-xs md:text-sm tracking-[0.3em] flex justify-center items-center gap-3 active:scale-[0.98] transition-all shadow-2xl">
              {saving ? <RefreshCw className="animate-spin" size={20}/> : <Save size={20}/>}
              {editingId ? 'Push Updates' : 'Sync Catalog'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

function NoResults({ searchQuery }) {
  return (
    <div className="py-24 flex flex-col items-center justify-center text-slate-300 gap-4">
      <Package size={64} className="opacity-10" />
      <div className="text-center">
        <p className="text-sm font-black uppercase tracking-widest">No matching items</p>
        <p className="text-xs font-bold opacity-60 italic">"{searchQuery}"</p>
      </div>
    </div>
  );
}