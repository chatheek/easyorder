import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { 
  Edit2, Check, X, Search, Image as ImageIcon, 
  User, Phone, Calendar, CreditCard, RefreshCw, 
  PauseCircle, PlayCircle, Mail, Briefcase, Download, 
  MapPin, Fingerprint, Trash2, Save, UploadCloud, 
  MoreHorizontal, AlertTriangle, Clock, AlignLeft, ChevronDown
} from 'lucide-react';

export default function BusinessList() {
  const [businesses, setBusinesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [pendingUpdate, setPendingUpdate] = useState(null);
  const [fullEditBiz, setFullEditBiz] = useState(null);
  const { installPrompt, installApp } = usePWAInstall();

  useEffect(() => { fetchBusinesses(); }, []);

  const fetchBusinesses = async () => {
    setLoading(true);
    const { data } = await supabase.from('businesses').select('*').order('created_at', { ascending: false });
    setBusinesses(data || []);
    setLoading(false);
  };

  const confirmInstantUpdate = async () => {
    if (!pendingUpdate) return;
    const { id, field, value } = pendingUpdate;
    const { error } = await supabase.from('businesses').update({ [field]: value }).eq('id', id);
    if (!error) {
      setBusinesses(prev => prev.map(b => b.id === id ? { ...b, [field]: value } : b));
      setPendingUpdate(null);
    }
  };

  const handleFullUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    let logoPath = fullEditBiz.logo_url;

    if (fullEditBiz.newLogoFile) {
      const file = fullEditBiz.newLogoFile;
      const fileName = `${fullEditBiz.id}-${Date.now()}.${file.name.split('.').pop()}`;
      const { data } = await supabase.storage.from('business-logos').upload(fileName, file);
      if (data) logoPath = data.path;
    }

    const { error } = await supabase.from('businesses').update({
      name: fullEditBiz.name,
      business_type: fullEditBiz.business_type,
      whatsapp: fullEditBiz.whatsapp,
      email: fullEditBiz.email,
      contact_person: fullEditBiz.contact_person,
      reg_no: fullEditBiz.reg_no,
      address: fullEditBiz.address,
      monthly_subscription: fullEditBiz.monthly_subscription,
      total_due: fullEditBiz.total_due,
      next_payment_date: fullEditBiz.next_payment_date,
      subscription_start_date: fullEditBiz.subscription_start_date,
      remarks: fullEditBiz.remarks,
      is_paused: fullEditBiz.is_paused,
      logo_url: logoPath 
    }).eq('id', fullEditBiz.id);

    if (!error) {
      setFullEditBiz(null);
      fetchBusinesses();
    }
    setLoading(false);
  };

  const processedBusinesses = useMemo(() => {
    return businesses.filter(b => 
      b.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
      b.whatsapp?.includes(searchTerm) ||
      b.contact_person?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [businesses, searchTerm]);

  const StaticField = ({ value, icon: Icon, color = "text-slate-700" }) => (
    <div className={`flex items-center gap-2 text-[11px] font-bold ${color}`}>
      {Icon && <Icon size={12} className="opacity-50" />}
      <span className="truncate">{value || '—'}</span>
    </div>
  );

  const InlineField = ({ biz, field, type = "text", placeholder = "" }) => {
    const val = biz[field];
    return (
      <input 
        type={type}
        defaultValue={val || ''}
        placeholder={placeholder}
        onBlur={(e) => e.target.value !== val && setPendingUpdate({ id: biz.id, field, value: e.target.value })}
        className="bg-transparent w-full font-black text-slate-800 outline-none focus:bg-indigo-50 rounded px-1 transition-all"
      />
    );
  };

  return (
    <div className="p-4 md:p-8 max-w-[1600px] mx-auto pb-32">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic leading-none">Registry</h1>
          <p className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.3em] mt-2">Central Ledger Control</p>
        </div>
        
        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" placeholder="Search SME..." 
              className="pl-12 pr-4 py-4 bg-white border-2 border-slate-100 rounded-3xl text-sm outline-none focus:border-indigo-500 w-full shadow-sm font-bold"
              value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button onClick={fetchBusinesses} className="p-4 bg-white border-2 border-slate-100 rounded-3xl text-slate-400 hover:text-indigo-600 shadow-sm transition-all"><RefreshCw size={20} className={loading ? 'animate-spin' : ''} /></button>
        </div>
      </div>

      {/* MOBILE LIST */}
      <div className="md:hidden space-y-6">
        {processedBusinesses.map((biz) => (
          <div key={biz.id} className={`bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6 transition-all ${biz.is_paused ? 'opacity-60 bg-slate-50/50' : ''}`}>
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-100 overflow-hidden flex items-center justify-center">
                  {biz.logo_url ? <img src={`https://qntcbkkwflxeyjvpkoro.supabase.co/storage/v1/object/public/business-logos/${biz.logo_url}`} className="w-full h-full object-cover" /> : <ImageIcon className="text-slate-200" size={24} />}
                </div>
                <div>
                   <p className="font-black uppercase italic text-slate-900 leading-none">{biz.name}</p>
                   <div className="relative mt-1">
                      <select 
                        value={biz.business_type}
                        onChange={(e) => setPendingUpdate({ id: biz.id, field: 'business_type', value: e.target.value })}
                        className="appearance-none bg-indigo-50/50 text-[10px] font-black text-indigo-600 uppercase tracking-widest px-2 py-1 rounded-lg outline-none pr-6"
                      >
                        <option value="product">Product</option>
                        <option value="service">Service</option>
                        <option value="both">Both</option>
                      </select>
                      <ChevronDown size={10} className="absolute right-1 top-1/2 -translate-y-1/2 text-indigo-400 pointer-events-none" />
                   </div>
                </div>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => setPendingUpdate({ id: biz.id, field: 'is_paused', value: !biz.is_paused })}
                  className={`p-3 rounded-2xl shadow-sm transition-all ${biz.is_paused ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-400 hover:text-amber-500'}`}
                >
                  {biz.is_paused ? <PlayCircle size={18}/> : <PauseCircle size={18}/>}
                </button>
                <button onClick={() => setFullEditBiz(biz)} className="p-3 bg-slate-900 text-white rounded-2xl shadow-lg"><Edit2 size={16}/></button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Merchant & Meta</p>
                <StaticField value={biz.contact_person} icon={User} />
                <StaticField value={biz.reg_no} icon={Fingerprint} />
              </div>
              <div className="space-y-1">
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Credentials</p>
                <StaticField value={biz.whatsapp} icon={Phone} />
                <StaticField value={biz.email} icon={Mail} />
              </div>
            </div>

            <div className="bg-slate-50 p-6 rounded-[2rem] grid grid-cols-2 gap-x-6 gap-y-5 border border-slate-100">
               <div className="col-span-2 flex items-center justify-between border-b border-slate-200 pb-2 mb-1">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1"><AlignLeft size={12}/> Remarks</span>
                  <div className="flex-1 ml-4"><InlineField biz={biz} field="remarks" placeholder="Add notes..." /></div>
               </div>
               <div>
                 <p className="text-[8px] font-black text-slate-400 uppercase">Monthly Fee</p>
                 <InlineField biz={biz} field="monthly_subscription" />
               </div>
               <div>
                 <p className="text-[8px] font-black text-red-400 uppercase">Total Due</p>
                 <InlineField biz={biz} field="total_due" />
               </div>
               <div className="col-span-1">
                 <p className="text-[8px] font-black text-slate-400 uppercase">Start Date</p>
                 <InlineField biz={biz} field="subscription_start_date" type="date" />
               </div>
               <div className="col-span-1">
                 <p className="text-[8px] font-black text-indigo-400 uppercase">Next Pay</p>
                 <InlineField biz={biz} field="next_payment_date" type="date" />
               </div>
            </div>
          </div>
        ))}
      </div>

      {/* DESKTOP TABLE */}
      <div className="hidden md:block bg-white rounded-[3rem] shadow-2xl border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1300px]">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100 text-[10px] uppercase font-black text-slate-400 tracking-widest">
                <th className="p-8">Merchant & Meta</th>
                <th className="p-8 text-center">Type</th>
                <th className="p-8">Credentials</th>
                <th className="p-8 text-center">Lifecycle</th>
                <th className="p-8">Billing Metrics (Instant Edit)</th>
                <th className="p-8">Remarks</th>
                <th className="p-8 text-center">Manage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {processedBusinesses.map((biz) => (
                <tr key={biz.id} className={`hover:bg-indigo-50/10 transition-colors group ${biz.is_paused ? 'opacity-50 grayscale-[0.5]' : ''}`}>
                  <td className="p-8">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-2xl overflow-hidden border border-slate-100 flex-shrink-0">
                        {biz.logo_url ? <img src={`https://qntcbkkwflxeyjvpkoro.supabase.co/storage/v1/object/public/business-logos/${biz.logo_url}`} className="w-full h-full object-cover" /> : <div className="bg-slate-50 w-full h-full flex items-center justify-center text-slate-200"><ImageIcon size={20}/></div>}
                      </div>
                      <div className="space-y-1.5 overflow-hidden">
                        <p className="text-sm font-black uppercase italic text-slate-900 truncate">{biz.name}</p>
                        <StaticField value={biz.contact_person} icon={User} color="text-slate-500" />
                        <StaticField value={biz.reg_no} icon={Fingerprint} color="text-slate-400" />
                      </div>
                    </div>
                  </td>
                  <td className="p-8">
                    <div className="relative flex justify-center">
                      <select 
                        value={biz.business_type}
                        onChange={(e) => setPendingUpdate({ id: biz.id, field: 'business_type', value: e.target.value })}
                        className="appearance-none bg-slate-50 border border-slate-200 text-[10px] font-black text-slate-600 uppercase tracking-widest px-4 py-2 rounded-xl outline-none pr-8 focus:border-indigo-400 transition-colors cursor-pointer"
                      >
                        <option value="product">Product</option>
                        <option value="service">Service</option>
                        <option value="both">Both</option>
                      </select>
                      <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>
                  </td>
                  <td className="p-8">
                    <div className="space-y-1.5">
                      <StaticField value={biz.whatsapp} icon={Phone} />
                      <StaticField value={biz.email} icon={Mail} color="text-indigo-500" />
                    </div>
                  </td>
                  <td className="p-8 text-center">
                    <button 
                      onClick={() => setPendingUpdate({ id: biz.id, field: 'is_paused', value: !biz.is_paused })}
                      className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${biz.is_paused ? 'bg-amber-50 text-amber-600 border-amber-200' : 'bg-slate-50 text-slate-400 border-slate-100 hover:border-amber-200 hover:text-amber-500'}`}
                    >
                      {biz.is_paused ? 'Paused' : 'Active'}
                    </button>
                  </td>
                  <td className="p-8">
                    {/* 🚩 DESKTOP: Increased width and internal spacing for Metrics box */}
                    <div className="bg-slate-50/50 p-6 rounded-[1.5rem] border border-slate-100 grid grid-cols-2 gap-x-10 gap-y-4 min-w-[380px]">
                       <div className="space-y-1">
                          <p className="text-[8px] font-black text-slate-400 uppercase">Monthly</p>
                          <InlineField biz={biz} field="monthly_subscription" />
                       </div>
                       <div className="space-y-1 text-red-600">
                          <p className="text-[8px] font-black text-red-400 uppercase">Total Due</p>
                          <InlineField biz={biz} field="total_due" />
                       </div>
                       <div className="space-y-1">
                          <p className="text-[8px] font-black text-slate-400 uppercase">Start Date</p>
                          <InlineField biz={biz} field="subscription_start_date" type="date" />
                       </div>
                       <div className="space-y-1 text-indigo-600">
                          <p className="text-[8px] font-black text-indigo-400 uppercase">Next Pay</p>
                          <InlineField biz={biz} field="next_payment_date" type="date" />
                       </div>
                    </div>
                  </td>
                  <td className="p-8">
                     <div className="text-[11px] font-medium text-slate-400 border-b border-dashed border-slate-200">
                        <InlineField biz={biz} field="remarks" placeholder="Internal note..." />
                     </div>
                  </td>
                  <td className="p-8 text-center">
                    <button onClick={() => setFullEditBiz(biz)} className="p-4 bg-slate-900 text-white rounded-[1.5rem] hover:scale-110 shadow-lg transition-transform"><MoreHorizontal size={20}/></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirmation Popup */}
      {pendingUpdate && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white w-full max-w-sm rounded-[2.5rem] shadow-2xl p-8 text-center space-y-6">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto shadow-inner ${pendingUpdate.field === 'is_paused' ? 'bg-amber-100 text-amber-600' : 'bg-indigo-100 text-indigo-600'}`}>
                {pendingUpdate.field === 'is_paused' ? <AlertTriangle size={32}/> : <Check size={32}/>}
            </div>
            <div>
               <h3 className="text-xl font-black uppercase italic tracking-tighter">
                 {pendingUpdate.field === 'is_paused' ? (pendingUpdate.value ? 'Pause Business?' : 'Resume Business?') : 'Confirm Update?'}
               </h3>
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">
                 {pendingUpdate.field === 'is_paused' ? 'This will affect merchant portal access' : `Set ${pendingUpdate.field.replace('_', ' ')} to:`}
               </p>
               {pendingUpdate.field !== 'is_paused' && (
                 <div className="mt-3 p-3 bg-slate-50 rounded-xl font-black text-indigo-600 italic border border-slate-100 break-words">"{String(pendingUpdate.value).toUpperCase()}"</div>
               )}
            </div>
            <div className="flex gap-3">
               <button onClick={() => { setPendingUpdate(null); fetchBusinesses(); }} className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl font-black uppercase text-[10px] tracking-widest active:scale-95 transition-all">Cancel</button>
               <button onClick={confirmInstantUpdate} className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-indigo-100 active:scale-95 transition-all">Confirm</button>
            </div>
          </div>
        </div>
      )}

      {/* Master Edit Modal */}
      {fullEditBiz && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/80 backdrop-blur-md p-4 animate-in zoom-in-95">
           <div className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden flex flex-col h-full max-h-[90vh]">
              <div className="p-8 bg-slate-900 text-white flex justify-between items-center">
                 <h3 className="text-2xl font-black uppercase italic tracking-tighter">Master Control</h3>
                 <button onClick={() => setFullEditBiz(null)} className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition-all"><X/></button>
              </div>
              <form onSubmit={handleFullUpdate} className="flex-1 overflow-y-auto p-8 space-y-8 no-scrollbar">
                <div className="flex items-center gap-6 p-6 bg-slate-50 rounded-[2rem] border border-slate-100">
                   <div className="w-24 h-24 rounded-[1.5rem] bg-white border-2 border-slate-100 overflow-hidden flex items-center justify-center relative group shadow-sm">
                      {fullEditBiz.logo_url ? (
                        <>
                          <img src={`https://qntcbkkwflxeyjvpkoro.supabase.co/storage/v1/object/public/business-logos/${fullEditBiz.logo_url}`} className="w-full h-full object-cover" />
                          <button 
                            type="button" 
                            onClick={() => setFullEditBiz({...fullEditBiz, logo_url: null})} 
                            className="absolute inset-0 bg-red-500/80 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-opacity text-white font-black uppercase text-[8px]"
                          >
                             <Trash2 size={20} className="mb-1"/> Remove
                          </button>
                        </>
                      ) : (
                        <ImageIcon className="text-slate-100" size={40}/>
                      )}
                   </div>
                   <label className="flex-1 border-4 border-dashed border-slate-200 p-6 rounded-2xl text-center cursor-pointer hover:border-indigo-400 transition-all group">
                      <UploadCloud className="mx-auto text-indigo-400 group-hover:scale-110 transition-transform" size={30}/>
                      <span className="text-[10px] font-black uppercase text-slate-500 mt-1 block tracking-widest">
                        {fullEditBiz.newLogoFile ? `Selected: ${fullEditBiz.newLogoFile.name.substring(0,10)}...` : 'Choose New Logo'}
                      </span>
                      <input type="file" className="hidden" accept="image/*" onChange={(e) => setFullEditBiz({...fullEditBiz, newLogoFile: e.target.files[0]})} />
                   </label>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {[
                    { label: 'Business Name', field: 'name', type: 'text' },
                    { label: 'Contact Person', field: 'contact_person', type: 'text' },
                    { label: 'WhatsApp Number', field: 'whatsapp', type: 'text' },
                    { label: 'Merchant Email', field: 'email', type: 'email' },
                    { label: 'Registration Number', field: 'reg_no', type: 'text' },
                    { label: 'Monthly Sub Fee', field: 'monthly_subscription', type: 'text' },
                    { label: 'Total Outstanding', field: 'total_due', type: 'text' },
                    { label: 'Next Payment Date', field: 'next_payment_date', type: 'date' },
                    { label: 'Subscription Start Date', field: 'subscription_start_date', type: 'date' },
                  ].map(f => (
                    <div key={f.field} className="space-y-1.5">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-3">{f.label}</label>
                      <input 
                        type={f.type} 
                        className="w-full p-5 bg-slate-50 border-2 border-transparent rounded-2xl text-sm font-bold outline-none focus:border-indigo-400 focus:bg-white transition-all shadow-inner"
                        value={fullEditBiz[f.field] || ''}
                        onChange={(e) => setFullEditBiz({...fullEditBiz, [f.field]: e.target.value})}
                      />
                    </div>
                  ))}
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-3">Business Type</label>
                    <select 
                      className="w-full p-5 bg-slate-50 border-2 border-transparent rounded-2xl text-sm font-bold outline-none focus:border-indigo-400 focus:bg-white transition-all shadow-inner"
                      value={fullEditBiz.business_type}
                      onChange={(e) => setFullEditBiz({...fullEditBiz, business_type: e.target.value})}
                    >
                      <option value="product">Product</option>
                      <option value="service">Service</option>
                      <option value="both">Both</option>
                    </select>
                  </div>
                  <div className="md:col-span-2 space-y-1.5">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-3">Physical Address</label>
                    <textarea 
                      className="w-full p-5 bg-slate-50 border-2 border-transparent rounded-2xl text-sm font-bold outline-none focus:border-indigo-400 focus:bg-white transition-all shadow-inner h-24 resize-none"
                      value={fullEditBiz.address || ''}
                      onChange={(e) => setFullEditBiz({...fullEditBiz, address: e.target.value})}
                    />
                  </div>
                  <div className="md:col-span-2 space-y-1.5">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-3">Internal Remarks</label>
                    <textarea 
                      className="w-full p-5 bg-slate-50 border-2 border-transparent rounded-2xl text-sm font-bold outline-none focus:border-indigo-400 focus:bg-white transition-all shadow-inner h-24 resize-none"
                      value={fullEditBiz.remarks || ''}
                      onChange={(e) => setFullEditBiz({...fullEditBiz, remarks: e.target.value})}
                    />
                  </div>
                </div>

                <button type="submit" disabled={loading} className="w-full py-6 bg-indigo-600 text-white rounded-[1.5rem] font-black uppercase text-xs tracking-widest shadow-2xl flex items-center justify-center gap-3 active:scale-[0.98] transition-all">
                  {loading ? <RefreshCw className="animate-spin"/> : <Save size={20}/>} Commit Master Save
                </button>
              </form>
           </div>
        </div>
      )}
    </div>
  );
}