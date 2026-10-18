import React, { useState } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { logout } from '../features/auth/authSlice';
import { LogOut, Menu, X, Home, Briefcase, Users, LayoutDashboard, ChevronRight, Compass } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Toaster } from 'sonner';

const NavLink = ({ to, children, icon: Icon }) => {
  const location = useLocation();
  const isActive = location.pathname.startsWith(to);
  return (
    <Link 
        to={to} 
        className={`flex items-center space-x-2 px-4 py-2 rounded-xl transition-all duration-300 font-bold text-sm ${
            isActive 
            ? 'text-amber-700 bg-amber-50 shadow-sm shadow-amber-500/10' 
            : 'text-slate-500 hover:text-amber-600 hover:bg-amber-50/50'
        }`}
    >
        {Icon && <Icon size={18} />}
        <span>{children}</span>
    </Link>
  );
};

const Navbar = () => {
  const { user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  // location is now used in NavLink directly
  const [isOpen, setIsOpen] = useState(false);

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  return (
    <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-amber-900/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-20 items-center">
          <div className="flex items-center">
            <Link to="/" className="flex-shrink-0 flex items-center space-x-3 group">
              <div className="h-10 w-10 bg-gradient-to-br from-amber-400 to-amber-600 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/20 group-hover:scale-105 transition-transform duration-500">
                 <span className="text-white font-serif font-bold text-2xl">C</span>
              </div>
              <span className="text-2xl font-serif font-bold text-slate-800 tracking-tight group-hover:text-amber-600 transition-colors">Campus <span className="text-amber-600">InfoHub</span></span>
            </Link>
          </div>
          <div className="hidden md:ml-10 md:items-center md:flex space-x-1">
             <div className="flex items-center space-x-4">
               <Link to="/" className="text-slate-600 hover:text-amber-600 font-bold transition text-sm flex items-center gap-1"><Home size={16} /> Home</Link>
               <Link to="/login" className="text-slate-600 hover:text-amber-600 font-bold transition text-sm">Sign In</Link>
               <Link to="/alumni/register" className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white px-6 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-amber-500/20 transition-all transform hover:-translate-y-0.5 flex items-center">
                 Sign Up <ChevronRight size={16} className="ml-1" />
               </Link>
             </div>
          </div>
           <div className="-mr-2 flex items-center space-x-2 md:hidden">
            <button onClick={() => setIsOpen(!isOpen)} className="p-2 rounded-xl text-slate-500 hover:text-amber-600 hover:bg-amber-50 focus:outline-none transition">
              {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>
      {/* Mobile menu */}
      <AnimatePresence>
        {isOpen && (
            <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                 exit={{ height: 0, opacity: 0 }}
                className="md:hidden overflow-hidden bg-white border-b border-amber-900/5 shadow-xl"
            >
            <div className="px-4 pt-4 pb-6 space-y-2">
                <div className="space-y-4 pt-2 pb-4">
                <Link to="/" className="block text-center w-full px-4 py-3 text-slate-600 font-bold hover:bg-amber-50 hover:text-amber-700 rounded-xl flex items-center justify-center gap-2"><Home size={18} /> Home</Link>
                <Link to="/login" className="block text-center w-full px-4 py-3 text-slate-600 font-bold hover:bg-slate-50 rounded-xl">Sign In</Link>
                <Link to="/alumni/register" className="block text-center w-full px-4 py-3 bg-gradient-to-r from-amber-500 to-amber-600 text-white font-bold rounded-xl shadow-lg">Sign Up / Alumni Registration</Link>
                </div>
            </div>
            </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

 const Layout = () => {
  return (
    <div className="min-h-screen bg-[#FDFBF7] text-slate-800 font-sans selection:bg-amber-100 selection:text-amber-900">
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-amber-100/40 via-transparent to-transparent pointer-events-none z-0"></div>
      <div className="relative z-10">
        <Toaster closeButton position="top-right" richColors theme="light" />
        <Navbar />
        <main>
            <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
