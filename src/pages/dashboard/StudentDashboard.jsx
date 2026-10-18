import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  BookOpen, TrendingUp, Bell, Search, Briefcase, ExternalLink,
  MessageCircle, ThumbsUp, CheckCircle2, Clock, XCircle, AlertCircle
} from 'lucide-react';
import { fetchJobs, fetchMyApplications } from '../../features/jobs/jobsSlice';
import { fetchPosts } from '../../features/posts/postsSlice';

const STATUS_CONFIG = {
  Applied:      { color: 'bg-blue-100 text-blue-700',    icon: Clock },
  Shortlisted:  { color: 'bg-amber-100 text-amber-700', icon: AlertCircle },
  Interviewing: { color: 'bg-violet-100 text-violet-700', icon: TrendingUp },
  Hired:        { color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle2 },
  Rejected:     { color: 'bg-red-100 text-red-600',        icon: XCircle },
};

const StatCard = ({ icon: Icon, label, value, color, delay }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, delay }}
    whileHover={{ y: -5 }}
    className="glass-panel p-6 rounded-2xl relative overflow-hidden group border border-white/60 shadow-xl shadow-amber-900/5 bg-white"
  >
    <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${color} opacity-5 group-hover:opacity-10 transition-opacity rounded-full blur-2xl -mr-8 -mt-8`} />
    <div className="relative z-10">
      <div className={`h-12 w-12 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center text-white mb-4 shadow-lg opacity-90 group-hover:scale-110 transition-transform duration-300`}>
        <Icon size={24} />
      </div>
      <h3 className="text-3xl font-serif font-bold text-slate-800 mb-1">{value}</h3>
      <p className="text-slate-500 font-medium text-sm tracking-wide">{label}</p>
    </div>
  </motion.div>
);

const ApplicationTrackerCard = ({ application }) => {
  const cfg = STATUS_CONFIG[application.status] || STATUS_CONFIG.Applied;
  const StatusIcon = cfg.icon;
  return (
    <motion.div
      whileHover={{ x: 4 }}
      className="flex items-center justify-between p-4 rounded-xl bg-white border border-slate-100 hover:border-amber-200 transition shadow-sm"
    >
      <div className="flex items-center space-x-4">
        <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-lg">
          {application.job?.company?.charAt(0) || 'J'}
        </div>
        <div>
          <h4 className="font-bold text-slate-800 text-sm">{application.job?.title || 'Job Title'}</h4>
          <p className="text-xs text-slate-500">{application.job?.company} • {new Date(application.applied_date).toLocaleDateString()}</p>
        </div>
      </div>
      <span className={`flex items-center space-x-1.5 text-xs font-bold px-3 py-1.5 rounded-full ${cfg.color}`}>
        <StatusIcon size={12} />
        <span>{application.status}</span>
      </span>
    </motion.div>
  );
};

const StudentDashboard = () => {
  const dispatch = useDispatch();
  const { jobs, myApplications } = useSelector(state => state.jobs);
  const { posts } = useSelector(state => state.posts);
  const { user } = useSelector(state => state.auth);

  useEffect(() => {
    dispatch(fetchJobs());
    dispatch(fetchPosts());
    dispatch(fetchMyApplications());
  }, [dispatch]);

  const recentJobs = jobs.slice(0, 3);
  const recentPosts = posts.slice(0, 3);
  const activeApplications = myApplications.filter(a => !['Rejected'].includes(a.status));

  return (
    <div>
      {/* Header */}
      <div className="mb-10 flex justify-between items-end">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <h1 className="text-3xl md:text-5xl font-serif font-bold text-slate-900 tracking-tight">
            Welcome, {user?.name?.split(' ')[0] || 'Student'}
          </h1>
          <p className="text-slate-500 mt-2 text-base md:text-lg font-light">Your academic dashboard is ready.</p>
        </motion.div>
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="text-right hidden sm:block">
          <p className="text-xs text-slate-400 mt-2 font-serif italic">
            {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </motion.div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        <StatCard icon={Briefcase} label="Jobs Available" value={jobs.length} color="from-blue-500 to-blue-600" delay={0.1} />
        <StatCard icon={BookOpen} label="Applications Sent" value={myApplications.length} color="from-amber-500 to-amber-600" delay={0.2} />
        <StatCard icon={CheckCircle2} label="Active Interviews" value={myApplications.filter(a => a.status === 'Interviewing').length} color="from-emerald-500 to-emerald-600" delay={0.3} />
        <StatCard icon={MessageCircle} label="Community Posts" value={posts.length} color="from-violet-500 to-violet-600" delay={0.4} />
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Left: Application Tracker + Community Feed */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
          className="lg:col-span-2 space-y-8"
        >
          {/* Application Tracker */}
          <div className="glass-panel rounded-2xl p-8 border border-white/60 shadow-sm bg-white">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-serif font-bold text-slate-800">Application Tracker</h2>
              <Link to="/student/jobs" className="text-amber-700 text-sm font-bold hover:text-amber-800 flex items-center transition">
                Find Jobs <ExternalLink size={14} className="ml-1" />
              </Link>
            </div>
            {myApplications.length === 0 ? (
              <div className="text-center py-10 border-2 border-dashed border-slate-100 rounded-2xl">
                <Briefcase size={36} className="mx-auto text-slate-300 mb-3" />
                <p className="text-slate-500 font-medium">No applications yet.</p>
                <Link to="/student/jobs" className="text-amber-600 text-sm font-bold mt-2 block hover:underline">Browse open positions</Link>
              </div>
            ) : (
              <div className="space-y-3">
                {myApplications.slice(0, 5).map(app => (
                  <ApplicationTrackerCard key={app.id} application={app} />
                ))}
                {myApplications.length > 5 && (
                  <p className="text-center text-sm text-slate-400 pt-2 font-medium">
                    +{myApplications.length - 5} more applications
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Community Feed Preview */}
          <div className="glass-panel rounded-2xl p-8 border border-white/60 shadow-sm bg-white">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-serif font-bold text-slate-800">Community Highlights</h2>
              <Link to="/student/feed" className="text-amber-700 text-sm font-bold hover:text-amber-800 flex items-center transition">
                View Feed <ExternalLink size={16} className="ml-1" />
              </Link>
            </div>
            <div className="space-y-4">
              {recentPosts.map(post => (
                <div key={post.id} className="p-5 rounded-2xl bg-white/50 border border-slate-100 hover:border-amber-200 hover:shadow-md transition duration-300">
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="h-9 w-9 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center font-bold text-sm text-slate-600 shadow-sm">
                      {(post.user?.name || post.approved_by || 'Admin').charAt(0)}
                    </div>
                    <div>
                      <span className="font-bold text-slate-800 text-sm block">{post.user?.name || post.approved_by || 'Admin'}</span>
                      <span className="text-xs text-slate-400">{new Date(post.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <p className="text-slate-600 text-sm line-clamp-2 leading-relaxed mb-3">{post.content}</p>
                  <div className="flex items-center space-x-4 text-xs font-medium text-slate-500 border-t border-slate-100 pt-3">
                    <span className="flex items-center hover:text-amber-600 transition cursor-pointer"><ThumbsUp size={13} className="mr-1" /> {post.likes_count || 0} Likes</span>
                    <span className="flex items-center hover:text-amber-600 transition cursor-pointer"><MessageCircle size={13} className="mr-1" /> {post.comments?.length || 0} Comments</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Right: Recommended Jobs */}
        <motion.div
          initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.6 }}
          className="space-y-8"
        >
          <div className="glass-panel rounded-2xl p-8 sticky top-24 border border-white/60 shadow-sm bg-white">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-serif font-bold text-slate-800">Recommended Jobs</h2>
              <Link to="/student/jobs" className="text-slate-400 hover:text-amber-600 transition p-2 rounded-lg hover:bg-amber-50">
                <Search size={18} />
              </Link>
            </div>
            <div className="space-y-3">
              {recentJobs.map(job => (
                <div key={job.id} className="p-4 rounded-xl bg-slate-50/50 hover:bg-white hover:shadow-md transition cursor-pointer border border-transparent hover:border-amber-100 group">
                  <h4 className="font-bold text-slate-800 text-sm group-hover:text-amber-700 transition">{job.title}</h4>
                  <p className="text-xs text-slate-500 mt-1">{job.company}</p>
                  <span className="mt-2 inline-block bg-white border border-slate-200 text-slate-600 text-[10px] font-bold px-2.5 py-1 rounded-full">{job.type}</span>
                </div>
              ))}
            </div>
            <Link to="/student/jobs" className="block mt-6 text-center text-sm font-bold text-amber-700 hover:text-amber-800 transition">
              View all opportunities →
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default StudentDashboard;
