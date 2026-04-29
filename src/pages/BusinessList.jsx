import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { 
  Edit2, Check, X, Search, Image as ImageIcon, 
  User, Phone, Calendar, CreditCard, RefreshCcw,
  Lock, Unlock, PauseCircle, PlayCircle, MessageSquare,
  Mail, Briefcase, Download, Filter
} from 'lucide-react';

export default function BusinessList() {
  const [businesses, setBusinesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCell, setActiveCell] = useState({ id: null, field: null });
  const { installPrompt, installApp } = usePWAInstall();

  useEffect(() => { fetchBusinesses(); }, []);

  const fetchBusinesses = async () => {
    setLoading(true);
    const { data } = await supabase.from('businesses').select('*');
    setBusinesses(data || []);
    setLoading(false);
  };

  const togglePause = async (id, currentStatus) => {
    const { error } = await supabase.from('businesses').update({ is_paused: !currentStatus }).eq('id', id);
    if (!error) {
      setBusinesses(prev => prev.map(b => b.id === id ? { ...b, is_paused: !currentStatus } : b));
    }
  };

  const handleLogoUpdate = async (e, id) => {
    const file = e.target.files[0];
    if (!file) return;
    const fileName = `${id}-${Date.now()}.${file.name.split('.').pop()}`;
    const { data } = await supabase.storage.from('business-logos').upload(fileName, file);
    if (data) {
      await supabase.from('businesses').update({ logo_url: data.path }).eq('id', id);
      fetchBusinesses();
    }
  };

  const processedBusinesses = useMemo(() => {
    const today = new Date();
    return businesses
      .filter(b => 
        b.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
        b.whatsapp?.includes(searchTerm) ||
        b.email?.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .sort((a, b) => {
        if (a.next_payment_date === 'N/A') return 1;
        if (b.next_payment_date === 'N/A') return -1;
        const dateA = new Date(a.next_payment_date);
        const dateB = new Date(b.next_payment_date);
        return Math.abs(dateA - today) - Math.abs(dateB - today);
      });
  }, [businesses, searchTerm]);

  // Sub-component for inline editing
  const EditableCell = ({ bizId, field, initialValue, type = "text", isLongText = false, options = null, isFixed = false }) => {
    const [localValue, setLocalValue] = useState(initialValue || '');
    const isEditing = activeCell.id === bizId && activeCell.field === field;

    const handleSave = async () => {
      const { error } = await supabase.from('businesses').update({ [field]: localValue }).eq('id', bizId);
      if (!error) {
        setBusinesses(prev => prev.map(b => b.id === bizId ? { ...b, [field]: localValue } : b));
        setActiveCell({ id: null, field: null });
      }
    };

    if (isEditing) {
      return (
        <div className="flex items-center gap-1 w-full bg-white shadow-xl border-2 border-indigo-500 rounded-xl p-2 z-20">
          {options ? (
            <select autoFocus className="text-sm w-full outline-none bg-transparent font-bold" value={localValue} onChange={(e) => setLocalValue(e.target.value)}>
              {options.map(opt => <option key={opt} value={opt}>{opt.toUpperCase()}</option>)}
            </select>
          ) : (
            <input 
              type={type} autoFocus 
              className="text-sm w-full outline-none px-1 font-bold" 
              value={localValue} 
              onChange={(e) => setLocalValue(e.target.value)} 
            />
          )}
          <button onClick={handleSave} className="bg-green-500 text-white p-1.5 rounded-lg"><Check size={16}/></button>
          <button onClick={() => setActiveCell({ id: null, field: null })} className="bg-slate-100 text-slate-400 p-1.5 rounded-lg"><X size={16}/></button>
        </div>
      );
    }

    return (
      <div className="flex items-center justify-between group min-h-[40px] w-full cursor-pointer" onClick={() => !isFixed && setActiveCell({ id: bizId, field })}>
        <span className={`text-sm font-semibold ${isLongText ? 'line-clamp-2 text-slate-500 italic' : 'text-slate-700'}`}>
          {initialValue || '—'}
        </span>
        {!isFixed && <Edit2 size={12} className="opacity-0 group-hover:opacity-100 text-indigo-400" />}
      </div>
    );
  };

  return (
    <div className="p-4 md:p-8 max-w-[1600px] mx-auto pb-24 md:pb-8">
      {/* Header & Search */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase italic">Ledger</h1>
          <p className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em] mt-1">Dev Administration</p>
        </div>
        
        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Search SME..." 
              className="pl-12 pr-4 py-4 bg-white border-2 border-slate-100 rounded-2xl text-sm outline-none focus:border-indigo-500 w-full shadow-sm font-medium"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button onClick={fetchBusinesses} className="p-4 bg-white border-2 border-slate-100 rounded-2xl text-slate-400 hover:text-indigo-600 transition-all">
            <RefreshCcw size={20} className={loading ? 'animate-spin' : ''} />
          </button>
          {installPrompt && (
            <button onClick={installApp} className="p-4 bg-slate-900 text-white rounded-2xl shadow-lg animate-bounce">
              <Download size={20} />
            </button>
          )}
        </div>
      </div>

      {/* MOBILE LIST VIEW (Hidden on Desktop) */}
      <div className="md:hidden space-y-4">
        {processedBusinesses.map((biz) => (
          <div key={biz.id} className={`bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 space-y-4 ${biz.is_paused ? 'opacity-60 grayscale' : ''}`}>
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 border border-slate-200 overflow-hidden">
                  {biz.logo_url ? <img src={`https://qntcbkkwflxeyjvpkoro.supabase.co/storage/v1/object/public/business-logos/${biz.logo_url}`} className="w-full h-full object-cover" /> : <ImageIcon className="m-auto mt-3 text-slate-300" />}
                </div>
                <div>
                  <EditableCell bizId={biz.id} field="name" initialValue={biz.name} />
                  <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">{biz.business_type}</span>
                </div>
              </div>
              <button onClick={() => togglePause(biz.id, biz.is_paused)} className={`p-2 rounded-xl border ${biz.is_paused ? 'bg-amber-50 border-amber-100' : 'bg-green-50 border-green-100'}`}>
                {biz.is_paused ? <PlayCircle className="text-amber-600" /> : <PauseCircle className="text-green-600" />}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-50">
              <div className="space-y-1">
                <p className="text-[9px] font-black text-slate-300 uppercase">WhatsApp</p>
                <p className="text-xs font-bold text-slate-600">{biz.whatsapp}</p>
              </div>
              <div className="space-y-1 text-right">
                <p className="text-[9px] font-black text-slate-300 uppercase">Due Amount</p>
                <div className="text-red-500 font-bold"><EditableCell bizId={biz.id} field="total_due" initialValue={biz.total_due} /></div>
              </div>
              <div className="space-y-1">
                <p className="text-[9px] font-black text-slate-300 uppercase">Next Pay</p>
                <div className="text-indigo-600 font-bold"><EditableCell bizId={biz.id} field="next_payment_date" initialValue={biz.next_payment_date} type="date" /></div>
              </div>
              <div className="space-y-1 text-right">
                <p className="text-[9px] font-black text-slate-300 uppercase">Sub Fee</p>
                <EditableCell bizId={biz.id} field="monthly_subscription" initialValue={biz.monthly_subscription} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* DESKTOP TABLE VIEW (Hidden on Mobile) */}
      <div className="hidden md:block bg-white rounded-[2.5rem] shadow-xl border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100 text-[10px] uppercase font-black text-slate-400 tracking-widest">
                <th className="p-6">SME Identity</th>
                <th className="p-6">Credentials</th>
                <th className="p-6">Type</th>
                <th className="p-6">Billing</th>
                <th className="p-6 text-red-500">Total Due</th>
                <th className="p-6">Next Payment</th>
                <th className="p-6">Remarks</th>
                <th className="p-6 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {processedBusinesses.map((biz) => (
                <tr key={biz.id} className={`transition-all ${biz.is_paused ? 'opacity-50' : 'hover:bg-indigo-50/20'}`}>
                  <td className="p-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 flex-shrink-0 rounded-2xl overflow-hidden border border-slate-100">
                        {biz.logo_url ? <img src={`https://qntcbkkwflxeyjvpkoro.supabase.co/storage/v1/object/public/business-logos/${biz.logo_url}`} className="w-full h-full object-cover" /> : <div className="bg-slate-50 w-full h-full flex items-center justify-center text-slate-200"><ImageIcon size={18}/></div>}
                      </div>
                      <div className="w-40"><EditableCell bizId={biz.id} field="name" initialValue={biz.name} /></div>
                    </div>
                  </td>
                  <td className="p-6">
                    <div className="flex flex-col gap-1 text-[11px] font-bold">
                      <div className="flex items-center gap-2 text-slate-400"><Phone size={12}/> {biz.whatsapp}</div>
                      <div className="flex items-center gap-2 text-indigo-500"><Mail size={12}/> {biz.email}</div>
                    </div>
                  </td>
                  <td className="p-6">
                    <EditableCell bizId={biz.id} field="business_type" initialValue={biz.business_type} options={['service', 'product', 'both']} />
                  </td>
                  <td className="p-6">
                    <div className="flex items-center gap-2 font-bold"><CreditCard size={14} className="text-slate-300"/><EditableCell bizId={biz.id} field="monthly_subscription" initialValue={biz.monthly_subscription} /></div>
                  </td>
                  <td className="p-6 text-red-600 font-black"><EditableCell bizId={biz.id} field="total_due" initialValue={biz.total_due} /></td>
                  <td className="p-6 font-bold text-indigo-600"><EditableCell bizId={biz.id} field="next_payment_date" initialValue={biz.next_payment_date} type="date" /></td>
                  <td className="p-6 min-w-[200px]"><EditableCell bizId={biz.id} field="remarks" initialValue={biz.remarks} isLongText /></td>
                  <td className="p-6 text-center">
                    <button onClick={() => togglePause(biz.id, biz.is_paused)} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${biz.is_paused ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-green-50 text-green-600 border-green-100'}`}>
                      {biz.is_paused ? 'Paused' : 'Active'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}