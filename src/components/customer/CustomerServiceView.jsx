import React from 'react';
import { Calendar } from 'lucide-react';

export default function CustomerServiceView({ bizData }) {
  return (
    <div className="p-10 text-center bg-white rounded-[2rem] border border-slate-100">
      <Calendar className="mx-auto mb-4 text-indigo-500" size={32} />
      <h2 className="font-black uppercase italic">Booking Coming Soon</h2>
      <p className="text-xs text-slate-400 uppercase tracking-widest">Service for {bizData?.name}</p>
    </div>
  );
}