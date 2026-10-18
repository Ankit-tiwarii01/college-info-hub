import React from 'react';
import { MapPin, TrendingUp, Lock } from 'lucide-react';

const JobCard = ({ job, requireLogin }) => (
  <div className="p-6 rounded-2xl bg-white border border-slate-100 hover:border-amber-200 hover:shadow-xl transition-all">
    <div className="flex justify-between items-start mb-3">
      <div><h4 className="font-serif font-bold text-lg text-slate-900">{job.title}</h4><p className="text-amber-600 font-semibold text-sm">{job.company}</p></div>
      {job.type && <span className="text-xs bg-amber-50 text-amber-700 px-2.5 py-1 rounded-full font-bold uppercase">{job.type}</span>}
    </div>
    <div className="flex flex-wrap gap-3 text-xs text-slate-500 mb-4">
      {job.location && <span className="flex items-center gap-1"><MapPin size={12} />{job.location}</span>}
      {job.salary && <span className="flex items-center gap-1"><TrendingUp size={12} />{job.salary}</span>}
    </div>
    {job.description && <p className="text-slate-600 text-sm line-clamp-3 mb-4">{job.description}</p>}
    <button onClick={() => requireLogin('Sign in to apply for jobs.')} className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-white font-bold text-sm shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2"><Lock size={14} />Apply Now</button>
  </div>
);

export default JobCard;
