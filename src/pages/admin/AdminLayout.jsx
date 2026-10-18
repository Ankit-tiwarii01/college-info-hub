import React, { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { logout } from '../../features/auth/authSlice';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    LayoutDashboard, 
    UserCheck, 
    Users, 
    GraduationCap, 
    FileWarning, 
    Settings, 
    LogOut,
    Menu,
    X,
    Briefcase,
    Shield,
    Calendar,
    Home,
    Megaphone
} from 'lucide-react';
import NotificationDropdown from '../../components/NotificationDropdown';

const AdminLayout = () => {
    const { user } = useSelector((state) => state.auth);
    const [isSidebarOpen, setSidebarOpen] = useState(false);
    const location = useLocation();
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const handleLogout = () => {
        dispatch(logout());
        navigate('/login');
    };

    const menuItems = [
        { path: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
        { path: '/admin/feed', icon: Home, label: 'Community Feed' },
        { path: '/admin/pending', icon: UserCheck, label: 'Pending Approvals' },
        { path: '/admin/notices', icon: Megaphone, label: 'Campus Notices' },
        { path: '/admin/events', icon: Calendar, label: 'Events' },
        { path: '/admin/jobs', icon: Briefcase, label: 'Job Board' },
        { path: '/admin/users', icon: Users, label: 'Users' },
        { path: '/admin/reports', icon: FileWarning, label: 'Reports' },
        { path: '/admin/settings', icon: Settings, label: 'Settings' },
    ];

    const isActive = (path) => {
        const currentPath = location.pathname;
        const matches = menuItems.filter(item => 
            currentPath === item.path || currentPath.startsWith(item.path + '/')
        );
        let best = null;
        for (const item of matches) {
            if (!best || item.path.length > best.path.length) {
                best = item;
            }
        }
        return best?.path === path;
    };

    return (
        <div className="min-h-screen bg-[#FDFBF7] flex font-sans text-slate-800 selection:bg-amber-100 selection:text-amber-900">
            {/* Mobile Sidebar Overlay */}
            <AnimatePresence>
                {isSidebarOpen && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-slate-900/60 z-40 md:hidden backdrop-blur-sm"
                        onClick={() => setSidebarOpen(false)}
                    />
                )}
            </AnimatePresence>

            {/* Sidebar */}
            <aside 
                className={`fixed md:sticky top-0 left-0 h-screen w-72 bg-white/90 backdrop-blur-2xl border-r border-amber-900/5 z-50 transition-transform duration-500 ease-[cubic-bezier(0.25,1,0.5,1)] flex flex-col shadow-2xl md:shadow-none ${
                    isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
                }`}
            >
                <div className="p-8 flex items-center justify-between relative z-10">
                    <div className="flex items-center space-x-3">
                        <div className="h-10 w-10 bg-gradient-to-br from-amber-400 to-amber-600 rounded-xl flex items-center justify-center font-bold text-white shadow-lg shadow-amber-500/20">
                            <Shield size={20} />
                        </div>
                        <div>
                            <span className="block text-xl font-serif font-bold text-slate-800 tracking-tight">Admin<span className="text-amber-600">Portal</span></span>
                        </div>
                    </div>
                    <button onClick={() => setSidebarOpen(false)} className="md:hidden text-slate-400 hover:text-slate-600 transition">
                        <X size={20} />
                    </button>
                </div>

                <nav className="p-4 space-y-1.5 flex-1 overflow-y-auto custom-scrollbar relative z-10">
                    <p className="px-4 text-xs font-bold text-amber-600/60 uppercase tracking-widest mb-3 mt-2 font-serif">Main Menu</p>
                    {menuItems.map((item) => {
                        const active = isActive(item.path);
                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                onClick={() => setSidebarOpen(false)}
                                className={`group flex items-center space-x-3 px-4 py-3.5 rounded-xl transition-all duration-300 relative overflow-hidden ${
                                    active 
                                    ? 'text-white shadow-lg shadow-amber-500/20' 
                                    : 'text-slate-500 hover:bg-amber-50 hover:text-amber-800'
                                }`}
                            >
                                {active && (
                                    <motion.div 
                                        layoutId="activeTabAdmin"
                                        className="absolute inset-0 bg-gradient-to-r from-amber-500 to-amber-600 z-0"
                                        initial={false}
                                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                    />
                                )}
                                <item.icon size={20} className={`relative z-10 transition-transform group-hover:scale-110 ${active ? 'text-white' : 'text-slate-400 group-hover:text-amber-600'}`} />
                                <span className={`relative z-10 font-bold ${active ? 'tracking-wide' : 'font-medium'}`}>{item.label}</span>
                            </Link>
                        );
                    })}
                </nav>

                <div className="p-6 border-t border-amber-900/5 relative z-10">
                    <button onClick={handleLogout} className="flex items-center space-x-3 px-4 py-3.5 rounded-xl text-slate-500 hover:bg-red-50 hover:text-red-500 w-full transition-all group font-bold">
                        <LogOut size={20} className="group-hover:-translate-x-1 transition-transform" />
                        <span>Sign Out</span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col min-h-screen relative">
                 {/* Decorative background blobs */}
                 <div className="fixed top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
                    <div className="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] bg-amber-200/20 rounded-full blur-[100px] opacity-40"></div>
                 </div>

                {/* Topbar */}
                <header className="sticky top-0 z-30 h-20 px-6 md:px-10 flex items-center justify-between glass-panel border-b border-white/60 bg-white/70 backdrop-blur-md">
                    <div className="flex items-center">
                        <button 
                            onClick={() => setSidebarOpen(true)}
                            className="md:hidden p-2 mr-4 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-50 transition"
                        >
                            <Menu size={24} />
                        </button>
                        <h2 className="text-xl font-serif font-bold text-slate-800 hidden md:block">
                            {menuItems.find(i => isActive(i.path))?.label || 'Dashboard'}
                        </h2>
                    </div>

                    <div className="flex items-center space-x-6">
                        <NotificationDropdown />
                        <div className="flex items-center space-x-3 pl-6 border-l border-slate-200/60">
                            <div className="text-right hidden sm:block">
                                <p className="text-sm font-bold text-slate-800 leading-none">{user?.name || 'Admin User'}</p>
                                <p className="text-[10px] text-amber-600 font-bold uppercase tracking-wider mt-1">Super Admin</p>
                            </div>
                            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-slate-700 to-slate-900 text-white flex items-center justify-center font-bold text-sm shadow-md ring-2 ring-white cursor-pointer hover:ring-amber-200 transition-all">
                                {user?.name ? user.name.substring(0, 2).toUpperCase() : 'AD'}
                            </div>
                        </div>
                    </div>
                </header>

                {/* Page Content */}
                <div className="flex-1 p-6 md:p-10 overflow-y-auto">
                    <Outlet />
                </div>
            </main>
        </div>
    );
};

export default AdminLayout;
