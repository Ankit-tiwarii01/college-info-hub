import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import API from '../services/api';
import {
  GraduationCap, Users, Briefcase, Star, Sparkles,
  Calendar, MapPin, Clock, Megaphone, Loader2, RefreshCw, X, Building2, ExternalLink, ArrowLeft
} from 'lucide-react';

/* ── Item Detail Modal ────────────────────────────────────────────────────── */
const DetailModal = ({ title, type, data, onClose }) => (
  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
    className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
    <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }}
      className="bg-white rounded-3xl p-8 max-w-xl w-full shadow-2xl relative overflow-hidden" onClick={e => e.stopPropagation()}>
      <div className="flex items-center justify-between mb-4">
        <button onClick={onClose} className="flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold text-xs rounded-xl border border-amber-100 transition">
          <ArrowLeft size={14} /> ← Back to {type === 'Notice' ? 'Notices' : type === 'Job' ? 'Jobs' : type === 'Event' ? 'Events' : 'List'}
        </button>
        <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100">
          <X size={18} />
        </button>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <span className="px-3 py-1 bg-amber-100 text-amber-800 font-bold text-xs rounded-full uppercase tracking-wider">
          {type}
        </span>
        {data.category && <span className="px-3 py-1 bg-slate-100 text-slate-600 font-medium text-xs rounded-full">{data.category}</span>}
        {data.type && <span className="px-3 py-1 bg-slate-100 text-slate-600 font-medium text-xs rounded-full">{data.type}</span>}
      </div>

      <h3 className="text-2xl font-serif font-bold text-slate-900 mb-3">{title}</h3>

      {type === 'Notice' && (
        <div className="space-y-3">
          <p className="text-xs text-slate-400">Published: {data.published_date ? new Date(data.published_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Recently'}</p>
          <p className="text-xs font-bold text-amber-700">Posted by: {data.posted_by || 'Campus Administration'}</p>
          <p className="text-xs text-slate-500 font-semibold">Target Audience: {data.target_audience || 'All Students & Faculty'}</p>
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-slate-700 leading-relaxed text-sm whitespace-pre-line mt-4">
            {data.content}
          </div>
        </div>
      )}

      {type === 'Job' && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-slate-700 font-bold">
            <Building2 size={18} className="text-amber-600" />
            <span>{data.company}</span>
          </div>
          <p className="text-xs font-bold text-amber-700">Posted by: {data.posted_by || 'Career Center'}</p>
          <div className="flex flex-wrap gap-4 text-xs text-slate-500 my-2">
            <span className="flex items-center gap-1"><MapPin size={14} />{data.location || 'Remote/Campus'}</span>
            <span className="flex items-center gap-1"><Briefcase size={14} />Experience: {data.experience || '0-2 Years'}</span>
            <span className="flex items-center gap-1"><Clock size={14} />Posted: {data.posted_date ? new Date(data.posted_date).toLocaleDateString() : 'Recently'}</span>
          </div>
          <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-line mt-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
            {data.description || 'No detailed description specified for this vacancy.'}
          </p>
        </div>
      )}

      {type === 'Event' && (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-4 text-xs text-slate-600 my-2">
            <span className="flex items-center gap-1 font-bold text-amber-700"><Calendar size={14} />{data.date ? String(data.date) : 'Upcoming'}</span>
            <span className="flex items-center gap-1"><Clock size={14} />{data.time || 'TBA'}</span>
            <span className="flex items-center gap-1"><MapPin size={14} />{data.location || 'Main Auditorium'}</span>
          </div>
          <p className="text-xs text-slate-500 font-medium">Organizer: {data.organizer || 'Campus InfoHub Committee'}</p>
          <p className="text-xs font-bold text-amber-700">Posted by: {data.posted_by || 'Campus Administration'}</p>
          <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-line mt-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
            {data.description || 'Join us for this exciting campus event! Details will be updated continuously.'}
          </p>
        </div>
      )}

      <div className="mt-8 flex justify-end">
        <button onClick={onClose} className="px-6 py-2.5 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition">
          Close
        </button>
      </div>
    </motion.div>
  </motion.div>
);

/* ── Section Tabs ─────────────────────────────────────────────────────────── */
const tabs = [
  { id: 'notices', label: 'Notices', icon: Megaphone },
  { id: 'events', label: 'Campus Events', icon: Calendar },
  { id: 'jobs', label: 'Job Opportunities', icon: Briefcase },
  { id: 'alumni', label: 'Alumni Directory', icon: GraduationCap },
];

