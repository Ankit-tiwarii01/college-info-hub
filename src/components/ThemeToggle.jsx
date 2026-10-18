import React, { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { motion } from 'framer-motion';
import { applyTheme } from '../services/appearance';

const ThemeToggle = () => {
    const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');

    useEffect(() => {
        applyTheme(theme);
    }, [theme]);

    const toggleTheme = () => {
        setTheme(theme === 'light' ? 'dark' : 'light');
    };

    return (
        <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={toggleTheme}
            className="p-2.5 rounded-xl bg-slate-100/50 border border-slate-200 text-slate-500 hover:text-amber-600 transition-colors shadow-sm"
            aria-label="Toggle Theme"
        >
            <div className="relative w-5 h-5">
                <motion.div
                    initial={false}
                    animate={{ 
                        rotate: theme === 'dark' ? 0 : 90,
                        opacity: theme === 'dark' ? 1 : 0,
                        scale: theme === 'dark' ? 1 : 0
                    }}
                    className="absolute inset-0 flex items-center justify-center text-amber-500"
                >
                    <Moon size={20} fill="currentColor" />
                </motion.div>
                <motion.div
                    initial={false}
                    animate={{ 
                        rotate: theme === 'dark' ? -90 : 0,
                        opacity: theme === 'dark' ? 0 : 1,
                        scale: theme === 'dark' ? 0 : 1
                    }}
                    className="absolute inset-0 flex items-center justify-center text-amber-600"
                >
                    <Sun size={20} fill="currentColor" />
                </motion.div>
            </div>
        </motion.button>
    );
};

export default ThemeToggle;
