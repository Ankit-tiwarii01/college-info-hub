import React, { useEffect, useState } from 'react';
import API from '../../services/api';
import { AlertOctagon, UserX, Trash2, CheckCircle, Clock, Image as ImageIcon, Eye, X, ShieldAlert, Check, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import Breadcrumbs from '../../components/Breadcrumbs';

const AdminReports = () => {
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [previewImage, setPreviewImage] = useState(null);

    useEffect(() => {
        fetchReports();
    }, []);

    const fetchReports = async () => {
        try {
            const res = await API.get('/admin/reports');
            setReports(res.data);
        } catch (err) {
            toast.error('Failed to load reports.');
        } finally {
            setLoading(false);
        }
    };

    const handleAction = async (id, action) => {
        const actionLabels = {
            dismiss: 'dismiss this report',
            delete_post: 'delete the reported content',
            ban_user: 'block/suspend the reported user account',
            resolve: 'mark this report as resolved'
        };

        if (!window.confirm(`Are you sure you want to ${actionLabels[action] || action}?`)) return;

        try {
            await API.post(`/admin/reports/${id}/action`, { action });
            toast.success(`Action '${action.replace('_', ' ')}' executed successfully.`);
            fetchReports();
        } catch (err) {
            toast.error('Action failed.', { description: err.response?.data?.detail || 'Please try again.' });
        }
    };

    const pendingReports = reports.filter(r => r.status === 'Pending');
    const resolvedReports = reports.filter(r => r.status !== 'Pending');

    return (
        <div className="max-w-6xl mx-auto space-y-4">
            {/* Navigation Breadcrumbs & Back Button */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <Breadcrumbs items={[{ label: 'Admin', path: '/admin' }, { label: 'Reports' }]} />
                <Link to="/admin" className="px-3.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 shadow-sm flex items-center gap-1.5 transition">
                    <ArrowLeft size={14} /> ← Back to Dashboard
                </Link>
            </div>

            <div className="mb-6">
                <h1 className="text-3xl font-serif font-bold text-slate-800">Moderation & User Reports</h1>
                <p className="text-slate-500 mt-1 font-medium text-sm">Review, investigate, and take action on reports submitted by students and alumni.</p>
            </div>

            {loading ? (
                <div className="p-12 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
                    Loading reports...
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-8">
                    {/* Pending Reports */}
                    <section>
                        <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center">
                            <AlertOctagon className="mr-2 text-rose-500" size={22} />
                            <span>Pending Reports ({pendingReports.length})</span>
                        </h2>

                        {pendingReports.length === 0 ? (
                            <div className="p-10 bg-white rounded-2xl border border-slate-200 text-center text-slate-400 font-medium">
                                No pending reports. All clear!
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {pendingReports.map(report => (
                                    <motion.div 
                                        layout
                                        key={report.id} 
                                        className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row gap-6 hover:border-slate-300 transition"
                                    >
                                        <div className="flex-1 space-y-3">
                                            <div className="flex items-center flex-wrap gap-2">
                                                <span className="px-2.5 py-1 bg-rose-100 text-rose-800 text-xs font-bold uppercase rounded-lg">
                                                    {report.reason}
                                                </span>
                                                <span className="px-2.5 py-1 bg-slate-100 text-slate-700 text-xs font-bold uppercase rounded-lg">
                                                    Target: {report.target_type || 'User'}
                                                </span>
                                                <span className="text-xs text-slate-400 flex items-center ml-auto">
                                                    <Clock size={12} className="mr-1" />
                                                    {new Date(report.created_at).toLocaleString()}
                                                </span>
                                            </div>

                                            <div>
                                                <h3 className="font-bold text-slate-800 text-lg">
                                                    Reported Target: <span className="text-rose-600 font-mono">{report.target_identifier || report.target_id || 'N/A'}</span>
                                                </h3>
                                                <p className="text-xs text-slate-500 mt-0.5">
                                                    Filed by: <span className="font-bold text-slate-700">{report.reporter_name || report.reporter_email || `User #${report.reporter_id}`}</span> ({report.reporter_email})
                                                </p>
                                            </div>

                                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                                <p className="text-slate-700 text-sm italic leading-relaxed">
                                                    "{report.description || 'No description provided.'}"
                                                </p>
                                            </div>

                                            {/* Supporting Image Attachment */}
                                            {report.image_url && (
                                                <div className="pt-1">
                                                    <p className="text-xs font-bold text-slate-600 mb-1 flex items-center gap-1">
                                                        <ImageIcon size={14} className="text-amber-600" /> Supporting Proof / Image:
                                                    </p>
                                                    <div 
                                                        onClick={() => setPreviewImage(report.image_url)}
                                                        className="relative w-36 h-24 rounded-xl overflow-hidden border border-slate-200 cursor-pointer group bg-slate-900"
                                                    >
                                                        <img 
                                                            src={report.image_url} 
                                                            alt="Report proof" 
                                                            className="w-full h-full object-cover group-hover:opacity-80 transition"
                                                        />
                                                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition bg-black/40 text-white">
                                                            <Eye size={20} />
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Actions */}
                                        <div className="flex flex-col space-y-2.5 justify-center min-w-[170px] border-t md:border-t-0 md:border-l border-slate-100 pt-4 md:pt-0 md:pl-6">
                                            <button 
                                                onClick={() => handleAction(report.id, 'ban_user')}
                                                className="px-4 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-black transition flex items-center justify-center space-x-1.5 shadow-sm"
                                            >
                                                <UserX size={15} />
                                                <span>Block User ID</span>
                                            </button>
                                            <button 
                                                onClick={() => handleAction(report.id, 'delete_post')}
                                                className="px-4 py-2.5 rounded-xl bg-rose-50 text-rose-700 hover:bg-rose-100 text-xs font-bold transition flex items-center justify-center space-x-1.5"
                                            >
                                                <Trash2 size={15} />
                                                <span>Delete Content</span>
                                            </button>
                                            <button 
                                                onClick={() => handleAction(report.id, 'resolve')}
                                                className="px-4 py-2.5 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-bold transition flex items-center justify-center space-x-1.5"
                                            >
                                                <Check size={15} />
                                                <span>Mark Resolved</span>
                                            </button>
                                            <button 
                                                onClick={() => handleAction(report.id, 'dismiss')}
                                                className="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-600 text-xs font-bold hover:bg-slate-200 transition"
                                            >
                                                Dismiss
                                            </button>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        )}
                    </section>

                    {/* Resolved Reports History */}
                    <section className="opacity-75 hover:opacity-100 transition-opacity">
                        <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center">
                            <CheckCircle className="mr-2 text-emerald-600" size={22} />
                            <span>Resolved History ({resolvedReports.length})</span>
                        </h2>
                        {resolvedReports.length === 0 ? (
                            <div className="p-6 bg-white rounded-2xl border border-slate-200 text-center text-slate-400 text-sm">
                                No historical reports yet.
                            </div>
                        ) : (
                            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden divide-y divide-slate-100">
                                {resolvedReports.map(report => (
                                    <div key={report.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-slate-50 transition text-xs">
                                        <div className="space-y-1">
                                            <div className="flex items-center space-x-2">
                                                <span className={`font-bold px-2 py-0.5 rounded ${report.status === 'Dismissed' ? 'bg-slate-100 text-slate-600' : 'bg-emerald-100 text-emerald-800'}`}>
                                                    {report.status}
                                                </span>
                                                <span className="font-bold text-slate-800">
                                                    Target: {report.target_identifier || report.target_id} ({report.reason})
                                                </span>
                                            </div>
                                            <p className="text-slate-500">
                                                Filed by {report.reporter_name || report.reporter_email || report.reporter_id} • Action: <span className="font-semibold text-slate-700">{report.action_taken || report.status}</span>
                                            </p>
                                        </div>
                                        <span className="text-slate-400 shrink-0 font-medium">
                                            {new Date(report.created_at).toLocaleDateString()}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>
                </div>
            )}

            {/* Supporting Image Lightbox Modal */}
            <AnimatePresence>
                {previewImage && (
                    <div 
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
                        onClick={() => setPreviewImage(null)}
                    >
                        <motion.div 
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="relative max-w-4xl max-h-[90vh] bg-slate-900 rounded-3xl overflow-hidden p-2 flex items-center justify-center"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <img src={previewImage} alt="Full Proof" className="max-h-[85vh] max-w-full object-contain rounded-2xl" />
                            <button 
                                onClick={() => setPreviewImage(null)}
                                className="absolute top-4 right-4 p-2 bg-black/60 hover:bg-black text-white rounded-full transition"
                            >
                                <X size={22} />
                            </button>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default AdminReports;
