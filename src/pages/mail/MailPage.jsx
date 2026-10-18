import React, { useEffect, useState, useCallback } from 'react';
import { Search, Mail, Send, Inbox, ChevronRight, Star, StarOff, Loader2, Trash2, RefreshCw, X } from 'lucide-react';
import ComposeMailModal from '../../components/ComposeMailModal';
import API from '../../services/api';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

const MailPage = () => {
    const [activeTab, setActiveTab] = useState('inbox');
    const [mails, setMails] = useState([]);
    const [selectedMail, setSelectedMail] = useState(null);
    const [showCompose, setShowCompose] = useState(false);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [showReply, setShowReply] = useState(false);

    const fetchMails = useCallback(async () => {
        setLoading(true);
        setSelectedMail(null);
        try {
            const endpoint = activeTab === 'starred'
                ? '/mail/starred'
                : activeTab === 'sent'
                ? '/mail/sent'
                : '/mail/inbox';
            const res = await API.get(endpoint);
            setMails(res.data);
        } catch (err) {
            toast.error('Failed to load messages.');
        } finally {
            setLoading(false);
        }
    }, [activeTab]);

    useEffect(() => { fetchMails(); }, [fetchMails]);

    const handleSelect = async (mail) => {
        setSelectedMail(mail);
        setShowReply(false);
        // Mark as read if unopened in inbox
        if (activeTab === 'inbox' && !mail.is_read) {
            try {
                await API.put(`/mail/${mail.id}/read`);
                setMails(prev => prev.map(m => m.id === mail.id ? { ...m, is_read: true } : m));
            } catch (_) { /* silent */ }
        }
    };

    const handleStar = async (e, mail) => {
        e.stopPropagation();
        try {
            const res = await API.put(`/mail/${mail.id}/star`);
            setMails(prev => prev.map(m => m.id === mail.id ? { ...m, is_starred: res.data.starred } : m));
            if (selectedMail?.id === mail.id) setSelectedMail(prev => ({ ...prev, is_starred: res.data.starred }));
        } catch (_) {
            toast.error('Could not update star.');
        }
    };

    const handleDelete = async (mail) => {
        try {
            await API.delete(`/mail/${mail.id}`);
            setMails(prev => prev.filter(m => m.id !== mail.id));
            setSelectedMail(null);
            toast.success('Message deleted.');
        } catch (_) {
            toast.error('Could not delete message.');
        }
    };

    const filteredMails = mails.filter(m => {
        const q = searchQuery.toLowerCase();
        const subject = (m.subject || '').toLowerCase();
        const sender = (m.sender?.name || m.recipient?.name || '').toLowerCase();
        const body = (m.body || '').toLowerCase();
        return subject.includes(q) || sender.includes(q) || body.includes(q);
    });

    const unreadCount = mails.filter(m => !m.is_read && activeTab === 'inbox').length;

    const tabs = [
        { id: 'inbox', label: 'Inbox', icon: Inbox },
        { id: 'sent', label: 'Sent', icon: Send },
        { id: 'starred', label: 'Starred', icon: Star },
    ];

    const formatTime = (dateStr) => {
        const d = new Date(dateStr);
        const now = new Date();
        const diffDays = Math.floor((now - d) / 86400000);
        if (diffDays === 0) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return d.toLocaleDateString([], { weekday: 'short' });
        return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
    };

    return (
        <div className="max-w-6xl mx-auto px-4 py-8 h-[calc(100vh-100px)] flex flex-col">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-3xl font-serif font-bold text-slate-900">Internal Mail</h1>
                    <p className="text-slate-500">Secure communications within the campus.</p>
                </div>
                <button
                    onClick={() => setShowCompose(true)}
                    className="bg-slate-900 text-white px-5 py-2.5 rounded-xl font-bold shadow-lg shadow-slate-900/20 hover:bg-slate-800 transition flex items-center"
                >
                    <Send size={18} className="mr-2" /> Compose
                </button>
            </div>

            <div className="flex-1 glass-panel rounded-3xl border border-white/60 shadow-xl shadow-amber-900/5 bg-white/70 overflow-hidden flex">

                {/* Sidebar */}
                <div className="w-64 bg-slate-50/50 border-r border-slate-100 p-4 hidden md:flex flex-col">
                    {tabs.map(({ id, label, icon: Icon }) => (
                        <button
                            key={id}
                            onClick={() => setActiveTab(id)}
                            className={`flex items-center space-x-3 px-4 py-3 rounded-xl font-bold transition-all mb-2 ${activeTab === id ? 'bg-amber-100 text-amber-800' : 'text-slate-600 hover:bg-white hover:shadow-sm'}`}
                        >
                            <Icon size={20} />
                            <span>{label}</span>
                            {id === 'inbox' && unreadCount > 0 && (
                                <span className="ml-auto bg-amber-200 text-amber-900 text-xs px-2 py-0.5 rounded-full">{unreadCount}</span>
                            )}
                        </button>
                    ))}
                    <div className="mt-auto pt-4 border-t border-slate-100">
                        <button
                            onClick={fetchMails}
                            className="flex items-center space-x-2 px-4 py-2.5 rounded-xl text-slate-500 hover:bg-white hover:text-slate-800 w-full transition text-sm font-medium"
                        >
                            <RefreshCw size={16} /> <span>Refresh</span>
                        </button>
                    </div>
                </div>

                {/* Mail List */}
                <div className={`${selectedMail ? 'hidden lg:block' : 'block'} w-full lg:w-96 border-r border-slate-100 bg-white/50 overflow-y-auto flex flex-col`}>
                    {/* Search */}
                    <div className="p-4 border-b border-slate-100 sticky top-0 bg-white/80 backdrop-blur-sm z-10">
                        <div className="relative">
                            <Search className="absolute left-3 top-3 text-slate-400" size={18} />
                            <input
                                type="text"
                                placeholder="Search mail..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="w-full bg-slate-100 border-none rounded-xl pl-10 py-2.5 text-sm focus:ring-2 focus:ring-amber-500/20 outline-none"
                            />
                        </div>
                    </div>

                    {/* Mobile tabs */}
                    <div className="flex md:hidden border-b border-slate-100 px-2 pt-2 gap-1">
                        {tabs.map(({ id, label, icon: Icon }) => (
                            <button key={id} onClick={() => setActiveTab(id)}
                                className={`flex-1 flex flex-col items-center py-2 rounded-xl text-xs font-bold transition ${activeTab === id ? 'bg-amber-100 text-amber-800' : 'text-slate-500'}`}>
                                <Icon size={16} className="mb-0.5" />{label}
                            </button>
                        ))}
                    </div>

                    {loading ? (
                        <div className="flex-1 flex items-center justify-center py-20">
                            <Loader2 className="animate-spin text-amber-500" size={32} />
                        </div>
                    ) : filteredMails.length === 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center py-20 text-slate-400">
                            <Mail size={40} className="mb-3 opacity-30" />
                            <p className="font-medium text-sm">No messages found</p>
                        </div>
                    ) : (
                        <div>
                            {filteredMails.map(mail => (
                                <div
                                    key={mail.id}
                                    onClick={() => handleSelect(mail)}
                                    className={`p-4 border-b border-slate-50 cursor-pointer hover:bg-amber-50/50 transition-colors relative ${selectedMail?.id === mail.id ? 'bg-amber-50 border-l-4 border-l-amber-500' : ''} ${!mail.is_read && activeTab === 'inbox' ? 'bg-slate-50' : ''}`}
                                >
                                    <div className="flex justify-between items-start mb-1">
                                        <h4 className={`text-sm pr-6 ${!mail.is_read && activeTab === 'inbox' ? 'font-bold text-slate-900' : 'font-medium text-slate-700'}`}>
                                            {activeTab === 'sent' ? (mail.recipient?.name || mail.recipient?.email || 'Unknown') : (mail.sender?.name || 'System')}
                                        </h4>
                                        <span className="text-xs text-slate-400 whitespace-nowrap">{formatTime(mail.created_at)}</span>
                                    </div>
                                    <div className={`text-sm mb-1 truncate ${!mail.is_read && activeTab === 'inbox' ? 'font-bold text-slate-800' : 'text-slate-600'}`}>{mail.subject}</div>
                                    <p className="text-xs text-slate-500 truncate">{mail.body}</p>
                                    {mail.is_starred && <Star size={12} className="absolute top-3 right-3 text-amber-400 fill-amber-400" />}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Mail Content */}
                <div className={`${!selectedMail ? 'hidden lg:flex' : 'flex'} flex-1 flex-col bg-white overflow-hidden relative`}>
                    {selectedMail ? (
                        <>
                            <div className="p-6 border-b border-slate-100 flex justify-between items-start bg-slate-50/30">
                                <div>
                                    <button onClick={() => setSelectedMail(null)} className="lg:hidden mb-2 text-slate-500 flex items-center text-sm font-bold">
                                        <ChevronRight className="rotate-180 mr-1" size={16} /> Back
                                    </button>
                                    <h2 className="text-2xl font-serif font-bold text-slate-900 mb-2">{selectedMail.subject}</h2>
                                    <div className="flex items-center space-x-3">
                                        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-bold shadow-sm">
                                            {(selectedMail.sender?.name || 'S')[0]}
                                        </div>
                                        <div>
                                            <div className="font-bold text-slate-800 text-sm">
                                                {selectedMail.sender?.name || 'System'}
                                                <span className="text-slate-400 font-normal ml-1">&lt;{selectedMail.sender?.email || 'system@campus.edu'}&gt;</span>
                                            </div>
                                            <div className="text-xs text-slate-500">
                                                to {selectedMail.recipient?.name || 'me'} · {new Date(selectedMail.created_at).toLocaleString()}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button onClick={(e) => handleStar(e, selectedMail)} className={`p-2 rounded-xl transition ${selectedMail.is_starred ? 'text-amber-500 bg-amber-50' : 'text-slate-400 hover:text-amber-500 hover:bg-amber-50'}`} title="Star">
                                        {selectedMail.is_starred ? <Star size={18} className="fill-current" /> : <Star size={18} />}
                                    </button>
                                    <button onClick={() => handleDelete(selectedMail)} className="p-2 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 transition" title="Delete">
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>

                            <div className="p-8 overflow-y-auto flex-1 text-slate-700 leading-relaxed custom-scrollbar">
                                <div className="whitespace-pre-wrap">{selectedMail.body}</div>
                            </div>

                            <div className="p-4 border-t border-slate-100 bg-slate-50/30">
                                {!showReply ? (
                                    <button
                                        onClick={() => { setShowReply(true); setShowCompose(true); }}
                                        className="border border-slate-200 text-slate-600 px-6 py-2 rounded-xl font-bold hover:bg-white hover:border-amber-300 hover:text-amber-700 transition shadow-sm"
                                    >
                                        Reply
                                    </button>
                                ) : null}
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
                            <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                                <Mail size={48} className="opacity-50" />
                            </div>
                            <p className="font-medium">Select a mail to read</p>
                        </div>
                    )}
                </div>
            </div>

            <ComposeMailModal
                isOpen={showCompose}
                onClose={() => { setShowCompose(false); setShowReply(false); }}
                recipientEmail={showReply ? (selectedMail?.sender?.email || '') : ''}
                recipientName={showReply ? (selectedMail?.sender?.name || '') : ''}
                replySubject={showReply ? `Re: ${selectedMail?.subject || ''}` : ''}
                onSent={() => { fetchMails(); setShowCompose(false); setShowReply(false); }}
            />
        </div>
    );
};

export default MailPage;
