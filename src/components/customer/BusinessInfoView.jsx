import React from 'react';
import { MapPin, MessageSquare, ChevronRight, Info, Clock } from 'lucide-react';

export default function BusinessInfoView({ bizData }) {
  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6">
        {/* Business Header */}
        <div className="flex items-center gap-3 pb-4 border-b border-slate-50">
          <Info className="text-indigo-500" size={20} />
          <h2 className="font-black uppercase italic text-slate-800 tracking-tighter">Store Information</h2>
        </div>

        {/* Location */}
        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] ml-1">Our Location</label>
          <div className="flex gap-3 bg-slate-50 p-4 rounded-2xl">
            <MapPin className="text-indigo-500 shrink-0" size={20} />
            <p className="text-sm font-bold text-slate-700 leading-relaxed">
              {bizData?.address || 'This is an online-only business.'}
            </p>
          </div>
        </div>

        {/* Contact Action */}
        <div className="pt-4 space-y-4">
          <a 
            href={`https://wa.me/${bizData?.whatsapp}`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-between p-5 bg-emerald-500 text-white rounded-[1.5rem] shadow-lg shadow-emerald-200 group active:scale-95 transition-all"
          >
            <div className="flex items-center gap-3">
              <MessageSquare size={20} />
              <span className="text-xs font-black uppercase tracking-widest">Chat on WhatsApp</span>
            </div>
            <ChevronRight className="group-hover:translate-x-1 transition-transform" size={18} />
          </a>
        </div>
      </div>

      {/* Safety Notice */}
      <div className="p-6 bg-amber-50 rounded-[2rem] border border-amber-100 flex gap-3">
        <Clock className="text-amber-600 shrink-0" size={18} />
        <p className="text-[10px] text-amber-800 font-bold uppercase leading-relaxed tracking-tight">
          Please check operating hours before visiting or booking services.
        </p>
      </div>
    </div>
  );
}