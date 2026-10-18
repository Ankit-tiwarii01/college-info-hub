import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { Flag, X, Upload, Loader2, Image as ImageIcon, ShieldAlert, CheckCircle2, AlertTriangle } from 'lucide-react';
import API from '../services/api';

const ReportModal = ({ isOpen, onClose, initialTargetId = '', initialTargetType = 'User' }) => {
    const [targetIdentifier, setTargetIdentifier] = useState(initialTargetId);
    const [targetType, setTargetType] = useState(initialTargetType);
    const [reason, setReason] = useState('Spam / Abuse');
    const [description, setDescription] = useState('');
    const [imageUrl, setImageUrl] = useState('');
    const [imagePreview, setImagePreview] = useState(null);
    const [loading, setLoading] = useState(false);

    const [statusModal, setStatusModal] = useState({
        isOpen: false,
        type: 'success', // 'success' | 'error'
        title: '',
        message: ''
    });

    const reasons = [
        'Spam / Abuse',
        'Harassment & Bullying',
        'Fake Profile / Impersonation',
        'Inappropriate Content',
        'Scam / Fraud',
        'Other Violation'
    ];

    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) {
            toast.error('Image size should be less than 5MB.');
            return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
            setImagePreview(reader.result);
            setImageUrl(reader.result);
        };
        reader.readAsDataURL(file);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!targetIdentifier.trim()) {
            setStatusModal({
                isOpen: true,
                type: 'error',
                title: 'Missing Reported ID',
                message: 'Please enter the Target ID, Registration No, or Email to be reported.'
            });
            return;
        }
        if (!description.trim()) {
            setStatusModal({
                isOpen: true,
                type: 'error',
                title: 'Description Required',
                message: 'Please provide a detailed description explaining the issue.'
            });
            return;
        }

        setLoading(true);
        try {
            await API.post('/reports/', {
                target_identifier: targetIdentifier.trim(),
                target_type: targetType,
                reason,
                description: description.trim(),
                image_url: imageUrl || null
            });

            setStatusModal({
                isOpen: true,
                type: 'success',
                title: 'Report Submitted Successfully!',
                message: 'Thank you for keeping our platform safe. Our administrative team has received your report and will investigate it shortly.'
            });

            // Reset form fields
            setTargetIdentifier('');
            setDescription('');
            setImageUrl('');
            setImagePreview(null);
        } catch (err) {
            const errorDetail = err.response?.data?.detail 
                ? (typeof err.response.data.detail === 'string' ? err.response.data.detail : JSON.stringify(err.response.data.detail))
                : 'Failed to submit report. Please check your network connection and try again.';
            setStatusModal({
                isOpen: true,
                type: 'error',
                title: 'Submission Failed',
                message: errorDetail
            });
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <>
            <AnimatePresence>
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.9, opacity: 0 }}
                        className="bg-white rounded-3xl max-w-lg w-full p-6 md:p-8 shadow-2xl border border-slate-100 relative overflow-hidden max-h-[90vh] overflow-y-auto"
                    >
                        {/* Close Button */}
                        <button
                            onClick={onClose}
                            className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
                        >
                            <X size={20} />
                        </button>

                        {/* Header */}
                        <div className="flex items-center space-x-3 mb-6">
                            <div className="p-3 bg-rose-100 text-rose-600 rounded-2xl">
                                <Flag size={24} />
                            </div>
                            <div>
                                <h3 className="text-2xl font-serif font-bold text-slate-800">Submit Report</h3>
                                <p className="text-xs text-slate-500">Report any suspicious user ID, post, or violation to administrators</p>
                            </div>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            {/* Target Identifier */}
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">
                                    Reported ID / Email / Reg No <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={targetIdentifier}
                                    onChange={(e) => setTargetIdentifier(e.target.value)}
                                    placeholder="e.g. 2022BTCSE001 or john@example.com or Post #12"
                                    required
                                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 font-medium text-slate-800"
                                />
                            </div>

                            {/* Target Type & Reason Grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">Report Category</label>
                                    <select
                                        value={targetType}
                                        onChange={(e) => setTargetType(e.target.value)}
                                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 font-medium text-slate-800"
                                    >
                                        <option value="User">User / Account</option>
                                        <option value="Post">Post / Content</option>
                                        <option value="Job">Job Listing</option>
                                        <option value="Other">Other System Issue</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">Reason</label>
                                    <select
                                        value={reason}
                                        onChange={(e) => setReason(e.target.value)}
                                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 font-medium text-slate-800"
                                    >
                                        {reasons.map((r) => (
                                            <option key={r} value={r}>{r}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Description */}
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">
                                    Detailed Description <span className="text-rose-500">*</span>
                                </label>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    rows={3}
                                    required
                                    placeholder="Explain what happened or why this account/content is being reported..."
                                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 font-medium text-slate-800"
                                />
                            </div>

                            {/* Supporting Image Upload (Optional) */}
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">
                                    Supporting Proof / Screenshot <span className="text-slate-400 font-normal">(Optional)</span>
                                </label>

                                {imagePreview ? (
                                    <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-50 max-h-40 flex items-center justify-center p-2">
                                        <img src={imagePreview} alt="Proof Preview" className="max-h-36 object-contain rounded-lg" />
                                        <button
                                            type="button"
                                            onClick={() => { setImagePreview(null); setImageUrl(''); }}
                                            className="absolute top-2 right-2 p-1.5 bg-slate-900/80 text-white rounded-full hover:bg-black transition"
                                        >
                                            <X size={14} />
                                        </button>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        <label className="border-2 border-dashed border-slate-200 hover:border-rose-400 rounded-2xl p-4 flex flex-col items-center justify-center cursor-pointer bg-slate-50/50 hover:bg-rose-50/30 transition group">
                                            <Upload size={22} className="text-slate-400 group-hover:text-rose-500 mb-1 transition" />
                                            <span className="text-xs font-bold text-slate-600 group-hover:text-rose-600">Click to upload screenshot / image</span>
                                            <span className="text-[10px] text-slate-400 mt-0.5">PNG, JPG, WEBP up to 5MB</span>
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={handleImageUpload}
                                                className="hidden"
                                            />
                                        </label>

                                        <div className="flex items-center space-x-2">
                                            <span className="text-[11px] text-slate-400 font-medium">or paste image URL:</span>
                                            <input
                                                type="url"
                                                value={imageUrl}
                                                onChange={(e) => { setImageUrl(e.target.value); setImagePreview(e.target.value); }}
                                                placeholder="https://..."
                                                className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:border-rose-400"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Submit Button */}
                            <div className="pt-2">
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full py-3.5 px-6 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow-lg shadow-rose-600/25 transition-all flex items-center justify-center space-x-2 text-sm disabled:opacity-50"
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 size={16} className="animate-spin" />
                                            <span>Submitting Report...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Flag size={16} />
                                            <span>Submit Report to Admin</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            </AnimatePresence>

            {/* Status Feedback Popup Modal */}
            <AnimatePresence>
                {statusModal.isOpen && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className={`bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl text-center border ${
                                statusModal.type === 'success' ? 'border-emerald-100' : 'border-rose-100'
                            } relative overflow-hidden`}
                        >
                            <div className={`h-16 w-16 mx-auto mb-4 rounded-2xl flex items-center justify-center text-white shadow-lg ${
                                statusModal.type === 'success' 
                                    ? 'bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-emerald-500/20' 
                                    : 'bg-gradient-to-br from-rose-400 to-rose-600 shadow-rose-500/20'
                            }`}>
                                {statusModal.type === 'success' ? <CheckCircle2 size={36} /> : <AlertTriangle size={36} />}
                            </div>

                            <h3 className="text-2xl font-serif font-bold text-slate-800 mb-2">{statusModal.title}</h3>
                            <p className="text-slate-600 text-sm mb-6 leading-relaxed">
                                {statusModal.message}
                            </p>

                            <button
                                onClick={() => {
                                    const wasSuccess = statusModal.type === 'success';
                                    setStatusModal({ isOpen: false, type: 'success', title: '', message: '' });
                                    if (wasSuccess) {
                                        onClose();
                                    }
                                }}
                                className={`w-full py-3.5 px-6 font-bold rounded-xl shadow-lg transition-all text-sm text-white ${
                                    statusModal.type === 'success'
                                        ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 shadow-emerald-500/20'
                                        : 'bg-slate-800 hover:bg-slate-900 shadow-slate-900/20'
                                }`}
                            >
                                {statusModal.type === 'success' ? 'Done' : 'Try Again'}
                            </button>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </>
    );
};

export default ReportModal;
