import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchProfile } from '../../features/auth/authSlice';
import { Loader2, User, Mail, Briefcase, Award, MapPin, Share2, BookOpen, GraduationCap, CheckCircle, Building2 } from 'lucide-react';
import EditProfileModal from '../../components/EditProfileModal';
import API from '../../services/api';
import { toast } from 'sonner';
import Breadcrumbs from '../../components/Breadcrumbs';

const ProfilePage = () => {
    const dispatch = useDispatch();
    const { user, loading } = useSelector((state) => state.auth);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [stats, setStats] = useState(null);

    useEffect(() => {
        if (!user) {
            dispatch(fetchProfile());
        }
    }, [dispatch, user]);

    useEffect(() => {
        if (user) {
            API.get('/users/me/stats')
                .then(res => setStats(res.data))
                .catch(() => {}); // stats are non-critical
        }
    }, [user]);

    const handleShare = () => {
        const url = window.location.href;
        navigator.clipboard.writeText(url).then(() => {
            toast.success('Profile link copied!', { description: url });
        }).catch(() => {
            toast.error('Could not copy link.');
        });
    };

    if (!user) return <div className="flex justify-center p-10"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="max-w-5xl mx-auto px-4 py-6 space-y-4">
        <Breadcrumbs items={[{ label: 'Dashboard', path: user?.role === 'alumni' ? '/alumni/dashboard' : '/student/dashboard' }, { label: 'My Profile' }]} />
        <EditProfileModal user={user} isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} />
        <div className="glass-panel rounded-3xl overflow-hidden border border-white/60 shadow-2xl shadow-amber-900/10 bg-white/80 relative">
            {/* Cover Image */}
            <div className="h-48 w-full bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 relative overflow-hidden">
                <div className="absolute inset-0 bg-black/10"></div>
                <div className="absolute -bottom-10 -right-10 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
                <div className="absolute top-10 left-10 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
            </div>

            <div className="px-8 pb-10 relative">
                <div className="flex flex-col md:flex-row items-end -mt-20 mb-8 relative z-10">
                     <div className="h-40 w-40 rounded-full bg-white p-1.5 shadow-xl ring-4 ring-white/50">
                         <div className="h-full w-full rounded-full bg-slate-100 flex items-center justify-center text-slate-400 overflow-hidden relative group">
                             <User size={64} className="group-hover:scale-110 transition-transform duration-500"/>
                             {user.avatar && <img src={user.avatar} alt={user.name} className="absolute inset-0 w-full h-full object-cover" />}
                         </div>
                     </div>
                     <div className="md:ml-6 mt-4 md:mt-0 md:mb-2 text-center md:text-left flex-1">
                         <h1 className="text-4xl font-serif font-bold text-slate-900 mb-1">{user.name}</h1>
                         <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
                            <span className="bg-amber-100/80 text-amber-800 text-xs px-3 py-1 rounded-full uppercase font-bold tracking-wider border border-amber-200">{user.role}</span>
                            <span className="text-slate-500 text-sm font-medium flex items-center"><MapPin size={14} className="mr-1"/> {user.location || 'Campus'}</span>
                         </div>
                     </div>
                     <div className="mt-6 md:mt-0 flex gap-3">
                         <button onClick={() => setIsEditModalOpen(true)} className="px-6 py-2.5 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition shadow-lg shadow-slate-900/20">Edit Profile</button>
                     </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                    {/* Sidebar Info */}
                    <div className="space-y-6">
                        <div className="glass-panel p-6 rounded-2xl bg-white/50 border border-white/60">
                            <h3 className="font-serif font-bold text-slate-800 mb-4 text-lg">Contact Info</h3>
                            <div className="space-y-4">
                                <div className="flex items-center text-slate-600 group">
                                    <div className="h-8 w-8 rounded-lg bg-slate-100 flex items-center justify-center mr-3 group-hover:bg-amber-50 group-hover:text-amber-600 transition-colors">
                                        <Mail size={16} />
                                    </div>
                                    <span className="text-sm font-medium">{user.email}</span>
                                </div>
                                <div className="flex items-center text-slate-600 group">
                                    <div className="h-8 w-8 rounded-lg bg-slate-100 flex items-center justify-center mr-3 group-hover:bg-amber-50 group-hover:text-amber-600 transition-colors">
                                        <Briefcase size={16} />
                                    </div>
                                    <span className="text-sm font-medium">{user.current_company || user.organization || user.department || 'Tech Professional'}</span>
                                </div>
                                <div className="flex items-center text-slate-600 group">
                                    <div className="h-8 w-8 rounded-lg bg-slate-100 flex items-center justify-center mr-3 group-hover:bg-amber-50 group-hover:text-amber-600 transition-colors">
                                        <Award size={16} />
                                    </div>
                                    <span className="text-sm font-medium">Member since {new Date().getFullYear()}</span>
                                </div>
                            </div>
                        </div>

                         <div className="glass-panel p-6 rounded-2xl bg-white/50 border border-white/60">
                            <h3 className="font-serif font-bold text-slate-800 mb-4 text-lg">Skills & Interests</h3>
                            <div className="flex flex-wrap gap-2">
                                {user.skills ? user.skills.split(',').map(skill => (
                                    <span key={skill} className="bg-white border border-slate-200 text-slate-600 px-3 py-1.5 rounded-lg text-xs font-bold hover:border-amber-300 hover:text-amber-700 transition cursor-default shadow-sm">{skill.trim()}</span>
                                )) : <span className="text-slate-400 text-sm italic">No skills listed yet.</span>}
                            </div>
                        </div>
                    </div>

                    {/* Main Content */}
                    <div className="lg:col-span-2 space-y-8">
                        <div>
                            <h3 className="font-serif font-bold text-2xl text-slate-800 mb-4">About Me</h3>
                            <div className="p-6 rounded-2xl bg-white/50 border border-white/60 text-slate-600 leading-relaxed">
                                {user.bio ? (
                                    <p>{user.bio}</p>
                                ) : (
                                    <div className="text-center py-8">
                                        <p className="text-slate-400 italic mb-4">You haven't added a bio yet.</p>
                                        <button onClick={() => setIsEditModalOpen(true)} className="text-amber-600 font-bold text-sm hover:underline">Add a bio to tell your story</button>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Work Experience Section (Current & Previous Companies) */}
                        <div>
                            <h3 className="font-serif font-bold text-2xl text-slate-800 mb-4 flex items-center">
                                <Briefcase size={22} className="mr-2 text-amber-600" /> Work Experience & Companies
                            </h3>
                            <div className="p-6 rounded-2xl bg-white/60 border border-amber-100 shadow-sm space-y-4">
                                <div>
                                    <span className="text-xs font-bold text-amber-800 uppercase tracking-wider bg-amber-100 px-2.5 py-1 rounded-full border border-amber-200">Current Role</span>
                                    <p className="text-lg font-serif font-bold text-slate-900 mt-2">{user.designation || 'Software Engineer'}</p>
                                    <p className="text-amber-700 font-bold text-base flex items-center gap-1.5 mt-0.5">
                                        <Building2 size={18} className="text-amber-600" />
                                        <span>{user.current_company || user.organization || 'Google'}</span>
                                    </p>
                                </div>

                                <div className="pt-3 border-t border-slate-100">
                                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Previous Companies / Career Trace</span>
                                    <p className="text-sm text-slate-700 font-medium mt-1">
                                        {user.previous_company ? user.previous_company : (
                                            <span className="text-slate-400 italic">No previous company recorded. Click "Edit Profile" to trace your work history.</span>
                                        )}
                                    </p>
                                </div>
                            </div>
                        </div>

                         {/* Impact Overview — real stats */}
                         <div>
                            <h3 className="font-serif font-bold text-2xl text-slate-800 mb-4">Impact Overview</h3>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                {[
                                    { label: 'Posts', value: stats?.posts_count ?? '—' },
                                    { label: 'Applications', value: stats?.applications_count ?? '—' },
                                    { label: 'Mentorships', value: stats?.mentorships_count ?? '—' },
                                    { label: 'Events', value: stats?.events_count ?? '—' },
                                ].map(({ label, value }) => (
                                    <div key={label} className="p-5 rounded-2xl bg-white border border-slate-100 text-center hover:border-amber-200 hover:shadow-lg transition-all group">
                                        <div className="text-3xl font-serif font-bold text-amber-500 mb-1 group-hover:scale-110 transition-transform">{value}</div>
                                        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">{label}</div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Experience Section */}
                        {user.experience && user.experience.length > 0 && (
                            <div>
                                <h3 className="font-serif font-bold text-2xl text-slate-800 mb-4 flex items-center">
                                    <Briefcase size={22} className="mr-2 text-amber-600" /> Experience
                                </h3>
                                <div className="space-y-4">
                                    {user.experience.map((exp) => (
                                        <div key={exp.id} className="p-5 rounded-2xl bg-white border border-slate-100 hover:border-amber-200 transition-all">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <p className="font-bold text-slate-800">{exp.role}</p>
                                                    <p className="text-amber-600 font-semibold text-sm">{exp.company_name}</p>
                                                    <span className="inline-block mt-1 text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-bold uppercase">{exp.experience_type}</span>
                                                </div>
                                                <div className="text-xs text-slate-400 font-medium text-right">
                                                    <p>{exp.start_date ? new Date(exp.start_date).toLocaleDateString([], { month: 'short', year: 'numeric' }) : ''}</p>
                                                    <p>{exp.end_date ? new Date(exp.end_date).toLocaleDateString([], { month: 'short', year: 'numeric' }) : 'Present'}</p>
                                                </div>
                                            </div>
                                            {exp.description && <p className="text-sm text-slate-600 mt-3 leading-relaxed">{exp.description}</p>}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Academic Info Section */}
                        {user.academic && (
                            <div>
                                <h3 className="font-serif font-bold text-2xl text-slate-800 mb-4 flex items-center">
                                    <GraduationCap size={22} className="mr-2 text-amber-600" /> Academic Info
                                </h3>
                                <div className="p-5 rounded-2xl bg-white border border-slate-100 hover:border-amber-200 transition-all grid grid-cols-2 gap-4">
                                    {[
                                        { label: 'Degree', value: user.academic.degree },
                                        { label: 'Specialization', value: user.academic.specialization },
                                        { label: 'Department', value: user.academic.department },
                                        { label: 'Year', value: user.academic.year },
                                        { label: 'Enrollment No.', value: user.academic.enrollment_no },
                                        { label: 'Batch', value: user.batch },
                                    ].filter(f => f.value).map(({ label, value }) => (
                                        <div key={label}>
                                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-0.5">{label}</p>
                                            <p className="font-bold text-slate-700">{value}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    </div>
  );
};

export default ProfilePage;