/* ── Landing Page Main Component ──────────────────────────────────────────── */
const LandingPage = () => {
  const { user } = useSelector(s => s.auth);
  const [activeTab, setActiveTab] = useState('notices');
  const [eventFilter, setEventFilter] = useState('All');
  const [noticeCourseFilter, setNoticeCourseFilter] = useState('All Courses');
  const [alumniCourseFilter, setAlumniCourseFilter] = useState('All Courses');
  const [stats, setStats] = useState(null);
  
  const [notices, setNotices] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [events, setEvents] = useState([]);
  const [alumni, setAlumni] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [errorState, setErrorState] = useState(false);
  const [activeDetail, setActiveDetail] = useState(null);

  const fetchPublicData = () => {
    setLoading(true);
    setErrorState(false);

    Promise.allSettled([
      API.get('/public/stats'),
      API.get('/public/notices?limit=6'),
      API.get('/public/events?limit=6'),
      API.get('/public/jobs?limit=6'),
      API.get('/api/alumni/public?limit=12'),
    ]).then(([s, n, e, j, a]) => {
      if (s.status === 'fulfilled') setStats(s.value.data);
      if (n.status === 'fulfilled') setNotices(n.value.data);
      if (e.status === 'fulfilled') setEvents(e.value.data);
      if (j.status === 'fulfilled') setJobs(j.value.data);
      if (a.status === 'fulfilled') setAlumni(a.value.data);

      if (n.status === 'rejected' && j.status === 'rejected' && e.status === 'rejected') {
        setErrorState(true);
      }
    }).catch(() => {
      setErrorState(true);
    }).finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchPublicData();
  }, []);

  const EmptyState = ({ msg }) => (
    <div className="text-center py-16 bg-white rounded-3xl border border-slate-100 shadow-sm">
      <Sparkles size={36} className="mx-auto text-amber-400 mb-3" />
      <p className="text-slate-600 font-bold">{msg}</p>
      <p className="text-xs text-slate-400 mt-1">Check back later for updates!</p>
    </div>
  );

  const ErrorUI = () => (
    <div className="text-center py-16 bg-red-50/50 rounded-3xl border border-red-100 p-8 max-w-md mx-auto">
      <p className="text-red-600 font-bold mb-2">Unable to load campus information</p>
      <p className="text-xs text-slate-500 mb-6">Please check your network connection or backend server status.</p>
      <button
        onClick={fetchPublicData}
        className="inline-flex items-center gap-2 px-6 py-2.5 bg-amber-600 text-white rounded-xl font-bold hover:bg-amber-700 transition shadow-md"
      >
        <RefreshCw size={16} /> Retry Loading
      </button>
    </div>
  );

  const SkeletonCards = () => (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
      {[1, 2, 3, 4, 5, 6].map(i => (
        <div key={i} className="h-48 bg-slate-200/60 rounded-3xl"></div>
      ))}
    </div>
  );

  const renderContent = () => {
    if (loading) return <SkeletonCards />;
    if (errorState) return <ErrorUI />;

    switch (activeTab) {
      case 'notices':
        if (!notices.length) return <EmptyState msg="No active campus notices at this time." />;

        const filteredNotices = notices.filter(n => {
          if (noticeCourseFilter === 'All Courses') return true;
          const tc = n.target_course || 'All Courses';
          return tc === noticeCourseFilter || tc === 'All Courses' || tc === 'All';
        });

        return (
          <div>
            {/* Sub-navigation Course Filter Tabs for Notices */}
            <div className="flex flex-col sm:flex-row items-center justify-between mb-8 p-4 bg-white rounded-2xl border border-slate-100 shadow-sm gap-4">
              <div className="flex items-center gap-2">
                <Megaphone className="text-amber-500" size={20} />
                <h3 className="font-serif font-bold text-slate-800 text-lg">Official Notices</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {['All Courses', 'MCA', 'MBA', 'MTech'].map(crs => (
                  <button
                    key={crs}
                    onClick={() => setNoticeCourseFilter(crs)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                      noticeCourseFilter === crs
                        ? 'bg-amber-500 text-white shadow-md'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {crs}
                  </button>
                ))}
              </div>
            </div>

            {!filteredNotices.length ? (
              <EmptyState msg={`No notices found for ${noticeCourseFilter}.`} />
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredNotices.map(n => (
                  <motion.div key={n.id} whileHover={{ y: -5 }} className="p-6 bg-white rounded-3xl border border-slate-100 hover:border-amber-300 hover:shadow-xl transition-all flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start gap-2 mb-3">
                        <div className="flex flex-wrap gap-1.5">
                          <span className="px-3 py-1 bg-amber-100 text-amber-800 font-bold text-[11px] rounded-full uppercase tracking-wider">{n.category || 'Notice'}</span>
                          <span className="px-2.5 py-1 bg-slate-100 text-slate-700 font-bold text-[11px] rounded-full">{n.target_course || 'All Courses'}</span>
                        </div>
                        <span className="text-[11px] text-slate-400">{n.published_date ? new Date(n.published_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : 'Recent'}</span>
                      </div>
                      <h3 className="text-lg font-serif font-bold text-slate-900 mb-2 line-clamp-2">{n.title}</h3>
                      <p className="text-xs text-slate-500 line-clamp-3 leading-relaxed mb-4">{n.content}</p>
                    </div>
                    <div className="pt-4 border-t border-slate-50 flex justify-between items-center text-xs">
                      <span className="text-amber-800 font-bold truncate max-w-[150px]">Posted by: {n.posted_by || 'Administration'}</span>
                      <button onClick={() => setActiveDetail({ type: 'Notice', title: n.title, data: n })} className="font-bold text-amber-600 hover:text-amber-700 hover:underline">
                        View Details &rarr;
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        );

      case 'events':
        if (!events.length) return <EmptyState msg="No campus events currently scheduled." />;
        
        const filteredEvents = events.filter(e => {
          if (eventFilter === 'All') return true;
          return e.status === eventFilter;
        });

        return (
          <div>
            {/* Sub-navigation Filter Tabs for Events */}
            <div className="flex flex-col sm:flex-row items-center justify-between mb-8 p-4 bg-white rounded-2xl border border-slate-100 shadow-sm gap-4">
              <div className="flex items-center gap-2">
                <Calendar className="text-amber-500" size={20} />
                <h3 className="font-serif font-bold text-slate-800 text-lg">Campus Events</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {['All', 'Upcoming', 'Ongoing', 'Completed'].map(filterOpt => (
                  <button
                    key={filterOpt}
                    onClick={() => setEventFilter(filterOpt)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                      eventFilter === filterOpt
                        ? 'bg-amber-500 text-white shadow-md'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {filterOpt}
                  </button>
                ))}
              </div>
            </div>

            {!filteredEvents.length ? (
              <EmptyState msg={`No ${eventFilter !== 'All' ? eventFilter.toLowerCase() : ''} campus events found.`} />
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredEvents.map(e => {
                  let statusBadgeClass = "bg-amber-100 text-amber-800 border-amber-200";
                  if (e.status === "Ongoing") {
                    statusBadgeClass = "bg-emerald-100 text-emerald-800 border-emerald-300 font-extrabold";
                  } else if (e.status === "Completed") {
                    statusBadgeClass = "bg-slate-100 text-slate-600 border-slate-200";
                  }

                  return (
                    <motion.div key={e.id} whileHover={{ y: -5 }} className="p-6 bg-white rounded-3xl border border-slate-100 hover:border-amber-300 hover:shadow-xl transition-all flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-start gap-2 mb-3">
                          <span className="px-3 py-1 bg-violet-100 text-violet-800 font-bold text-[11px] rounded-full uppercase tracking-wider">{e.type || 'Career'}</span>
                          <span className={`px-3 py-1 rounded-full text-[11px] font-bold border ${statusBadgeClass}`}>
                            {e.status === "Ongoing" && "🟢 "}
                            {e.status}
                          </span>
                        </div>

                        <h3 className="text-lg font-serif font-bold text-slate-900 mb-2">{e.title}</h3>
                        
                        <div className="text-xs text-slate-600 space-y-1.5 mb-3 p-3 bg-slate-50 rounded-2xl border border-slate-100">
                          <p className="flex items-center gap-1.5 font-medium"><Calendar size={14} className="text-amber-600" /> <span>📅 <strong>{e.date ? new Date(e.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'TBA'}</strong></span></p>
                          <p className="flex items-center gap-1.5 font-medium"><Clock size={14} className="text-amber-600" /> <span>🕑 <strong>{e.time || 'TBA'}</strong></span></p>
                          <p className="flex items-center gap-1.5 font-medium"><MapPin size={14} className="text-amber-600" /> <span>📍 <strong>{e.location || 'TBA'}</strong></span></p>
                        </div>

                        <div className="text-[11px] text-slate-500 space-y-0.5 mb-3">
                          <p><strong>Organizer:</strong> {e.organizer || 'Campus InfoHub Committee'}</p>
                          <p><strong>Posted by:</strong> {e.posted_by || 'Campus InfoHub Committee'}</p>
                        </div>

                        <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed mb-3">{e.description}</p>
                      </div>

                      <div className="pt-3 border-t border-slate-50 flex justify-between items-center text-xs">
                        <span className="text-amber-800 font-bold">{e.status}</span>
                        <button onClick={() => setActiveDetail({ type: 'Event', title: e.title, data: e })} className="font-bold text-amber-600 hover:text-amber-700 hover:underline">
                          View Details &rarr;
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        );

      case 'jobs':
        if (!jobs.length) return <EmptyState msg="No job opportunities posted right now." />;
        return (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {jobs.map(j => (
              <motion.div key={j.id} whileHover={{ y: -5 }} className="p-6 bg-white rounded-3xl border border-slate-100 hover:border-amber-300 hover:shadow-xl transition-all flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start gap-2 mb-3">
                    <span className="px-3 py-1 bg-emerald-100 text-emerald-800 font-bold text-[11px] rounded-full uppercase tracking-wider">{j.type || 'Full Time'}</span>
                    <span className="text-[11px] text-slate-400">{j.posted_date ? new Date(j.posted_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : 'Recent'}</span>
                  </div>
                  <h3 className="text-lg font-serif font-bold text-slate-900 mb-1">{j.title}</h3>
                  <p className="text-xs font-bold text-amber-600 mb-3 flex items-center gap-1.5"><Building2 size={14} />{j.company}</p>
                  <div className="flex flex-wrap gap-2 text-[11px] text-slate-500 mb-4">
                    <span className="bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100">📍 {j.location || 'Remote'}</span>
                    <span className="bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100">💼 {j.experience || '0-2 Yrs'}</span>
                  </div>
                </div>
                <div className="pt-4 border-t border-slate-50 flex justify-between items-center text-xs">
                  <span className="text-amber-800 font-bold truncate max-w-[150px]">Posted by: {j.posted_by || 'Recruiter'}</span>
                  <button onClick={() => setActiveDetail({ type: 'Job', title: j.title, data: j })} className="px-4 py-1.5 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl transition shadow-md">
                    Apply / Details
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        );

      case 'alumni':
        const filteredAlumni = alumni.filter(a => {
          if (alumniCourseFilter === 'All Courses') return true;
          const courseVal = a.course_completed || a.course;
          return courseVal === alumniCourseFilter;
        });

        return (
          <div>
            {/* Header & Course Filter Control */}
            <div className="flex flex-col sm:flex-row items-center justify-between mb-8 p-4 bg-white rounded-2xl border border-slate-100 shadow-sm gap-4">
              <div className="flex flex-wrap items-center gap-2">
                <GraduationCap className="text-amber-500" size={20} />
                <h3 className="font-serif font-bold text-slate-800 text-lg">Alumni Directory</h3>
                <span className="text-xs font-semibold text-amber-800 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-100">
                  Showing {filteredAlumni.length} {alumniCourseFilter === 'All Courses' ? 'Alumni' : `${alumniCourseFilter} Alumni`}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Course:</label>
                  <select
                    value={alumniCourseFilter}
                    onChange={e => setAlumniCourseFilter(e.target.value)}
                    className="h-10 px-3.5 rounded-xl border border-slate-200 bg-slate-50/50 text-xs font-bold text-slate-700 focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none transition cursor-pointer"
                  >
                    <option value="All Courses">All Courses</option>
                    <option value="MCA">MCA</option>
                    <option value="MBA">MBA</option>
                    <option value="MTech">MTech</option>
                  </select>
                </div>

                <Link to="/alumni/register" className="px-5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 text-white font-bold text-xs rounded-xl shadow-md hover:from-amber-600 hover:to-amber-700 transition transform hover:-translate-y-0.5 whitespace-nowrap">
                  Register as Alumni
                </Link>
              </div>
            </div>

            {!filteredAlumni.length ? (
              <EmptyState msg={`No alumni found for ${alumniCourseFilter}.`} />
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                {filteredAlumni.map(a => {
                  const admYr = a.year_of_admission || (a.year_of_completion ? a.year_of_completion - 2 : 2024);
                  const compYr = a.year_of_completion || (admYr + 2);
                  const sessionStr = `${admYr}–${compYr}`;

                  return (
                    <motion.div key={a.id} whileHover={{ y: -5 }} className="p-6 bg-white rounded-3xl border border-slate-100 hover:border-amber-300 hover:shadow-xl transition-all text-center flex flex-col items-center">
                      {a.professional_picture ? (
                        <img src={a.professional_picture} alt={a.name} className="h-20 w-20 rounded-2xl object-cover shadow-md ring-2 ring-amber-200 mb-4" />
                      ) : (
                        <div className="h-20 w-20 bg-gradient-to-br from-amber-400 to-amber-600 text-white rounded-2xl flex items-center justify-center font-bold text-2xl shadow-md mb-4 font-serif">
                          {a.name.charAt(0)}
                        </div>
                      )}
                      <h4 className="font-serif font-bold text-slate-900 text-lg mb-1">{a.name}</h4>
                      <p className="text-xs font-bold text-amber-600 mb-1 uppercase tracking-wider">{a.course_completed || a.course} ({sessionStr})</p>
                      
                      {/* Current Company & Designation */}
                      <div className="my-3 p-3 bg-amber-50/60 rounded-2xl border border-amber-100/80 w-full text-center">
                        <p className="text-xs font-bold text-slate-800 flex items-center justify-center gap-1">
                          <Building2 size={13} className="text-amber-600 shrink-0" />
                          <span className="truncate">{a.organization || a.current_company || 'Tech Company'}</span>
                        </p>
                        <p className="text-[11px] font-semibold text-amber-800 mt-0.5">{a.designation || 'Alumnus Professional'}</p>
                        {a.previous_company && (
                          <p className="text-[10px] text-slate-500 font-medium mt-1 border-t border-amber-200/50 pt-1">
                            Prev: <span className="font-semibold text-slate-700">{a.previous_company}</span>
                          </p>
                        )}
                      </div>

                      {a.linkedin ? (
                        <a
                          href={a.linkedin.startsWith('http') ? a.linkedin : `https://${a.linkedin}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-auto w-full py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition border border-blue-100"
                        >
                          LinkedIn &rarr;
                        </a>
                      ) : (
                        <span className="mt-auto text-xs text-slate-400 font-medium">No LinkedIn profile</span>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 text-slate-800 transition-colors duration-500">
      
      {/* Hero Section */}
      <section className="relative pt-20 pb-28 overflow-hidden bg-slate-900 text-white">
        <div className="absolute inset-0 -z-0 opacity-40">
          <img src="https://images.unsplash.com/photo-1523050854058-8df90110c9f1?q=80&w=2070&auto=format&fit=crop" alt="Campus" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-slate-900/80 via-slate-900/90 to-slate-900"></div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <h1 className="text-4xl md:text-6xl font-serif font-extrabold mb-6 tracking-tight leading-tight">
            Campus Information & <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500">Alumni Network Portal</span>
          </h1>
          <p className="max-w-2xl mx-auto text-lg md:text-xl text-slate-300 mb-10 leading-relaxed font-light">
            Stay updated with campus notices, explore career opportunities, attend events, and connect with university alumni.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link to="/alumni/register" className="px-8 py-4 text-base font-bold rounded-2xl text-slate-900 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 shadow-xl shadow-amber-500/25 transition">
              Sign Up / Get Started
            </Link>
          </div>
        </div>
      </section>

      {/* Main Public Section */}
      <section id="public-sections" className="py-12 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full flex-1">
        
        {/* Section Header & Tabs */}
        <div className="text-center mb-10">
          <h2 className="text-3xl md:text-4xl font-serif font-bold text-slate-900 mb-3">Public Campus Information</h2>
          <p className="text-slate-500 text-sm max-w-xl mx-auto">Browse live notices, upcoming events, active jobs, and public alumni directory.</p>
        </div>

        <div className="flex flex-wrap justify-center gap-3 mb-10">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-bold text-sm transition-all ${
                activeTab === id
                  ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-lg shadow-amber-500/20'
                  : 'bg-white text-slate-600 border border-slate-200 hover:border-amber-300 hover:text-amber-700'
              }`}
            >
              <Icon size={18} />
              <span>{label}</span>
            </button>
          ))}
        </div>

        {/* Dynamic Content */}
        {renderContent()}

      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-10 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-sm text-slate-400 mb-2">© {new Date().getFullYear()} Campus InfoHub — Community Network.</p>
          <div className="flex justify-center gap-6 text-xs text-slate-500 mt-4">
            <Link to="/alumni/register" className="hover:text-amber-400 transition">Alumni Registration</Link>
          </div>
        </div>
      </footer>

      {/* Detail Modal */}
      <AnimatePresence>
        {activeDetail && (
          <DetailModal
            title={activeDetail.title}
            type={activeDetail.type}
            data={activeDetail.data}
            onClose={() => setActiveDetail(null)}
          />
        )}
      </AnimatePresence>

    </div>
  );
};

export default LandingPage;