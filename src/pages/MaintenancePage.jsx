import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Wrench, ShieldAlert, Lock, ArrowRight, RefreshCw } from 'lucide-react';

const MaintenancePage = () => {
    const handleRefresh = () => {
        window.location.reload();
    };

    return (
        <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center p-6 relative overflow-hidden text-slate-800 selection:bg-amber-100">
            {/* Background Decorative Blur Orbs */}
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-amber-300/30 rounded-full blur-[120px] pointer-events-none animate-pulse" />
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-orange-200/40 rounded-full blur-[120px] pointer-events-none" />

            <motion.div 
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.5 }}
                className="max-w-lg w-full bg-white/80 backdrop-blur-2xl border border-white/80 rounded-3xl p-8 md:p-12 shadow-2xl shadow-amber-900/10 text-center relative z-10"
            >
                {/* Maintenance Icon Badge */}
                <div className="relative mx-auto w-24 h-24 mb-6">
                    <div className="absolute inset-0 bg-gradient-to-br from-amber-400 to-amber-600 rounded-3xl blur-lg opacity-40 animate-pulse" />
                    <div className="relative h-24 w-24 bg-gradient-to-br from-amber-500 to-amber-600 rounded-3xl flex items-center justify-center text-white shadow-xl shadow-amber-500/30">
                        <Wrench size={44} className="transform -rotate-12" />
                    </div>
                </div>

                <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-amber-100/70 border border-amber-200 text-amber-900 text-xs font-bold uppercase tracking-wider mb-4">
                    <ShieldAlert size={14} className="text-amber-600" />
                    <span>System Under Maintenance</span>
                </div>

                <h1 className="text-3xl md:text-4xl font-serif font-bold text-slate-900 mb-4 tracking-tight">
                    We'll Be Back Soon!
                </h1>

                <p className="text-slate-600 text-sm md:text-base leading-relaxed mb-8 font-light">
                    The platform is currently undergoing scheduled system updates to improve performance and security. Access for non-admin users is temporarily paused.
                </p>

                <div className="space-y-3">
                    <button
                        onClick={handleRefresh}
                        className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold shadow-lg shadow-amber-500/25 transition-all transform hover:-translate-y-0.5 flex items-center justify-center space-x-2 text-sm"
                    >
                        <RefreshCw size={16} />
                        <span>Check Again / Refresh</span>
                    </button>

                    <Link
                        to="/login"
                        className="w-full py-3 px-6 rounded-2xl border border-slate-200 hover:border-amber-300 bg-white hover:bg-amber-50/50 text-slate-700 hover:text-amber-800 font-bold transition-all flex items-center justify-center space-x-2 text-xs"
                    >
                        <Lock size={14} className="text-slate-400" />
                        <span>Administrator Sign In</span>
                        <ArrowRight size={14} />
                    </Link>
                </div>
            </motion.div>
        </div>
    );
};

export default MaintenancePage;
