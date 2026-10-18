import React, { useEffect, useState } from 'react';
import API from '../../services/api';
import { Loader2, Trash2, ExternalLink, Briefcase, Calendar, MapPin, Building2, ArrowLeft, CheckCircle, XCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Breadcrumbs from '../../components/Breadcrumbs';

const AdminJobs = () => {
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchJobs();
    }, []);

    const fetchJobs = async () => {
        try {
            const res = await API.get('/admin/jobs');
            setJobs(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id, title) => {
        if (!window.confirm(`Delete job posting: "${title}"?`)) return;
        try {
            await API.delete(`/admin/jobs/${id}`);
            setJobs(jobs.filter(j => j.id !== id));
        } catch (err) {
            alert('Failed to delete job');
        }
    };

    const handleModeration = async (id, decision) => {
        try {
            const res = await API.post(`/admin/jobs/${id}/${decision}`);
            setJobs(current => current.map(job => job.id === id ? res.data : job));
        } catch (err) {
            alert(err.response?.data?.detail || `Failed to ${decision} job`);
        }
    };

    const JobCard = ({ job }) => (
        <motion.div 
            layout
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="group relative bg-white rounded-3xl p-6 border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-amber-900/5 hover:-translate-y-1 transition-all duration-300"
        >
             <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity flex space-x-2">
                 <Link 
                    to={`/jobs/${job.id}`} 
                    target="_blank"
                    className="p-2 bg-slate-100 text-slate-500 rounded-xl hover:bg-slate-200 transition"
                    title="View Job"
                 >
                     <ExternalLink size={16} />
                 </Link>
                 <button 
                    onClick={() => handleDelete(job.id, job.title)}
                    className="p-2 bg-rose-50 text-rose-500 rounded-xl hover:bg-rose-100 transition"
                    title="Delete Job"
                 >
                     <Trash2 size={16} />
                 </button>
             </div>

            <div className="flex items-start space-x-4 mb-4">
                <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 flex items-center justify-center text-2xl border border-amber-100 text-amber-600">
                    <Building2 size={24} />
                </div>
                <div>
                    <h3 className="text-lg font-serif font-bold text-slate-800 leading-tight">{job.title}</h3>
                    <p className="text-sm text-slate-500 font-medium">{job.company}</p>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
                 <div className="flex items-center text-xs text-slate-500 bg-slate-50 px-3 py-2 rounded-lg">
                    <Briefcase size={14} className="mr-2 text-slate-400" />
                    {job.type}
                 </div>
                 <div className="flex items-center text-xs text-slate-500 bg-slate-50 px-3 py-2 rounded-lg">
                    <MapPin size={14} className="mr-2 text-slate-400" />
                    {job.location || 'Remote'}
                 </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                 <div className="flex items-center text-xs text-slate-400">
                     <Calendar size={14} className="mr-1.5" />
                     Posted {new Date(job.posted_date || Date.now()).toLocaleDateString()}
                 </div>
                 <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                     job.approval_status === 'Pending' ? 'bg-amber-50 text-amber-700' : job.approval_status === 'Rejected' ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'
                 }`}>
                     {job.approval_status || (job.is_active !== false ? 'Approved' : 'Closed')}
                 </span>
            </div>
            {job.approval_status === 'Pending' && (
                <div className="grid grid-cols-2 gap-3 mt-4">
                    <button onClick={() => handleModeration(job.id, 'reject')} className="flex items-center justify-center gap-2 py-2 rounded-xl border border-rose-200 text-rose-600 font-bold text-sm hover:bg-rose-50"><XCircle size={16}/>Reject</button>
                    <button onClick={() => handleModeration(job.id, 'approve')} className="flex items-center justify-center gap-2 py-2 rounded-xl bg-emerald-500 text-white font-bold text-sm hover:bg-emerald-600"><CheckCircle size={16}/>Approve</button>
                </div>
            )}
        </motion.div>
    );

    return (
        <div className="max-w-7xl mx-auto space-y-4">
             {/* Navigation Breadcrumbs & Back Button */}
             <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                 <Breadcrumbs items={[{ label: 'Admin', path: '/admin' }, { label: 'Job Board' }]} />
                 <Link to="/admin" className="px-3.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 shadow-sm flex items-center gap-1.5 transition">
                     <ArrowLeft size={14} /> ← Back to Dashboard
                 </Link>
             </div>

             <div className="mb-10">
                <h1 className="text-3xl font-serif font-bold text-slate-800">Job Listings</h1>
                <p className="text-slate-500 mt-1 font-medium">Review pending opportunities and manage approved or rejected job posts.</p>
            </div>

            {loading ? (
                 <div className="flex justify-center py-20"><Loader2 className="animate-spin text-amber-500" size={40} /></div>
            ) : jobs.length === 0 ? (
                 <div className="text-center py-20 bg-white rounded-3xl border border-slate-100 border-dashed">
                    <p className="text-slate-500 font-medium">No jobs posted yet.</p>
                </div>
            ) : (
                <motion.div 
                    layout
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
                >
                    <AnimatePresence>
                        {jobs.map(job => (
                            <JobCard key={job.id} job={job} />
                        ))}
                    </AnimatePresence>
                </motion.div>
            )}
        </div>
    );
};

export default AdminJobs;
