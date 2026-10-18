import React from 'react';
import { Lock } from 'lucide-react';

const MentorCard = ({ mentor, requireLogin }) => (
  <div className="p-6 rounded-2xl bg-white border border-slate-100 hover:border-amber-200 hover:shadow-xl transition-all text-center group">
    <div className="h-20 w-20 mx-auto rounded-full bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center text-white font-serif font-bold text-2xl mb-4 shadow-lg group-hover:scale-105 transition-transform">
      {mentor.avatar ? <img src={mentor.avatar} alt="" className="w-full h-full rounded-full object-cover" /> : mentor.name?.charAt(0)}
    </div>
    <h4 className="font-serif font-bold text-lg text-slate-900">{mentor.name}</h4>
    {mentor.department && <p className="text-amber-600 text-sm font-semibold">{mentor.department}</p>}
    {mentor.batch && <p className="text-xs text-slate-400 font-medium">Batch {mentor.batch}</p>}
    {mentor.skills && <div className="flex flex-wrap gap-1.5 justify-center mt-3">{mentor.skills.split(',').slice(0,3).map(s=><span key={s} className="text-xs bg-slate-50 text-slate-600 px-2 py-0.5 rounded-full border border-slate-100 font-medium">{s.trim()}</span>)}</div>}
    <button onClick={() => requireLogin('Sign in to request mentorship.')} className="mt-4 w-full py-2.5 rounded-xl bg-gradient-to-r from-slate-800 to-slate-900 text-white font-bold text-sm shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2"><Lock size={14} />Request Mentorship</button>
  </div>
);

export default MentorCard;
