import React, { useState } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { logout } from '../features/auth/authSlice';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LogOut, 
  Menu, 
  Home, 
  Briefcase, 
  Users, 
  LayoutDashboard, 
  Settings,
  X,
  Bell,
  GraduationCap,
  Mail,
  Calendar,
  Flag
} from 'lucide-react';
import NotificationDropdown from './NotificationDropdown';
import ReportModal from './ReportModal';
import { useNotificationSocket } from '../hooks/useNotificationSocket';

const StudentLayout = () => {
    useNotificationSocket(); // Real-time notifications
    const { user } = useSelector((state) => state.auth);
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isReportModalOpen, setIsReportModalOpen] = useState(false);
    const location = useLocation();

    const handleLogout = () => {
        dispatch(logout());
        navigate('/login');
    };

    const menuItems = [
        { to: '/student/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
        { to: '/student/feed', icon: Home, label: 'Community Feed' },
        { to: '/student/events', icon: Calendar, label: 'Campus Events' },
        { to: '/student/jobs', icon: Briefcase, label: 'Find Jobs' },
        { to: '/student/mentorship', icon: Users, label: 'Mentorship' },
        { to: '/student/profile', icon: Settings, label: 'My Profile' },
    ];

    const isActive = (path) => {
        const currentPath = location.pathname;
        const matches = menuItems.filter(item => 
            currentPath === item.to || currentPath.startsWith(item.to + '/')
        );
        let best = null;
        for (const item of matches) {
            if (!best || item.to.length > best.to.length) {
                best = item;
            }
        }
        return best?.to === path;
    };

    return (
        <div className="min-h-screen bg-[#fdfbf7] flex font-sans text-slate-800 selection:bg-amber-100">
            {/* Mobile Sidebar Overlay */}
            <AnimatePresence>
                {isSidebarOpen && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/40 z-40 md:hidden backdrop-blur-sm"
                        onClick={() => setIsSidebarOpen(false)}
                    />
                )}
            </AnimatePresence>

            {/* Sidebar */}
            <aside 
                className={`fixed md:sticky top-0 left-0 h-screen w-72 bg-white/80 backdrop-blur-2xl border-r border-amber-100/50 z-50 transition-transform duration-500 ease-[cubic-bezier(0.25,1,0.5,1)] flex flex-col shadow-[4px_0_24px_-12px_rgba(0,0,0,0.1)] ${
                    isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
                }`}
            >
                {/* Decorative Elements */}
                <div className="absolute top-0 -left-10 w-40 h-40 bg-amber-200/30 rounded-full blur-3xl pointer-events-none"></div>
                <div className="absolute bottom-0 -right-10 w-40 h-40 bg-blue-100/30 rounded-full blur-3xl pointer-events-none"></div>

                <div className="p-8 flex items-center justify-between relative z-10">
                    <div className="flex items-center space-x-3">
                        <div className="h-10 w-10 bg-gradient-to-br from-amber-400 to-amber-600 rounded-xl flex items-center justify-center font-bold text-white shadow-lg shadow-amber-500/20">
                             <GraduationCap size={20} />
                        </div>
                        <div>
                            <span className="block text-xl font-serif font-bold text-slate-800 tracking-tight">Student Hub</span>
                            <span className="block text-[10px] text-amber-600 uppercase tracking-widest font-semibold">Campus Portal</span>
                        </div>
                    </div>
                    <button 
                        onClick={() => setIsSidebarOpen(false)} 
                        className="md:hidden text-slate-400 hover:text-slate-600 transition"
                    >
                        <X size={20} />
                    </button>
                </div>

                <nav className="p-4 space-y-2 flex-1 overflow-y-auto custom-scrollbar relative z-10">
                    <p className="px-4 text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 mt-2 font-serif">Menu</p>
                    {menuItems.map((item) => {
                        const active = isActive(item.to);
                        return (
                            <Link
                                key={item.to}
                                to={item.to}
                                onClick={() => setIsSidebarOpen(false)}
                                className={`group flex items-center space-x-3 px-4 py-3.5 rounded-xl transition-all duration-300 relative overflow-hidden ${
                                    active 
                                    ? 'text-white shadow-md shadow-amber-500/20' 
                                    : 'text-slate-500 hover:bg-amber-50 hover:text-amber-800'
                                }`}
                            >
                                {active && (
                                    <motion.div 
                                        layoutId="activeTabStudent"
                                        className="absolute inset-0 bg-gradient-to-r from-amber-500 to-amber-600 z-0"
                                        initial={false}
                                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                    />
                                )}
                                <item.icon size={20} className={`relative z-10 transition-transform group-hover:scale-110 ${active ? 'text-white' : 'text-slate-400 group-hover:text-amber-600'}`} />
                                <span className={`relative z-10 font-medium ${active ? 'font-semibold' : ''}`}>{item.label}</span>
                            </Link>
                        );
                    })}
                </nav>

                <div className="p-4 border-t border-amber-50 relative z-10 space-y-1">
                    <button 
                        onClick={() => { setIsReportModalOpen(true); setIsSidebarOpen(false); }}
                        className="flex items-center space-x-3 px-4 py-3 rounded-xl text-slate-600 hover:bg-rose-50 hover:text-rose-600 w-full transition-all group font-medium"
                    >
                        <Flag size={18} className="text-slate-400 group-hover:text-rose-500 transition-colors" />
                        <span>Report Issue / ID</span>
                    </button>

                    <button 
                        onClick={handleLogout}
                        className="flex items-center space-x-3 px-4 py-3 rounded-xl text-slate-500 hover:bg-red-50 hover:text-red-500 w-full transition-all group font-medium"
                    >
                        <LogOut size={18} className="group-hover:-translate-x-1 transition-transform" />
                        <span>Sign Out</span>
                    </button>
                    
                    <div className="mt-4 flex items-center space-x-3 px-2 pt-4 border-t border-amber-50">
                        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-white font-bold text-sm shadow-md ring-4 ring-white">
                            {user?.name?.charAt(0).toUpperCase() || 'S'}
                        </div>
                        <div className="overflow-hidden">
                            <p className="text-sm font-bold text-slate-800 truncate">{user?.name || 'Student'}</p>
                            <p className="text-xs text-slate-500 capitalize">Student Account</p>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Report Modal */}
            <ReportModal 
                isOpen={isReportModalOpen} 
                onClose={() => setIsReportModalOpen(false)} 
            />

            {/* Main Content */}
            <main className="flex-1 flex flex-col min-h-screen relative">
                {/* Topbar */}
                <header className="sticky top-0 z-30 h-20 px-6 md:px-10 flex items-center justify-between glass-panel border-b border-amber-100/50 bg-white/70 backdrop-blur-md">
                   <div className="flex items-center">
                        <button 
                             onClick={() => setIsSidebarOpen(true)}
                             className="md:hidden p-2 mr-4 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-amber-50 transition"
                        >
                             <Menu size={24} />
                        </button>
                        <h2 className="text-2xl font-serif font-bold text-slate-800 hidden md:block">
                            {menuItems.find(i => isActive(i.to))?.label || 'Student Hub'}
                        </h2>
                   </div>

                   <div className="flex items-center space-x-6">
                        <NotificationDropdown />
                   </div>
                </header>

                <div className="flex-1 p-6 md:p-10 overflow-y-auto">
                    <Outlet />
                </div>
            </main>
        </div>
    );
};

export default StudentLayout;
