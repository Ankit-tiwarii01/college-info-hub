import React, { useState, useMemo, useEffect } from 'react';
import API from '../../services/api';
import { 
    Calendar, 
    MapPin, 
    Users, 
    Clock, 
    CheckCircle,
    Star,
    X,
    Search,
    Grid,
    List,
    ArrowRight,
    Download,
    XCircle
} from 'lucide-react';
import { useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import SkeletonCard from '../../components/SkeletonCard';
import Breadcrumbs from '../../components/Breadcrumbs';

// ── ICS Calendar Helpers ─────────────────────────────────────────────────────
const formatICSDate = (d, time) => {
  const dt = new Date(`${d}T${time || '00:00'}`);
  return dt.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
};

const downloadICS = (event) => {
  const content = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'BEGIN:VEVENT',
    `DTSTART:${formatICSDate(event.date, event.time)}`,
    `DTEND:${formatICSDate(event.date, event.time)}`,
    `SUMMARY:${event.title}`,
    `LOCATION:${event.location || ''}`,
    `DESCRIPTION:${(event.description || '').replace(/\n/g, '\\n')}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
  const blob = new Blob([content], { type: 'text/calendar' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${event.title.replace(/\s+/g, '_')}.ics`;
  a.click();
  URL.revokeObjectURL(url);
};

// ── Component ────────────────────────────────────────────────────────────────
const EventsPage = () => {
    const { userRole } = useSelector((state) => state.auth);
    const [filter, setFilter] = useState('upcoming');
    const [viewMode, setViewMode] = useState('grid');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => { fetchEvents(); }, []);

    const fetchEvents = async () => {
        try {
            const res = await API.get('/events');
            setEvents(res.data.map(evt => ({ ...evt, userRsvp: evt.user_rsvp || evt.userRsvp })));
        } catch (err) {
            console.error('Failed to fetch events', err);
        } finally {
            setLoading(false);
        }
    };

    const handleRsvp = async (eventId, status) => {
        try {
            setEvents(prev => prev.map(event => {
                if (event.id !== eventId) return event;
                const newStatus = event.userRsvp === status ? null : status;
                const countChange = !event.userRsvp && newStatus ? 1 : (event.userRsvp && !newStatus ? -1 : 0);
                const updated = { ...event, userRsvp: newStatus, attendees: event.attendees + countChange };
                if (selectedEvent?.id === eventId) setSelectedEvent(updated);
                return updated;
            }));
            await API.post(`/events/${eventId}/rsvp`, { status });
        } catch (err) {
            console.error('RSVP failed', err);
            fetchEvents();
        }
    };

    const isAlumni = userRole === 'alumni';

    const filteredEvents = useMemo(() => events.filter(event => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const eventDate = new Date(event.date);

        let matchesFilter = true;
        if (filter === 'upcoming') {
            matchesFilter = eventDate >= today;
        } else if (filter === 'past') {
            matchesFilter = eventDate < today;
        } else if (filter === 'my events') {
            matchesFilter = !!event.userRsvp;
        }

        const matchesSearch = event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            event.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (event.location && event.location.toLowerCase().includes(searchQuery.toLowerCase()));

        return matchesSearch && matchesFilter;
    }), [events, filter, searchQuery]);

    const getTypeColor = (type) => {
        switch (type) {
            case 'Academic': return 'bg-blue-100 text-blue-700 border-blue-200';
            case 'Social':   return 'bg-purple-100 text-purple-700 border-purple-200';
            case 'Career':   return 'bg-green-100 text-green-700 border-green-200';
            case 'Sports':   return 'bg-orange-100 text-orange-700 border-orange-200';
            default:         return 'bg-slate-100 text-slate-700 border-slate-200';
        }
    };

    if (loading) {
        return (
            <div className="max-w-7xl mx-auto">
                <div className="h-10 bg-slate-200 rounded-full w-64 mb-8 animate-pulse" />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} avatar lines={3} />)}
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto min-h-screen">
            <Breadcrumbs items={[{ label: 'Dashboard', path: isAlumni ? '/alumni/dashboard' : '/student/dashboard' }, { label: 'Campus Events' }]} />
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
                <div>
                    <h1 className="text-4xl font-serif font-bold text-slate-800">
                        {isAlumni ? 'Alumni Events' : 'Campus Events'}
                    </h1>
                    <p className="text-slate-500 mt-2 text-lg">Discover, connect, and participate in our vibrant community.</p>
                </div>
                <div className="flex items-center space-x-3 bg-white p-1.5 rounded-xl border border-slate-200 shadow-sm">
                    <button onClick={() => setViewMode('grid')} className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-amber-100 text-amber-700' : 'text-slate-400 hover:text-slate-600'}`}><Grid size={20} /></button>
                    <button onClick={() => setViewMode('list')} className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-amber-100 text-amber-700' : 'text-slate-400 hover:text-slate-600'}`}><List size={20} /></button>
                </div>
            </div>

            {/* Controls */}
            <div className="bg-white/70 backdrop-blur-xl rounded-2xl shadow-sm border border-slate-200 p-4 mb-8 flex flex-col md:flex-row gap-4 items-center justify-between sticky top-24 z-20">
                <div className="relative w-full md:w-96 group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-amber-500 transition-colors" size={20} />
                    <input type="text" placeholder="Search events…" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all font-medium" />
                </div>
                <div className="flex items-center space-x-2 w-full md:w-auto overflow-x-auto">
                    {['upcoming', 'past'].map((f) => (
                        <button key={f} onClick={() => setFilter(f)}
                            className={`px-5 py-2.5 rounded-xl font-bold text-sm whitespace-nowrap transition-all border ${filter === f ? 'bg-slate-800 text-white border-slate-800 shadow-lg' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                            <span className="capitalize">{f}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Cards */}
            <motion.div layout className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8' : 'space-y-4'}>
                <AnimatePresence>
                    {filteredEvents.length === 0 && (
                        <div className="col-span-3 text-center py-24 bg-white rounded-3xl border border-dashed border-slate-200">
                            <Calendar size={40} className="mx-auto text-slate-300 mb-3" />
                            <p className="text-slate-500 font-medium">No events found.</p>
                        </div>
                    )}
                    {filteredEvents.map((event) =>
                        viewMode === 'grid' ? (
                            <motion.div layout key={event.id} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} whileHover={{ y: -5 }}
                                onClick={() => setSelectedEvent(event)}
                                className="bg-white rounded-[2rem] overflow-hidden border border-slate-100 shadow-xl shadow-slate-200/40 cursor-pointer group flex flex-col h-full">
                                <div className="h-48 relative overflow-hidden bg-gradient-to-br from-amber-50 to-slate-100">
                                    <div className="absolute top-4 left-4 z-20 flex flex-col bg-white/95 backdrop-blur-md rounded-2xl text-center px-4 py-2 shadow-lg font-bold border border-white/50">
                                        <span className="text-xs text-amber-600 uppercase tracking-widest">{new Date(event.date).toLocaleDateString(undefined, { month: 'short' })}</span>
                                        <span className="text-2xl text-slate-800 leading-none">{new Date(event.date).getDate()}</span>
                                    </div>
                                    <div className={`absolute top-4 right-4 z-20 px-3 py-1 rounded-full text-xs font-bold border backdrop-blur-md ${getTypeColor(event.type)}`}>{event.type}</div>
                                </div>
                                <div className="p-6 flex-1 flex flex-col">
                                    <h3 className="text-xl font-bold text-slate-800 mb-3 group-hover:text-amber-600 transition-colors line-clamp-2">{event.title}</h3>
                                    <div className="space-y-2.5 mb-6">
                                        <div className="flex items-center text-slate-500 text-sm"><Clock size={16} className="mr-3 text-amber-500" /><span>{event.time}</span></div>
                                        <div className="flex items-center text-slate-500 text-sm"><MapPin size={16} className="mr-3 text-amber-500" /><span>{event.location}</span></div>
                                    </div>
                                    <div className="mt-auto flex items-center justify-between pt-4 border-t border-slate-100">
                                        <div className="flex items-center text-xs font-bold text-slate-500 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-100">
                                            <Users size={14} className="mr-1.5" /> {event.attendees} registered
                                        </div>
                                        {event.userRsvp && (
                                            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100">✓ RSVP'd</span>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        ) : (
                            <motion.div layout key={event.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                                onClick={() => setSelectedEvent(event)}
                                className="bg-white rounded-2xl border border-slate-200 p-4 hover:shadow-lg hover:border-amber-200 transition-all cursor-pointer flex items-center gap-6 group">
                                <div className="flex-shrink-0 w-16 h-16 rounded-2xl bg-amber-50 flex flex-col items-center justify-center border border-amber-100 shadow-sm">
                                    <span className="text-xs font-bold text-amber-600 uppercase">{new Date(event.date).toLocaleDateString(undefined, { month: 'short' })}</span>
                                    <span className="text-2xl font-serif font-bold text-slate-800">{new Date(event.date).getDate()}</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${getTypeColor(event.type)}`}>{event.type}</span>
                                    <h3 className="text-lg font-bold text-slate-800 mt-1 mb-1 truncate group-hover:text-amber-600 transition-colors">{event.title}</h3>
                                    <div className="flex items-center space-x-4 text-xs font-medium text-slate-400">
                                        <span className="flex items-center"><Clock size={12} className="mr-1" /> {event.time}</span>
                                        <span className="flex items-center"><MapPin size={12} className="mr-1" /> {event.location}</span>
                                    </div>
                                </div>
                                <ArrowRight size={20} className="text-slate-300 group-hover:text-amber-500 transition-colors flex-shrink-0" />
                            </motion.div>
                        )
                    )}
                </AnimatePresence>
            </motion.div>

            {/* Event Detail Modal */}
            <AnimatePresence>
                {selectedEvent && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            onClick={() => setSelectedEvent(null)}
                            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
                        <motion.div initial={{ opacity: 0, scale: 0.95, y: 30 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 30 }}
                            className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl relative z-10 overflow-hidden flex flex-col max-h-[90vh]">
                            
                            {/* Modal hero */}
                            <div className="h-48 bg-gradient-to-br from-amber-50 via-orange-50 to-slate-100 relative flex-shrink-0">
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <Calendar size={64} className="text-amber-200" />
                                </div>
                                <div className="absolute top-4 left-6 bg-white/90 backdrop-blur-sm rounded-2xl px-4 py-2 text-center shadow-lg">
                                    <p className="text-xs font-bold text-amber-600 uppercase">{new Date(selectedEvent.date).toLocaleDateString(undefined, { month: 'short' })}</p>
                                    <p className="text-3xl font-serif font-bold text-slate-800">{new Date(selectedEvent.date).getDate()}</p>
                                </div>
                                <button onClick={() => setSelectedEvent(null)} className="absolute top-4 right-4 p-2 bg-white/70 hover:bg-white text-slate-600 rounded-full backdrop-blur-md transition-colors shadow-sm">
                                    <X size={22} />
                                </button>
                            </div>

                            {/* Modal body */}
                            <div className="p-8 overflow-y-auto">
                                <div className={`inline-block px-3 py-1 rounded-full text-xs font-bold tracking-wider mb-3 border ${getTypeColor(selectedEvent.type)}`}>{selectedEvent.type}</div>
                                <h2 className="text-3xl font-serif font-bold text-slate-800 mb-2">{selectedEvent.title}</h2>
                                
                                <div className="flex flex-wrap gap-4 text-sm font-medium text-slate-500 mb-6">
                                    <span className="flex items-center"><Calendar size={15} className="mr-2 text-amber-500" />{new Date(selectedEvent.date).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</span>
                                    <span className="flex items-center"><Clock size={15} className="mr-2 text-amber-500" />{selectedEvent.time}</span>
                                    <span className="flex items-center"><MapPin size={15} className="mr-2 text-amber-500" />{selectedEvent.location}</span>
                                    <span className="flex items-center"><Users size={15} className="mr-2 text-amber-500" />{selectedEvent.attendees} registered</span>
                                </div>

                                <p className="text-slate-600 leading-relaxed text-sm mb-8 bg-slate-50 rounded-2xl p-4 border border-slate-100">{selectedEvent.description}</p>

                                <div className="space-y-3">
                                    {/* Add to Calendar */}
                                    <button onClick={() => downloadICS(selectedEvent)}
                                        className="w-full py-3 rounded-xl font-bold text-slate-600 border border-slate-200 flex items-center justify-center gap-2 hover:bg-slate-50 transition-all">
                                        <Download size={17} /> Add to Calendar (.ics)
                                    </button>

                                    {/* RSVP buttons */}
                                    {isAlumni ? (
                                        <button onClick={() => handleRsvp(selectedEvent.id, 'attending')}
                                            className={`w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg ${selectedEvent.userRsvp === 'attending' ? 'bg-emerald-600 text-white' : 'bg-slate-900 text-white hover:bg-slate-800'}`}>
                                            <CheckCircle size={20} />{selectedEvent.userRsvp === 'attending' ? 'Attending ✓' : 'Confirm Attendance'}
                                        </button>
                                    ) : (
                                        <>
                                            <button onClick={() => handleRsvp(selectedEvent.id, 'going')}
                                                className={`w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg ${selectedEvent.userRsvp === 'going' ? 'bg-emerald-600 text-white' : 'bg-amber-500 text-white hover:bg-amber-600'}`}>
                                                <CheckCircle size={20} />{selectedEvent.userRsvp === 'going' ? 'Going ✓' : 'Join Event'}
                                            </button>
                                            <button onClick={() => handleRsvp(selectedEvent.id, 'interested')}
                                                className={`w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all border-2 ${selectedEvent.userRsvp === 'interested' ? 'border-amber-500 text-amber-600 bg-amber-50' : 'border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-50'}`}>
                                                <Star size={20} fill={selectedEvent.userRsvp === 'interested' ? 'currentColor' : 'none'} /> Interested
                                            </button>
                                        </>
                                    )}

                                    {/* Cancel RSVP */}
                                    {selectedEvent.userRsvp && (
                                        <button onClick={() => handleRsvp(selectedEvent.id, selectedEvent.userRsvp)}
                                            className="w-full py-2.5 rounded-xl font-bold text-rose-500 border border-rose-200 flex items-center justify-center gap-2 hover:bg-rose-50 transition-all text-sm">
                                            <XCircle size={16} /> Cancel RSVP
                                        </button>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default EventsPage;
