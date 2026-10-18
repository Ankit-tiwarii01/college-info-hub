import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { fetchJobs, createJob } from '../../features/jobs/jobsSlice';
import { Briefcase, MapPin, Plus, ArrowRight } from 'lucide-react';
import SkeletonCard from '../../components/SkeletonCard';
import Breadcrumbs from '../../components/Breadcrumbs';

const JobsPage = () => {
  const dispatch = useDispatch();
  const { jobs, loading } = useSelector((state) => state.jobs);
  const { user } = useSelector((state) => state.auth);
  
  // Simple modal toggle for creating job (only if alumni/faculty)
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ title: '', company: '', description: '', apply_link: '', location: '', type: 'Full-time' });

  const canPost = user?.role === 'alumni' || user?.role === 'faculty' || user?.role === 'admin';

  useEffect(() => {
    dispatch(fetchJobs());
  }, [dispatch]);

  const handleSubmit = (e) => {
    e.preventDefault();
    dispatch(createJob(formData)).then((res) => {
        if (!res.error) {
            setShowModal(false);
            setFormData({ title: '', company: '', description: '', apply_link: '', location: '', type: 'Full-time' });
        }
    });
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <Breadcrumbs items={[{ label: 'Dashboard', path: user?.role === 'alumni' ? '/alumni/dashboard' : '/student/dashboard' }, { label: 'Jobs & Openings' }]} />
      <div className="flex justify-between items-center mb-10">
        <div>
            <h1 className="text-4xl font-serif font-bold text-slate-800 tracking-tight">Career Opportunities</h1>
            <p className="text-slate-500 mt-2">Discover your next big step.</p>
        </div>
        {canPost && (
            <button onClick={() => setShowModal(true)} className="flex items-center space-x-2 px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-lg shadow-amber-500/20 hover:shadow-amber-500/30 hover:-translate-y-0.5 transition-all font-bold">
                <Plus size={20} />
                <span>Post Opportunity</span>
            </button>
        )}
      </div>

      {loading && jobs.length === 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} avatar lines={3} />)}
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2">
            {jobs.map(job => (
                <div key={job.id} className="glass-panel p-8 rounded-2xl hover:border-amber-200 hover:shadow-2xl hover:shadow-amber-900/10 transition-all duration-300 group border border-white/60 bg-white/70 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-xl group-hover:bg-amber-500/10 transition-all -mr-5 -mt-5"></div>
                    
                    <div className="flex justify-between items-start mb-6 relative z-10">
                        <div>
                            <h3 className="font-serif font-bold text-2xl text-slate-800 group-hover:text-amber-700 transition-colors mb-1">{job.title}</h3>
                            <p className="text-amber-600 font-bold text-sm tracking-wide uppercase">{job.company}</p>
                        </div>
                        <div className="h-12 w-12 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 border border-amber-100 shadow-sm group-hover:scale-110 transition-transform">
                            <Briefcase size={22} />
                        </div>
                    </div>
                    
                    <div className="flex items-center text-sm text-slate-500 mb-6 space-x-3 relative z-10">
                        <span className="flex items-center bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100 font-medium"><Briefcase size={14} className="mr-2 text-slate-400"/> {job.type || 'Full-time'}</span>
                        {job.location && <span className="flex items-center bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100 font-medium"><MapPin size={14} className="mr-2 text-slate-400"/> {job.location}</span>}
                    </div>
                    
                    <p className="text-slate-600 text-sm line-clamp-3 mb-8 leading-relaxed bg-white/50 p-4 rounded-xl border border-white/60 shadow-inner">{job.description}</p>
                    
                    <div className="relative z-10">
                        <Link to={String(job.id)} className="flex items-center justify-center w-full p-3.5 rounded-xl bg-slate-50 text-slate-600 font-bold border border-slate-200 hover:bg-amber-50 hover:text-amber-700 hover:border-amber-200 transition-all group-own">
                            <span>View Details</span>
                            <ArrowRight size={18} className="transform group-hover:translate-x-1 transition-transform ml-2" />
                        </Link>
                    </div>
                </div>
            ))}
        </div>
      )}

      {/* Post Job Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 transition-opacity">
            <div className="bg-white rounded-2xl p-8 w-full max-w-lg shadow-2xl ring-1 ring-slate-900/5 transform transition-all scale-100">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-serif font-bold text-slate-800">Post Opportunity</h2>
                    <button onClick={()=>setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                </div>
                
                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Job Title</label>
                        <input className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:border-amber-500 focus:bg-white focus:ring-4 focus:ring-amber-500/10 transition-all font-medium" placeholder="e.g. Senior Frontend Engineer" value={formData.title} onChange={e=>setFormData({...formData, title: e.target.value})} required />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Description</label>
                        <textarea className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:border-amber-500 focus:bg-white focus:ring-4 focus:ring-amber-500/10 transition-all font-medium resize-none" placeholder="Job details..." rows="4" value={formData.description} onChange={e=>setFormData({...formData, description: e.target.value})} required />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Company</label>
                        <input className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:border-amber-500 focus:bg-white focus:ring-4 focus:ring-amber-500/10 transition-all font-medium" placeholder="Company Name" value={formData.company} onChange={e=>setFormData({...formData, company: e.target.value})} required />
                    </div>
                    <div className="grid grid-cols-2 gap-5">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">Location</label>
                            <input className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:border-amber-500 focus:bg-white focus:ring-4 focus:ring-amber-500/10 transition-all font-medium" placeholder="Remote, NY, etc." value={formData.location} onChange={e=>setFormData({...formData, location: e.target.value})} />
                        </div>
                        <div>
                             <label className="block text-sm font-bold text-slate-700 mb-2">Type</label>
                             <div className="relative">
                                 <select className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:border-amber-500 focus:bg-white focus:ring-4 focus:ring-amber-500/10 transition-all font-medium appearance-none" value={formData.type} onChange={e=>setFormData({...formData, type: e.target.value})}>
                                    <option value="Full-time">Full-time</option>
                                    <option value="Part-time">Part-time</option>
                                    <option value="Internship">Internship</option>
                                    <option value="Contract">Contract</option>
                                 </select>
                                 <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2.5 4.5L6 8L9.5 4.5"/></svg>
                                 </div>
                             </div>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Application Link</label>
                        <input className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:border-amber-500 focus:bg-white focus:ring-4 focus:ring-amber-500/10 transition-all font-medium" placeholder="https://" value={formData.apply_link} onChange={e=>setFormData({...formData, apply_link: e.target.value})} />
                    </div>
                    <div className="flex justify-end space-x-3 mt-8 pt-6 border-t border-slate-100">
                        <button type="button" onClick={()=>setShowModal(false)} className="px-6 py-2.5 text-slate-500 hover:text-slate-800 font-bold hover:bg-slate-50 rounded-xl transition">Cancel</button>
                        <button type="submit" className="px-8 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 text-white font-bold rounded-xl hover:shadow-lg hover:shadow-amber-500/30 hover:-translate-y-0.5 transition-all">Post Job</button>
                    </div>
                </form>
            </div>
        </div>
      )}
    </div>
  );
};

export default JobsPage;
