import { useState } from 'react';
import { supabase, supabaseAdmin } from '../lib/supabase';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { 
  Building2, Smartphone, User, MapPin, 
  Fingerprint, UploadCloud, CheckCircle2,
  Info, Mail, Loader2, Download
} from 'lucide-react';

export default function DevDashboard() {
  const [loading, setLoading] = useState(false);
  const { installPrompt, installApp } = usePWAInstall();
  const [form, setForm] = useState({
    email: '',
    businessName: '',
    address: '',
    regNo: '',
    whatsapp: '',
    contactPerson: '',
    businessType: 'service',
    logo: null
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    setForm(prev => ({ ...prev, logo: e.target.files[0] }));
  };

  const handleOnboard = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      let logoPath = '';

      if (form.logo) {
        const fileExt = form.logo.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('business-logos')
          .upload(fileName, form.logo);
        if (uploadError) throw uploadError;
        logoPath = uploadData.path;
      }

      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: form.email,
        password: 'admin2026',
        email_confirm: true,
        user_metadata: { role: 'admin' }
      });

      if (authError) throw authError;

      const { error: dbError } = await supabase.from('businesses').insert({
        admin_id: authData.user.id,
        email: form.email,
        name: form.businessName,
        address: form.address || null,
        reg_no: form.regNo || null,
        whatsapp: form.whatsapp,
        contact_person: form.contactPerson || null,
        business_type: form.businessType,
        logo_url: logoPath || null,
        monthly_subscription: 'N/A',
        total_due: 'N/A',
        remarks: 'N/A'
      });

      if (dbError) throw dbError;

      alert(`Success! ${form.businessName} provisioned.`);
      setForm({
        email: '', businessName: '', address: '', regNo: '',
        whatsapp: '', contactPerson: '', businessType: 'service', logo: null
      });

    } catch (err) {
      console.error(err);
      alert(`Onboarding failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-10 max-w-5xl mx-auto pb-20">
      {/* Responsive Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase italic">Onboarding</h1>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">SME Provisioning Engine</p>
        </div>
        {installPrompt && (
          <button 
            onClick={installApp}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-200"
          >
            <Download size={14} /> Install Dev App
          </button>
        )}
      </div>

      <div className="bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/60 border border-slate-100 overflow-hidden">
        {/* Banner Section */}
        <div className="bg-slate-900 p-8 md:p-12 text-white relative overflow-hidden">
          <div className="relative z-10">
            <h3 className="text-2xl font-bold tracking-tight">Business Configuration</h3>
            <p className="text-slate-400 mt-2 text-xs md:text-sm max-w-md leading-relaxed">
              Register a new SME and generate their secure portal. Credentials will be active immediately.
            </p>
          </div>
          <Building2 className="absolute -right-6 -bottom-6 text-white/5 w-48 h-48 transform rotate-12" />
        </div>

        <form onSubmit={handleOnboard} className="p-6 md:p-12 space-y-10 md:space-y-12">
          
          {/* Identity Section */}
          <div className="space-y-6 md:space-y-8">
            <div className="flex items-center gap-3 text-indigo-600 font-black uppercase text-[10px] tracking-[0.2em]">
              <span className="w-8 h-px bg-indigo-100"></span> 01. Identity
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Business Name *</label>
                <input type="text" name="businessName" value={form.businessName} onChange={handleInputChange} required 
                  className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-50 transition-all font-semibold" placeholder="e.g. Nexus Tech" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 italic opacity-70">Reg Number</label>
                <div className="relative">
                  <Fingerprint className="absolute left-4 top-4 text-slate-300" size={18} />
                  <input type="text" name="regNo" value={form.regNo} onChange={handleInputChange}
                    className="w-full pl-12 pr-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-semibold" placeholder="BRN-00X" />
                </div>
              </div>
              <div className="md:col-span-2 space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 italic opacity-70">Address</label>
                <div className="relative">
                  <MapPin className="absolute left-4 top-4 text-slate-300" size={18} />
                  <textarea name="address" value={form.address} onChange={handleInputChange} rows="2"
                    className="w-full pl-12 pr-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none resize-none font-semibold" placeholder="Headquarters location..." />
                </div>
              </div>
            </div>
          </div>

          {/* Contact Section */}
          <div className="space-y-6 md:space-y-8">
            <div className="flex items-center gap-3 text-indigo-600 font-black uppercase text-[10px] tracking-[0.2em]">
              <span className="w-8 h-px bg-indigo-100"></span> 02. Credentials
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Admin Email *</label>
                <input type="email" name="email" value={form.email} onChange={handleInputChange} required inputMode="email"
                  className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-semibold" placeholder="admin@domain.com" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">WhatsApp *</label>
                <input type="text" name="whatsapp" value={form.whatsapp} onChange={handleInputChange} required inputMode="tel"
                  className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-semibold" placeholder="07xxxxxxxx" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 italic opacity-70">Contact Person</label>
                <input type="text" name="contactPerson" value={form.contactPerson} onChange={handleInputChange}
                  className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-semibold" placeholder="Owner Name" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Business Nature *</label>
                <select name="businessType" value={form.businessType} onChange={handleInputChange}
                  className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none cursor-pointer font-semibold appearance-none">
                  <option value="service">Service-Based</option>
                  <option value="product">Product-Based</option>
                  <option value="both">Both</option>
                </select>
              </div>
            </div>
          </div>

          {/* Branding Section */}
          <div className="space-y-6 md:space-y-8">
            <div className="flex items-center gap-3 text-indigo-600 font-black uppercase text-[10px] tracking-[0.2em]">
              <span className="w-8 h-px bg-indigo-100"></span> 03. Branding
            </div>
            <div className="border-2 border-dashed border-slate-200 rounded-[2rem] p-6 md:p-12 text-center hover:bg-slate-50 hover:border-indigo-200 transition-all cursor-pointer relative">
              <UploadCloud className="text-indigo-400 mx-auto mb-3" size={32} />
              <h4 className="text-sm font-bold text-slate-700">Upload Business Logo</h4>
              <p className="text-[10px] text-slate-400 mt-1 mb-6 font-bold uppercase tracking-widest">Recommended: Square PNG/JPG</p>
              <input type="file" onChange={handleFileChange} accept="image/*" 
                className="absolute inset-0 opacity-0 cursor-pointer" />
              {form.logo && <div className="text-[10px] font-black text-indigo-600 bg-indigo-50 py-2 px-4 rounded-full inline-block">File Selected: {form.logo.name}</div>}
            </div>
          </div>

          {/* Mobile Optimized Action Button */}
          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-slate-900 hover:bg-black text-white font-black uppercase text-xs tracking-[0.2em] py-6 rounded-2xl flex items-center justify-center gap-3 transition-all active:scale-[0.98] disabled:bg-slate-300"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : <><CheckCircle2 size={20} className="text-indigo-400"/> Provision SME Account</>}
          </button>
        </form>
      </div>
    </div>
  );
}  