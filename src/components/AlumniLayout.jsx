import React, { useState } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { logout } from '../features/auth/authSlice';
import { 
  LogOut, 
  Menu, 
  Home, 
  Briefcase, 
  Users, 
  LayoutDashboard, 
  Settings,
  X,
  GraduationCap,
  Calendar,
  Bell,
  Flag
} from 'lucide-react';
import { useNotificationSocket } from '../hooks/useNotificationSocket';
import NotificationDropdown from './NotificationDropdown';
import ReportModal from './ReportModal';

const SidebarItem = ({ to, icon: Icon, label, onClick, isActive }) => {
    return (
        <Link 
            to={to} 
            onClick={onClick}
            className={`flex items-center space-x-3 px-4 py-3.5 rounded-xl transition-all duration-300 font-bold ${
                isActive 
                ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-lg shadow-amber-500/30 translate-x-1' 
                : 'text-slate-500 hover:bg-amber-50 hover:text-amber-700 hover:pl-6'
            }`}
        >
            <Icon size={20} className={isActive ? 'text-white' : 'text-slate-400 group-hover:text-amber-600'} />
            <span>{label}</span>
        </Link>
    );
};

const AlumniLayout = () => {
    useNotificationSocket(); // Real-time notifications
    const { user } = useSelector((state) => state.auth);
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const location = useLocation();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isReportModalOpen, setIsReportModalOpen] = useState(false);

    const handleLogout = () => {
        dispatch(logout());
        navigate('/');
    };

    const menuItems = [
        { to: '/alumni/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
        { to: '/alumni/profile', icon: Settings, label: 'My Profile' },
        { to: '/alumni/feed', icon: Home, label: 'Notices & Feed' },
        { to: '/alumni/jobs', icon: Briefcase, label: 'Jobs & Openings' },
        { to: '/alumni/events', icon: Calendar, label: 'Campus Events' },
        { to: '/explore', icon: GraduationCap, label: 'Alumni Directory' },
        { to: '/alumni/jobs/applicants', icon: Users, label: 'Applicant Tracker' },
    ];

    const isActive = (to) => {
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
        return best?.to === to;
    };

    return (
        <div className="min-h-screen bg-[#FDFBF7] flex font-sans selection:bg-amber-100 selection:text-amber-900">
            {/* Mobile Overlay */}
            {isSidebarOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 md:hidden transition-opacity" onClick={() => setIsSidebarOpen(false)}></div>
            )}

            {/* Sidebar */}
            <aside 
                className={`fixed md:sticky top-0 left-0 h-screen w-72 bg-white/80 backdrop-blur-xl border-r border-amber-900/5 z-50 transform transition-transform duration-300 ease-out p-6 flex flex-col shadow-2xl md:shadow-none ${
                    isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
                }`}
            >
                <div className="flex items-center justify-between mb-10 px-2">
                    <div className="flex items-center space-x-3">
                        <div className="h-10 w-10 bg-gradient-to-br from-amber-400 to-amber-600 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/20">
                             <GraduationCap className="text-white" size={20} />
                        </div>
                        <div>
                             <h1 className="text-xl font-serif font-bold text-slate-800 tracking-tight leading-none">Alumni</h1>
                             <span className="text-xs font-bold text-amber-600 tracking-widest uppercase">Network</span>
                        </div>
                    </div>
                    <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-slate-400 hover:text-slate-600">
                        <X size={24} />
                    </button>
                </div>

                <div className="flex-1 space-y-2 py-4">
                    {menuItems.map((item) => (
                        <SidebarItem key={item.to} {...item} isActive={isActive(item.to)} onClick={() => setIsSidebarOpen(false)} />
                    ))}
                </div>

                <div className="pt-6 border-t border-amber-900/5 space-y-1">
                    <button 
                        onClick={() => { setIsReportModalOpen(true); setIsSidebarOpen(false); }}
                        className="flex items-center space-x-3 px-4 py-3 rounded-xl text-slate-600 hover:bg-rose-50 hover:text-rose-600 transition-all w-full font-bold group"
                    >
                        <Flag size={20} className="text-slate-400 group-hover:text-rose-500 transition-colors" />
                        <span>Report Issue / ID</span>
                    </button>

                    <button 
                        onClick={handleLogout}
                        className="flex items-center space-x-3 px-4 py-3 rounded-xl text-slate-500 hover:bg-red-50 hover:text-red-600 transition-all w-full font-bold group"
                    >
                        <LogOut size={20} className="group-hover:-translate-x-1 transition-transform" />
                        <span>Sign Out</span>
                    </button>
                    
                    <div className="mt-4 flex items-center space-x-3 px-3 py-3 bg-amber-50/50 rounded-2xl border border-amber-100">
                        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-serif font-bold text-lg shadow-md border-2 border-white">
                            {user?.name?.charAt(0).toUpperCase() || 'A'}
                        </div>
                        <div className="overflow-hidden">
                            <p className="text-sm font-bold text-slate-800 truncate">{user?.name || 'Alumni User'}</p>
                            <p className="text-xs text-amber-600 font-bold uppercase tracking-wider">Verified Alumni</p>
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
            <main className="flex-1 min-w-0 flex flex-col min-h-screen relative">
                 {/* Decorative background blobs */}
                 <div className="fixed top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
                    <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-amber-200/20 rounded-full blur-[100px] opacity-50"></div>
                    <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-orange-200/20 rounded-full blur-[120px] opacity-40"></div>
                 </div>

                <div className="md:hidden bg-white/80 backdrop-blur-md border-b border-amber-100 p-4 flex justify-between items-center sticky top-0 z-30 shadow-sm">
                     <div className="flex items-center space-x-2">
                        <div className="h-8 w-8 bg-gradient-to-br from-amber-400 to-amber-600 rounded-lg flex items-center justify-center">
                             <GraduationCap className="text-white" size={16} />
                        </div>
                        <span className="font-serif font-bold text-slate-800">Alumni Network</span>
                     </div>
                     <button onClick={() => setIsSidebarOpen(true)} className="p-2 bg-amber-50 text-amber-900 rounded-lg">
                         <Menu size={24} />
                     </button>
                </div>

                <div className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full">
                    <Outlet />
                </div>
            </main>
        </div>
    );
};

export default AlumniLayout;
