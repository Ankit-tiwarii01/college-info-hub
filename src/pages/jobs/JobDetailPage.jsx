import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import API from '../../services/api';
import { Loader2, ArrowLeft, MapPin, Briefcase, DollarSign, Calendar, ExternalLink, Building, CheckCircle, Send, X, FileText } from 'lucide-react';
import { toast } from 'sonner';

const JobDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const userRole = useSelector((state) => state.auth.user?.role?.toLowerCase());
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hasApplied, setHasApplied] = useState(false);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [coverLetter, setCoverLetter] = useState('');
  const [resumeUrl, setResumeUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchJobData = async () => {
      try {
        const response = await API.get(`/jobs/${id}`);
        setJob(response.data);

        // Check if student has already applied
        try {
          const myApps = await API.get('/jobs/my/applications');
          const applied = myApps.data.some(app => app.job_id === Number(id));
          setHasApplied(applied);
        } catch (appErr) {
          // Non-student or unauthenticated
        }
      } catch (err) {
        setError('Job not found or deleted.');
      } finally {
        setLoading(false);
      }
    };
    fetchJobData();
  }, [id]);

  const handleApplySubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await API.post(`/jobs/${id}/apply`, {
        cover_letter: coverLetter,
        resume_url: resumeUrl
      });
      setHasApplied(true);
      setShowApplyModal(false);
      toast.success('Application submitted successfully!');
    } catch (err) {
      console.error(err);
      const msg = err.response?.data?.detail || 'Failed to submit application.';
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-amber-500" size={40} /></div>;
  if (error) return <div className="text-center p-10 text-red-500 font-bold">{error} <button onClick={() => navigate(-1)} className="ml-2 underline">Go Back</button></div>;
  if (!job) return null;

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
        <button 
            onClick={() => navigate(-1)}
            className="flex items-center text-slate-500 hover:text-slate-800 transition mb-6 font-medium"
        >
            <ArrowLeft size={18} className="mr-1" /> Back to Jobs
        </button>

        <div className="glass-panel rounded-3xl p-8 md:p-10 border border-white/60 shadow-2xl shadow-amber-900/10 bg-white relative overflow-hidden">
            {/* Header */}
            <div className="flex flex-col md:flex-row gap-6 mb-8 border-b border-slate-100 pb-8">
                <div className={`h-24 w-24 rounded-2xl ${job.logo_color || 'bg-slate-800'} flex items-center justify-center text-white font-bold text-3xl shadow-lg shrink-0`}>
                    {job.company.charAt(0)}
                </div>
                <div className="flex-1">
                    <h1 className="text-3xl font-serif font-bold text-slate-800 mb-2">{job.title}</h1>
                    <div className="flex flex-wrap items-center gap-4 text-slate-600">
                        <span className="flex items-center font-bold text-lg"><Building size={18} className="mr-1.5 text-amber-600"/> {job.company}</span>
                        <span className="flex items-center text-sm bg-slate-50 px-3 py-1 rounded-full"><MapPin size={14} className="mr-1.5"/> {job.location}</span>
                        <span className="flex items-center text-sm bg-slate-50 px-3 py-1 rounded-full"><Briefcase size={14} className="mr-1.5"/> {job.type}</span>
                    </div>
                </div>
                <div className="md:text-right flex flex-col items-start md:items-end justify-center">
                     <p className="text-2xl font-bold text-slate-800 flex items-center mb-1"><DollarSign size={20} className="text-green-600 mr-1"/> {job.salary}</p>
                     <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Estimated Salary</p>
                </div>
            </div>

            <div className="grid md:grid-cols-3 gap-10">
                <div className="md:col-span-2 space-y-8">
                    <section>
                        <h3 className="text-lg font-bold text-slate-800 mb-3 font-serif">About the Role</h3>
                        <p className="text-slate-600 leading-relaxed whitespace-pre-line">{job.description}</p>
                    </section>

                    <section>
                         <h3 className="text-lg font-bold text-slate-800 mb-3 font-serif">Key Requirements</h3>
                         <div className="flex flex-wrap gap-2">
                            {job.requirements?.map((req, i) => (
                                <span key={i} className="px-3 py-1.5 rounded-lg bg-amber-50 text-amber-800 text-sm font-bold border border-amber-100">{req}</span>
                            ))}
                         </div>
                    </section>
                </div>

                <div className="space-y-6">
                    <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
                        <h3 className="font-bold text-slate-800 mb-4">Job Details</h3>
                        <div className="space-y-3 text-sm text-slate-600">
                             <div className="flex justify-between">
                                 <span>Posted On</span>
                                 <span className="font-bold">{new Date(job.posted_date).toLocaleDateString()}</span>
                             </div>
                             <div className="flex justify-between">
                                 <span>Expiration</span>
                                 <span className="font-bold">Rolling Basis</span>
                             </div>
                        </div>
                    </div>

                    {userRole === 'alumni' || userRole === 'faculty' ? (
                        <div className="w-full py-3.5 px-6 rounded-xl bg-amber-50 text-amber-800 border border-amber-200 font-bold text-sm text-center shadow-sm">
                            Alumni / Poster Account
                        </div>
                    ) : hasApplied ? (
                        <div className="w-full py-4 px-6 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-lg flex items-center justify-center shadow-sm">
                            <CheckCircle size={22} className="mr-2 text-emerald-600" /> Application Submitted
                        </div>
                    ) : (
                        <button 
                            onClick={() => setShowApplyModal(true)}
                            className="w-full flex items-center justify-center py-4 px-6 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold text-lg shadow-lg shadow-amber-500/30 transition-all transform hover:-translate-y-0.5 cursor-pointer"
                        >
                            Apply Now <Send size={20} className="ml-2" />
                        </button>
                    )}
                    
                    {job.apply_link && (
                        <a 
                            href={job.apply_link} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="w-full flex items-center justify-center py-2.5 px-4 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold text-sm transition-all text-center"
                        >
                            Visit Official Career Portal <ExternalLink size={14} className="ml-1.5" />
                        </a>
                    )}
                </div>
            </div>
        </div>

        {/* Application Modal */}
        {showApplyModal && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                <div className="bg-white rounded-3xl p-8 w-full max-w-lg shadow-2xl border border-slate-100">
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h2 className="text-2xl font-serif font-bold text-slate-800">Apply for {job.title}</h2>
                            <p className="text-slate-500 text-sm font-medium">{job.company}</p>
                        </div>
                        <button onClick={() => setShowApplyModal(false)} className="text-slate-400 hover:text-slate-600 p-2 rounded-full hover:bg-slate-100 transition">
                            <X size={20} />
                        </button>
                    </div>

                    <form onSubmit={handleApplySubmit} className="space-y-5">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                                Cover Letter / Note (Optional)
                            </label>
                            <textarea 
                                rows="4" 
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-slate-800 text-sm font-medium focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition resize-none"
                                placeholder="Why are you a great fit for this role? Highlight relevant skills or projects..."
                                value={coverLetter}
                                onChange={(e) => setCoverLetter(e.target.value)}
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                                Resume Link / Portfolio URL (Optional)
                            </label>
                            <div className="relative">
                                <FileText className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <input 
                                    type="text"
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-slate-800 text-sm font-medium focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition"
                                    placeholder="https://drive.google.com/your-resume.pdf"
                                    value={resumeUrl}
                                    onChange={(e) => setResumeUrl(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100">
                            <button 
                                type="button" 
                                onClick={() => setShowApplyModal(false)}
                                className="px-5 py-2.5 rounded-xl font-bold text-slate-500 hover:bg-slate-50 transition"
                            >
                                Cancel
                            </button>
                            <button 
                                type="button" 
                                onClick={handleApplySubmit}
                                disabled={isSubmitting}
                                className="px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-black text-white font-bold transition shadow-lg shadow-slate-900/20 flex items-center space-x-2 cursor-pointer"
                            >
                                {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
                                <span>Submit Application</span>
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        )}
    </div>
  );
};

export default JobDetailPage;
