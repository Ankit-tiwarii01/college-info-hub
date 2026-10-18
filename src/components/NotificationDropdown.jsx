import React, { useState, useEffect } from 'react';
import { Bell, Info, CheckCircle, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import API from '../services/api';
import { useNavigate } from 'react-router-dom';

const NotificationDropdown = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    // Fetch mock notifications
    const fetchNotifications = async () => {
        try {
            const res = await API.get('/notifications');
            setNotifications(res.data);
            setUnreadCount(res.data.filter(n => !n.read).length);
        } catch (err) {
            console.error("Failed to fetch notifications", err);
        }
    };
    fetchNotifications();
    const poller = setInterval(fetchNotifications, 15000);
    const refresh = () => fetchNotifications();
    window.addEventListener('notification:refresh', refresh);
    return () => {
      clearInterval(poller);
      window.removeEventListener('notification:refresh', refresh);
    };
  }, []);

  const toggleDropdown = () => setIsOpen(!isOpen);

  const getIcon = (type) => {
      switch(type) {
          case 'success': return <CheckCircle size={16} className="text-green-500" />;
          case 'warning': return <AlertTriangle size={16} className="text-amber-500" />;
          default: return <Info size={16} className="text-blue-500" />;
      }
  };

  const handleNotificationClick = async (notif) => {
    if (!notif.read) {
      try {
        await API.put(`/notifications/${notif.id}/read`);
        setNotifications(cur => cur.map(item => item.id === notif.id ? { ...item, read: true } : item));
        setUnreadCount(cur => Math.max(0, cur - 1));
      } catch (err) {
        console.error('Failed to mark notification as read', err);
      }
    }
    setIsOpen(false);
    if (notif.action_url) navigate(notif.action_url);
  };

  const handleMarkAllRead = async () => {
    try {
        await API.put('/notifications/read-all');
        const updated = notifications.map(n => ({ ...n, read: true }));
        setNotifications(updated);
        setUnreadCount(0);
    } catch (err) {
        console.error("Failed to mark notifications as read", err);
    }
  };

  return (
    <div className="relative z-50">
      <button 
        onClick={toggleDropdown}
        className="relative p-2.5 text-slate-400 hover:text-amber-600 transition-colors group bg-white/50 hover:bg-white rounded-xl border border-transparent hover:border-amber-100"
      >
        <Bell size={22} className={`group-hover:rotate-12 transition-transform ${isOpen ? 'text-amber-600' : ''}`} />
        {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 bg-red-500 text-white text-[10px] font-bold rounded-full border-2 border-white flex items-center justify-center">{unreadCount > 99 ? '99+' : unreadCount}</span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
            <>
                <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)}></div>
                <motion.div 
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="fixed left-4 right-4 top-20 md:absolute md:left-auto md:right-0 md:top-full md:mt-3 md:w-96 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden z-50 origin-top-right"
                >
                    <div className="px-5 py-4 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                        <h3 className="font-serif font-bold text-slate-800">Notifications</h3>
                        <button onClick={handleMarkAllRead} className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-lg cursor-pointer hover:bg-amber-100 transition">Mark all read</button>
                    </div>

                    <div className="max-h-[400px] overflow-y-auto custom-scrollbar p-2">
                        {notifications.length > 0 ? (
                            notifications.map(notif => (
                                <button type="button" onClick={() => handleNotificationClick(notif)} key={notif.id} className={`w-full text-left p-3 rounded-xl mb-1 flex items-start space-x-3 transition-colors ${!notif.read ? 'bg-amber-50/60 hover:bg-amber-50' : 'hover:bg-slate-50'}`}>
                                    <div className="mt-1 flex-shrink-0 bg-white p-1.5 rounded-full shadow-sm border border-slate-100">
                                        {getIcon(notif.type)}
                                    </div>
                                    <div className="flex-1">
                                        <p className={`text-sm leading-snug mb-1 ${!notif.read ? 'font-bold text-slate-800' : 'text-slate-600'}`}>{notif.text}</p>
                                        <p className="text-xs text-slate-400 font-medium">{new Date(notif.created_at).toLocaleString()}</p>
                                    </div>
                                    {!notif.read && <div className="h-2 w-2 rounded-full bg-amber-500 mt-2"></div>}
                                </button>
                            ))
                        ) : (
                            <div className="p-8 text-center text-slate-400">
                                <Bell size={32} className="mx-auto mb-2 opacity-50" />
                                <p className="text-sm">No new notifications</p>
                            </div>
                        )}
                    </div>
                    
                    <div className="p-3 border-t border-slate-50 bg-slate-50/30 text-center">
                        <button className="text-xs font-bold text-slate-500 hover:text-amber-600 transition">View All Activity</button>
                    </div>
                </motion.div>
            </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NotificationDropdown;
