import React, { useState } from 'react';
import { X, Send, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import API from '../services/api';
import { toast } from 'sonner';

const ComposeMailModal = ({ isOpen, onClose, recipientEmail = '', recipientName = '', replySubject = '', onSent }) => {
    const [to, setTo] = useState(recipientEmail);
    const [subject, setSubject] = useState(replySubject);
    const [body, setBody] = useState('');
    const [sending, setSending] = useState(false);

    // Reset when opened fresh (not a reply)
    React.useEffect(() => {
        if (isOpen) {
            setTo(recipientEmail);
            setSubject(replySubject);
            setBody('');
        }
    }, [isOpen, recipientEmail, replySubject]);

    const handleSend = async (e) => {
        e.preventDefault();
        if (!to.trim() || !subject.trim() || !body.trim()) return;
        setSending(true);
        try {
            await API.post('/mail/send', {
                recipient_email: to.trim(),
                subject: subject.trim(),
                body: body.trim(),
            });
            toast.success('Message sent!', { description: `Your message to "${recipientName || to}" was delivered.` });
            onSent?.();
            onClose();
        } catch (err) {
            const detail = err.response?.data?.detail || 'Failed to send message.';
            toast.error(detail);
        } finally {
            setSending(false);
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                    onClick={onClose}
                />

                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl relative z-10 overflow-hidden flex flex-col max-h-[90vh]"
                >
                    {/* Header */}
                    <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                        <h3 className="font-serif font-bold text-slate-800 text-lg">
                            {replySubject ? 'Reply' : 'New Message'}
                        </h3>
                        <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full text-slate-400 hover:text-slate-600 transition">
                            <X size={20} />
                        </button>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSend} className="flex flex-col flex-1 overflow-hidden">
                        <div className="p-6 space-y-4 overflow-y-auto flex-1">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">To (email address)</label>
                                <input
                                    type="email"
                                    placeholder="recipient@campus.edu"
                                    value={to}
                                    onChange={e => setTo(e.target.value)}
                                    required
                                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none font-medium text-slate-800 placeholder-slate-400 bg-slate-50/50 transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Subject</label>
                                <input
                                    type="text"
                                    placeholder="Enter subject..."
                                    value={subject}
                                    onChange={e => setSubject(e.target.value)}
                                    required
                                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none font-bold text-slate-800 placeholder-slate-400 bg-slate-50/50 transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Message</label>
                                <textarea
                                    rows="8"
                                    placeholder="Write your message here..."
                                    value={body}
                                    onChange={e => setBody(e.target.value)}
                                    required
                                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none resize-none text-slate-700 placeholder-slate-400 bg-slate-50/50 transition-all"
                                />
                            </div>
                        </div>

                        <div className="p-4 border-t border-slate-100 flex justify-between items-center bg-slate-50">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-5 py-2.5 text-sm font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition"
                            >
                                Discard
                            </button>
                            <button
                                type="submit"
                                disabled={sending || !to.trim() || !subject.trim() || !body.trim()}
                                className="bg-amber-500 text-white px-8 py-2.5 rounded-xl font-bold shadow-lg shadow-amber-500/20 hover:bg-amber-600 transition flex items-center transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                            >
                                {sending ? (
                                    <><Loader2 size={16} className="mr-2 animate-spin" /> Sending...</>
                                ) : (
                                    <><Send size={16} className="mr-2" /> Send Message</>
                                )}
                            </button>
                        </div>
                    </form>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default ComposeMailModal;
