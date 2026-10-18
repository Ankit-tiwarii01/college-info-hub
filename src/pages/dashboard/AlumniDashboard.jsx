import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { fetchProfile } from '../../features/auth/authSlice';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, Briefcase, MessageCircle, Star, ArrowRight, CheckCircle,
  Clock, Calendar, X, Trash2, ChevronDown, UserCheck, XCircle,
  AlertCircle, TrendingUp
} from 'lucide-react';
import { fetchIncomingRequests, updateRequestStatus } from '../../features/mentorship/mentorshipSlice';
import { fetchJobs, fetchMyPostedJobs, createJob, deleteJob, fetchJobApplications, updateApplicationStatus } from '../../features/jobs/jobsSlice';
import { toast } from 'sonner';

// ─── Post Job Modal ───────────────────────────────────────────────────────────
const PostJobModal = ({ isOpen, onClose, onSubmit }) => {
  const [formData, setFormData] = useState({ title: '', company: '', location: '', type: 'Full-time', description: '' });
  if (!isOpen) return null;
  const handleSubmit = (e) => { e.preventDefault(); onSubmit(formData); setFormData({ title: '', company: '', location: '', type: 'Full-time', description: '' }); };
  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white w-full max-w-2xl rounded-3xl p-8 relative border border-white/60 shadow-2xl">
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-amber-400 via-orange-500 to-amber-600 rounded-t-3xl" />
        <button onClick={onClose} className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 p-2 hover:bg-slate-100 rounded-full transition"><X size={20} /></button>
        <div className="mb-8">
          <h2 className="text-3xl font-serif font-bold text-slate-800 mb-1">Post a Job</h2>
          <p className="text-slate-500">Find the perfect candidate from our alumni network.</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Job Title</label>
            <input required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 outline-none focus:border-amber-500 transition font-medium" placeholder="e.g. Senior Software Engineer" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Company</label>
              <input required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 outline-none focus:border-amber-500 transition font-medium" placeholder="Your Company" value={formData.company} onChange={e => setFormData({ ...formData, company: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Job Type</label>
              <select className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 outline-none focus:border-amber-500 transition font-medium" value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value })}>
                <option>Full-time</option><option>Part-time</option><option>Internship</option><option>Contract</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Location</label>
            <input required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 outline-none focus:border-amber-500 transition font-medium" placeholder="e.g. Remote / New York" value={formData.location} onChange={e => setFormData({ ...formData, location: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Description</label>
            <textarea required rows="4" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 outline-none focus:border-amber-500 transition font-medium resize-none" placeholder="Key responsibilities and requirements..." value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} />
          </div>
          <div className="flex justify-end pt-4 border-t border-slate-100">
            <button type="button" onClick={onClose} className="mr-3 px-6 py-2.5 text-slate-500 hover:text-slate-800 hover:bg-slate-50 rounded-xl font-bold transition">Cancel</button>
            <button type="submit" className="px-8 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-xl font-bold shadow-lg hover:shadow-amber-500/30 transition flex items-center">
              <Briefcase size={18} className="mr-2" />Post Job
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

// ─── Stat Card ────────────────────────────────────────────────────────────────
const StatCard = ({ icon: Icon, label, value, color }) => (
  <motion.div whileHover={{ y: -5 }} className="glass-panel p-6 rounded-2xl border border-white/60 shadow-xl bg-white relative overflow-hidden group">
    <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${color} opacity-10 rounded-full blur-2xl -mr-6 -mt-6 group-hover:opacity-20 transition-opacity`} />
    <div className={`h-12 w-12 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center text-white mb-4 shadow-lg`}><Icon size={24} /></div>
    <h3 className="text-4xl font-serif font-bold text-slate-800 mb-1">{value}</h3>
    <p className="text-slate-500 font-bold text-xs uppercase tracking-wide">{label}</p>
  </motion.div>
);

// ─── Application Status Badge ─────────────────────────────────────────────────
const STATUS_OPTS = ['Applied', 'Shortlisted', 'Interviewing', 'Hired', 'Rejected'];
const STATUS_COLORS = {
  Applied: 'bg-blue-100 text-blue-700',
  Shortlisted: 'bg-amber-100 text-amber-700',
  Interviewing: 'bg-violet-100 text-violet-700',
  Hired: 'bg-emerald-100 text-emerald-700',
  Rejected: 'bg-red-100 text-red-600',
};

// ─── Candidate Hub ─────────────────────────────────────────────────────────────
const CandidateHub = ({ myJobs, jobApplications, onFetchApplicants, onUpdateStatus }) => {
  const [expandedJob, setExpandedJob] = useState(null);

  const handleExpand = (jobId) => {
    if (expandedJob === jobId) { setExpandedJob(null); return; }
    setExpandedJob(jobId);
    if (!jobApplications[jobId]) onFetchApplicants(jobId);
  };

  return (
    <div className="glass-panel rounded-3xl p-8 border border-white/60 bg-white shadow-xl mt-8">
      <h2 className="text-2xl font-serif font-bold text-slate-800 mb-6">Candidate Hub</h2>
      {myJobs.length === 0 ? (
        <div className="py-10 text-center border-2 border-dashed border-slate-100 rounded-2xl">
          <Users size={36} className="mx-auto text-slate-300 mb-3" />
          <p className="text-slate-500">Post a job to start reviewing candidates.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {myJobs.map(job => {
            const apps = jobApplications[job.id] || [];
            const isOpen = expandedJob === job.id;
            return (
              <div key={job.id} className="border border-slate-100 rounded-2xl overflow-hidden">
                <button onClick={() => handleExpand(job.id)} className="w-full flex items-center justify-between p-5 hover:bg-slate-50 transition text-left">
                  <div>
                    <h4 className="font-bold text-slate-800">{job.title}</h4>
                    <p className="text-sm text-slate-500">{job.company} • {job.location}</p>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className="text-xs font-bold bg-amber-50 text-amber-700 px-3 py-1.5 rounded-full border border-amber-100">
                      {isOpen ? (apps.length) : '?'} Applicants
                    </span>
                    <ChevronDown size={18} className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                  </div>
                </button>
                <AnimatePresence>
                  {isOpen && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                      <div className="border-t border-slate-100 divide-y divide-slate-50">
                        {apps.length === 0 ? (
                          <p className="p-5 text-sm text-slate-400 text-center">No applications yet.</p>
                        ) : apps.map(app => (
                          <div key={app.id} className="p-5 flex items-center justify-between hover:bg-slate-50/50 transition">
                            <div className="flex items-center space-x-3">
                              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center font-bold text-slate-600">
                                {app.student?.name?.charAt(0) || 'S'}
                              </div>
                              <div>
                                <h5 className="font-bold text-slate-800 text-sm">{app.student?.name || 'Student'}</h5>
                                <p className="text-xs text-slate-400">Applied {new Date(app.applied_date).toLocaleDateString()}</p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${STATUS_COLORS[app.status] || 'bg-slate-100 text-slate-600'}`}>
                                {app.status}
                              </span>
                              <select
                                value={app.status}
                                onChange={e => onUpdateStatus(app.id, e.target.value)}
                                className="text-xs bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-slate-700 outline-none focus:border-amber-500 transition font-medium"
                              >
                                {STATUS_OPTS.map(s => <option key={s}>{s}</option>)}
                              </select>
                            </div>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ─── Main Dashboard ───────────────────────────────────────────────────────────
const AlumniDashboard = () => {
  const dispatch = useDispatch();
  const { incomingRequests } = useSelector(state => state.mentorship);
  const { jobs, jobApplications } = useSelector(state => state.jobs);
  const { user } = useSelector(state => state.auth);
  const [isJobModalOpen, setIsJobModalOpen] = useState(false);

  useEffect(() => {
    dispatch(fetchIncomingRequests());
    dispatch(fetchJobs());
    dispatch(fetchMyPostedJobs());
    if (!user && localStorage.getItem('token')) dispatch(fetchProfile());
  }, [dispatch, user]);

  const handleCreateJob = (jobData) => {
    dispatch(createJob({ ...jobData, posted_by: user?.name || 'Alumni' }))
      .then(() => { setIsJobModalOpen(false); toast.success('Job Posted Successfully!'); })
      .catch(() => toast.error('Failed to post job'));
  };

  const handleDeleteJob = (jobId) => {
    if (confirm('Remove this job posting?')) {
      dispatch(deleteJob(jobId)).then(() => toast.success('Job removed'));
    }
  };

  const handleFetchApplicants = (jobId) => dispatch(fetchJobApplications(jobId));

  const handleUpdateStatus = (applicationId, status) => {
    dispatch(updateApplicationStatus({ applicationId, status }))
      .then(() => toast.success(`Status updated to "${status}"`))
      .catch(() => toast.error('Failed to update status'));
  };

  const pendingRequests = incomingRequests.filter(r => r.status === 'Pending');
  const acceptedRequests = incomingRequests.filter(r => r.status === 'Accepted');
  const submittedJobs = useSelector((state) => state.jobs.myPostedJobs);
  const myJobs = submittedJobs.length ? submittedJobs : jobs.filter(j => j.posted_by === user?.name);

  return (
    <div>
      <PostJobModal isOpen={isJobModalOpen} onClose={() => setIsJobModalOpen(false)} onSubmit={handleCreateJob} />

      {/* Header */}
      <div className="mb-10">
        <span className="text-amber-600 font-bold uppercase tracking-widest text-xs mb-2 block">Welcome Back</span>
        <h1 className="text-3xl md:text-5xl font-serif font-bold text-slate-900">{user?.name || 'Alumni'}</h1>
        <p className="text-slate-500 mt-2 text-base max-w-2xl">Manage your mentorships, review candidates, and connect with the next generation.</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        <StatCard icon={UserCheck} label="Students Mentored" value={acceptedRequests.length} color="from-amber-400 to-orange-500" />
        <StatCard icon={MessageCircle} label="Pending Requests" value={pendingRequests.length} color="from-rose-400 to-pink-600" />
        <StatCard icon={Briefcase} label="Jobs Posted" value={myJobs.length} color="from-emerald-400 to-teal-500" />
        <StatCard icon={Star} label="Reputation Score" value="4.9" color="from-violet-400 to-indigo-600" />
      </div>

      <div className="grid lg:grid-cols-3 gap-8 mb-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Pending Mentorship Requests */}
          <div className="glass-panel rounded-3xl p-8 border border-white/60 bg-white shadow-xl">
            <div className="flex justify-between items-center mb-8 pb-4 border-b border-slate-100">
              <h2 className="text-2xl font-serif font-bold text-slate-800">Pending Requests</h2>
              <Link to="/alumni/mentorship" className="text-amber-600 text-sm font-bold hover:text-amber-700 flex items-center bg-amber-50 px-4 py-2 rounded-lg transition">
                Manage <ArrowRight size={16} className="ml-2" />
              </Link>
            </div>
            {pendingRequests.length === 0 ? (
              <div className="p-10 text-center bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                <MessageCircle size={32} className="mx-auto text-slate-300 mb-3" />
                <p className="text-slate-500 font-medium">No new requests pending.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {pendingRequests.slice(0, 3).map(req => (
                  <div key={req.id} className="p-5 bg-white border border-slate-100 rounded-2xl flex items-center justify-between shadow-sm hover:shadow-md transition">
                    <div className="flex items-center space-x-4">
                      <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold">
                        {req.student?.name?.charAt(0) || 'S'}
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-800">{req.student?.name || 'Student'}</h4>
                        <p className="text-sm text-slate-500 truncate max-w-xs">{req.message}</p>
                      </div>
                    </div>
                    <span className="flex items-center text-xs font-bold text-amber-700 bg-amber-50 px-3 py-1.5 rounded-full">
                      <Clock size={12} className="mr-1" /> Pending
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Active Mentorships */}
          <div className="glass-panel rounded-3xl p-8 border border-white/60 bg-white shadow-xl">
            <h2 className="text-2xl font-serif font-bold text-slate-800 mb-6">Active Mentorships</h2>
            {acceptedRequests.length === 0 ? (
              <div className="p-8 text-center bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                <p className="text-slate-500">You haven't accepted any mentees yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {acceptedRequests.map(req => (
                  <div key={req.id} className="p-5 bg-white border border-slate-100 rounded-2xl flex items-center space-x-4 shadow-sm hover:border-amber-200 transition">
                    <div className="h-12 w-12 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white font-bold text-lg shadow-md">
                      {req.student?.name?.charAt(0) || 'S'}
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800">{req.student?.name}</h4>
                      <button className="text-xs text-amber-600 hover:text-amber-700 font-bold flex items-center mt-1">
                        <MessageCircle size={12} className="mr-1" /> Message
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions + Posted Jobs */}
        <div className="space-y-8">
          <div className="glass-panel rounded-3xl p-8 border border-white/60 bg-white shadow-lg">
            <h2 className="text-xl font-serif font-bold text-slate-800 mb-6">Quick Actions</h2>
            <div className="space-y-4">
              <button onClick={() => setIsJobModalOpen(true)} className="w-full p-4 rounded-2xl border border-slate-200 hover:border-amber-500 hover:bg-amber-50 transition text-left flex items-center group bg-white">
                <div className="h-12 w-12 rounded-xl bg-amber-100 flex items-center justify-center mr-4 group-hover:scale-110 transition-transform text-amber-600">
                  <Briefcase size={22} />
                </div>
                <div>
                  <h4 className="font-bold text-slate-800">Post a Job</h4>
                  <p className="text-xs text-slate-500 mt-0.5">Hire from campus</p>
                </div>
              </button>
              <Link to="/alumni/mentorship" className="block w-full p-4 rounded-2xl border border-slate-200 hover:border-amber-500 hover:bg-amber-50 transition text-left flex items-center group bg-white">
                <div className="h-12 w-12 rounded-xl bg-orange-100 flex items-center justify-center mr-4 group-hover:scale-110 transition-transform text-orange-600">
                  <Users size={22} />
                </div>
                <div>
                  <h4 className="font-bold text-slate-800">Manage Mentorship</h4>
                  <p className="text-xs text-slate-500 mt-0.5">Review incoming requests</p>
                </div>
              </Link>
            </div>
          </div>

          {/* Posted Jobs manage */}
          <div className="glass-panel rounded-3xl p-8 border border-white/60 bg-white shadow-lg">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-xl font-serif font-bold text-slate-800">My Posted Jobs</h2>
              <button onClick={() => setIsJobModalOpen(true)} className="text-amber-600 text-xs font-bold hover:text-amber-700 bg-amber-50 px-3 py-1.5 rounded-lg transition">
                + Post New
              </button>
            </div>
            <div className="space-y-3">
              {myJobs.slice(0, 4).map(job => (
                <div key={job.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-transparent hover:border-amber-100 transition">
                  <div>
                    <h4 className="font-bold text-slate-800 text-sm">{job.title}</h4>
                    <p className="text-xs text-slate-500">{job.company}</p>
                    <span className={`inline-block mt-1 text-[10px] font-bold uppercase rounded-full px-2 py-0.5 ${job.approval_status === 'Approved' ? 'bg-emerald-100 text-emerald-700' : job.approval_status === 'Rejected' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'}`}>{job.approval_status || 'Pending'}</span>
                  </div>
                  <button onClick={() => handleDeleteJob(job.id)} className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition">
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
              {myJobs.length === 0 && (
                <p className="text-sm text-slate-400 text-center py-4">No jobs posted yet.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Candidate Hub */}
      <CandidateHub
        myJobs={myJobs}
        jobApplications={jobApplications}
        onFetchApplicants={handleFetchApplicants}
        onUpdateStatus={handleUpdateStatus}
      />
    </div>
  );
};

export default AlumniDashboard;
