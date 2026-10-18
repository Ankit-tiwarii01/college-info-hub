import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { fetchMentorById, requestMentorship } from '../../features/mentorship/mentorshipSlice';
import { Loader2, User, Award, ArrowLeft, Send, Briefcase, GraduationCap, Mail, X } from 'lucide-react';
import { toast } from 'sonner';
import ComposeMailModal from '../../components/ComposeMailModal';

const MentorProfilePage = () => {
  const { id } = useParams();
  const dispatch = useDispatch();
  const { currentMentor, loading, error } = useSelector((state) => state.mentorship);
  const userRole = useSelector((state) => state.auth.user?.role?.toLowerCase());
  
  const [message, setMessage] = useState('');
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);

  useEffect(() => {
    if (id) {
        dispatch(fetchMentorById(id));
    }
  }, [dispatch, id]);

  const handleRequest = (e) => {
    e.preventDefault();
    if (currentMentor && message.trim()) {
        dispatch(requestMentorship({ 
            mentor_id: currentMentor.id, 
            mentor_name: currentMentor.name,
            message 
        })).then((res) => {
            if (!res.error) {
                toast.success(`Mentorship request sent to ${currentMentor.name}!`);
            } else {
                toast.error(res.payload || 'Failed to send request.');
            }
        });
        setIsRequestModalOpen(false);
        setMessage('');
    }
  };

  if (loading) {
    return <div className="flex justify-center p-20"><Loader2 className="animate-spin text-amber-500" size={40} /></div>;
  }

  if (error || !currentMentor) {
    return (
        <div className="max-w-4xl mx-auto px-4 py-8 text-center">
            <h2 className="text-2xl font-serif text-slate-400 mb-4">Mentor not found</h2>
            <Link to={`/${userRole === 'alumni' ? 'alumni' : 'student'}/mentorship`} className="text-amber-600 hover:underline font-bold">Back to Mentorship</Link>
        </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <Link to={`/${userRole === 'alumni' ? 'alumni' : 'student'}/mentorship`} className="inline-flex items-center text-slate-400 hover:text-amber-600 mb-6 transition font-medium">
        <ArrowLeft size={18} className="mr-2" />
        Back to Mentorship
      </Link>

      <div className="glass-panel p-8 rounded-3xl border border-white/60 shadow-xl shadow-amber-900/5 relative overflow-hidden bg-white/70">
        
        {/* Background blobs */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>

        <div className="flex flex-col md:flex-row gap-10 items-start relative z-10">
            <div className="flex-shrink-0 mx-auto md:mx-0">
                <div className="h-40 w-40 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center font-serif font-bold text-5xl text-white shadow-2xl border-4 border-white/50">
                    {currentMentor.name.charAt(0)}
                </div>
            </div>
            
            <div className="flex-1 w-full text-center md:text-left">
                <div className="flex flex-col md:flex-row md:justify-between md:items-start mb-6">
                    <div>
                        <h1 className="text-4xl font-serif font-bold text-slate-900 mb-2">{currentMentor.name}</h1>
                        <p className="text-amber-600 font-bold text-lg tracking-wide uppercase">{currentMentor.role}</p>
                    </div>
                    <div className="mt-4 md:mt-0 flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                        {(userRole !== 'alumni' && userRole !== 'faculty') && (
                            <button 
                                onClick={() => setIsRequestModalOpen(true)}
                                className="flex items-center justify-center space-x-2 bg-gradient-to-r from-amber-500 to-amber-600 text-white px-6 py-2.5 rounded-xl font-bold hover:shadow-lg hover:shadow-amber-500/20 hover:-translate-y-0.5 transition-all shadow-md cursor-pointer"
                            >
                                <span>Request Mentorship</span>
                                <Send size={18} />
                            </button>
                        )}
                    </div>
                </div>
                <div className="mb-8">
                    <span className="inline-flex items-center px-4 py-1.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-100 uppercase tracking-wider">
                        <Award size={14} className="mr-2" />
                        {currentMentor.expertise}
                    </span>
                </div>

                <div className="space-y-8 text-slate-600">
                    <section>
                        <h3 className="text-xl font-serif font-bold text-slate-800 mb-3 flex items-center">
                            <User size={20} className="mr-2 text-amber-500" /> Bio
                        </h3>
                        <p className="leading-relaxed bg-white/50 p-6 rounded-2xl border border-white/60 shadow-sm text-lg">{currentMentor.bio || 'No bio available.'}</p>
                    </section>
                    
                    <div className="grid md:grid-cols-2 gap-6">
                        <section>
                            <h3 className="text-xl font-serif font-bold text-slate-800 mb-3 flex items-center">
                                <GraduationCap size={20} className="mr-2 text-amber-500" /> Education
                            </h3>
                            <div className="bg-white/50 p-5 rounded-2xl border border-white/60 shadow-sm font-medium">
                                {currentMentor.education || 'Not specified'}
                            </div>
                        </section>
                        <section>
                             <h3 className="text-xl font-serif font-bold text-slate-800 mb-3 flex items-center">
                                <Briefcase size={20} className="mr-2 text-amber-500" /> Experience
                            </h3>
                             <div className="bg-white/50 p-5 rounded-2xl border border-white/60 shadow-sm text-sm font-medium">
                                {currentMentor.experience ? (
                                    <ul className="list-disc pl-4 space-y-2">
                                        {Array.isArray(currentMentor.experience) ? currentMentor.experience.map((exp, i) => <li key={i}>{exp}</li>) : <li>{currentMentor.experience}</li>}
                                    </ul>
                                ) : 'Not specified'}
                            </div>
                        </section>
                    </div>
                </div>
            </div>
        </div>
      </div>

       {/* Request Modal */}
       {isRequestModalOpen && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl w-full max-w-lg p-8 transform transition-all shadow-2xl relative overflow-hidden">
                  <button onClick={() => setIsRequestModalOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition">
                      <X size={20} />
                  </button>
                  
                  <h3 className="text-2xl font-serif font-bold text-slate-900 mb-2">Request Mentorship</h3>
                  <p className="text-sm text-slate-500 mb-6">Sending request to <span className="font-bold text-amber-600 text-lg">{currentMentor.name}</span></p>
                  
                  <form onSubmit={handleRequest}>
                      <textarea
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-slate-700 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 mb-6 resize-none placeholder-slate-400 outline-none transition-all"
                          rows="5"
                          placeholder="Introduce yourself and explain why you're seeking mentorship..."
                          value={message}
                          onChange={(e) => setMessage(e.target.value)}
                          required
                      ></textarea>
                      <div className="flex justify-end space-x-3">
                          <button 
                            type="button" 
                            onClick={() => setIsRequestModalOpen(false)}
                            className="px-5 py-2.5 text-sm font-bold text-slate-500 hover:bg-slate-50 rounded-xl transition"
                          >
                              Cancel
                          </button>
                          <button 
                            type="submit" 
                            className="px-6 py-2.5 text-sm font-bold text-white bg-gradient-to-r from-amber-500 to-amber-600 rounded-xl hover:shadow-lg hover:shadow-amber-500/20 hover:-translate-y-0.5 transition-all flex items-center"
                          >
                              <span>Send Request</span>
                              <Send size={16} className="ml-2"/>
                          </button>
                      </div>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
};

export default MentorProfilePage;

