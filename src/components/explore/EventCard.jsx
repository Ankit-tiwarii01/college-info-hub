import React from 'react';
import { Calendar, MapPin, Lock } from 'lucide-react';

const EventCard = ({ event, requireLogin }) => (
  <div className="p-6 rounded-2xl bg-white border border-slate-100 hover:border-amber-200 hover:shadow-xl transition-all">
    {event.image && <div className="rounded-xl overflow-hidden mb-4 border border-slate-100"><img src={event.image} alt={event.title} className="w-full h-40 object-cover" /></div>}
    <div className="flex items-start justify-between mb-2">
      <h4 className="font-serif font-bold text-lg text-slate-900">{event.title}</h4>
      {event.type && <span className="text-xs bg-violet-50 text-violet-700 px-2.5 py-1 rounded-full font-bold uppercase ml-2 shrink-0">{event.type}</span>}
    </div>
    <div className="flex flex-wrap gap-3 text-xs text-slate-500 mb-3">
      {event.date && <span className="flex items-center gap-1"><Calendar size={12} />{new Date(event.date).toLocaleDateString()}</span>}
      {event.location && <span className="flex items-center gap-1"><MapPin size={12} />{event.location}</span>}
    </div>
    {event.description && <p className="text-slate-600 text-sm line-clamp-3 mb-4">{event.description}</p>}
    <div className="flex items-center justify-between">
      <span className="text-xs text-slate-400 font-medium">{event.attendees || 0} attending</span>
      <button onClick={() => requireLogin('Sign in to RSVP.')} className="px-4 py-2 rounded-xl bg-violet-50 text-violet-700 font-bold text-xs hover:bg-violet-100 transition flex items-center gap-1.5"><Lock size={12} />RSVP</button>
    </div>
  </div>
);

export default EventCard;
