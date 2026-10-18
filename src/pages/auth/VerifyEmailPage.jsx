import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { 
    ArrowLeft, 
    CheckCircle2, 
    Send, 
    Loader2, 
    ShieldCheck, 
    RefreshCw, 
    AlertCircle, 
    MailCheck 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import API from '../../services/api';

const VerifyEmailPage = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const emailParam = searchParams.get('email') || '';

    const [email, setEmail] = useState(emailParam);
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [loading, setLoading] = useState(false);
    const [resendLoading, setResendLoading] = useState(false);
    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');
    const [isVerified, setIsVerified] = useState(false);
    const [stage, setStage] = useState('email');
    const [accountStatus, setAccountStatus] = useState('Pending');

    // 60-second countdown timer for Resend OTP
    const [timer, setTimer] = useState(60);
    const [canResend, setCanResend] = useState(false);

    useEffect(() => {
        let interval = null;
        if (timer > 0) {
            interval = setInterval(() => {
                setTimer((prev) => prev - 1);
            }, 1000);
        } else {
            setCanResend(true);
            if (interval) clearInterval(interval);
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [timer]);

    const formatTimer = (seconds) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    };

    // Handle OTP Box Change
    const handleOtpChange = (element, index) => {
        if (isNaN(element.value)) return false;

        const updatedOtp = [...otp];
        updatedOtp[index] = element.value;
        setOtp(updatedOtp);

        // Focus next input box automatically
        if (element.value && element.nextSibling) {
            element.nextSibling.focus();
        }
    };

    const handleOtpKeyDown = (e, index) => {
        if (e.key === 'Backspace' && !otp[index] && e.target.previousSibling) {
            e.target.previousSibling.focus();
        }
    };

    // Submit Verification
    const handleVerifyEmail = async (e) => {
        if (e) e.preventDefault();
        const otpCode = otp.join('');
        if (!email.trim()) {
            setError('Please enter your email address.');
            return;
        }
        if (otpCode.length !== 6) {
            setError('Please enter the complete 6-digit verification code.');
            return;
        }

        setLoading(true);
        setError('');
        try {
            const endpoint = stage === 'email' ? '/auth/verify-email' : '/auth/verify-phone';
            const res = await API.post(endpoint, {
                email: email.trim().toLowerCase(),
                otp: otpCode
            });
            if (stage === 'email') {
                setStage('phone');
                setOtp(['', '', '', '', '', '']);
                setTimer(60);
                setCanResend(false);
                await API.post('/auth/send-phone-otp', { email: email.trim().toLowerCase() });
                setSuccessMsg('Email verified. A mobile OTP has been sent to your registered phone number.');
            } else {
                setAccountStatus(res.data.account_status || 'Pending');
                setIsVerified(true);
                setSuccessMsg(res.data.message || 'Registration verification completed.');
            }
        } catch (err) {
            console.error(err);
            if (String(err.config?.url || '').includes('send-phone-otp')) {
                setStage('phone');
                setTimer(0);
                setCanResend(true);
            }
            setError(err.response?.data?.detail || 'Verification failed. Invalid or expired OTP code.');
        } finally {
            setLoading(false);
        }
    };

    // Resend OTP
    const handleResendOTP = async () => {
        if (!email.trim()) {
            setError('Please provide your email address to resend OTP.');
            return;
        }

        setResendLoading(true);
        setError('');
        setSuccessMsg('');
        try {
            const endpoint = stage === 'email' ? '/auth/resend-verification-otp' : '/auth/send-phone-otp';
            const res = await API.post(endpoint, {
                email: email.trim().toLowerCase()
            });
            setTimer(60);
            setCanResend(false);
            setOtp(['', '', '', '', '', '']);
            setSuccessMsg(res.data.message || 'A fresh 6-digit verification code has been sent to your email.');
        } catch (err) {
            console.error(err);
            setError(err.response?.data?.detail || 'Failed to resend verification OTP. Please try again.');
        } finally {
            setResendLoading(false);
        }
    };

    return (
        <div className="min-h-[calc(100vh-80px)] flex">
            {/* Left Side Branding */}
            <div className="hidden lg:flex w-1/2 bg-slate-900 relative items-center justify-center overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-amber-600/30 via-slate-900/80 to-slate-950 z-10" />
                <img 
                    src="https://images.unsplash.com/photo-1523240795612-9a054b0db644?q=80&w=2070&auto=format&fit=crop" 
                    alt="Campus InfoHub Community" 
                    className="absolute inset-0 w-full h-full object-cover opacity-40 scale-105"
                />
                <div className="relative z-20 max-w-md px-12 text-white">
                    <div className="h-16 w-16 bg-gradient-to-br from-amber-400 to-amber-600 rounded-2xl flex items-center justify-center mb-8 shadow-2xl shadow-amber-500/30">
                        <MailCheck size={36} className="text-white" />
                    </div>
                    <h2 className="text-5xl font-serif font-bold mb-6 leading-tight">Verify & Connect.</h2>
                    <p className="text-lg text-slate-300 font-light leading-relaxed">
                        Campus InfoHub requires email verification to keep our academic community safe, trusted, and authentic.
                    </p>
                </div>
            </div>

            {/* Right Side Verification Form */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-6 md:p-12 bg-white">
                <div className="max-w-md w-full">
                    <div className="mb-8">
                        <Link to="/login" className="inline-flex items-center text-xs font-bold text-slate-400 hover:text-slate-600 mb-6 transition">
                            <ArrowLeft size={16} className="mr-1" /> Back to Sign In
                        </Link>
                        
                        <div className="h-12 w-12 bg-amber-50 rounded-2xl flex items-center justify-center mb-4 text-amber-600 border border-amber-100">
                            <ShieldCheck size={24} />
                        </div>
                        <h1 className="text-3xl font-serif font-bold text-slate-800">{stage === 'email' ? 'Email Verification' : 'Mobile Verification'}</h1>
                        <p className="text-sm text-slate-500 mt-2 font-medium">
                            We sent a 6-digit OTP verification code to <strong className="text-slate-800">{stage === 'email' ? (email || 'your email') : 'your registered mobile number'}</strong>. Code expires in 5 minutes.
                        </p>
                    </div>

                    {/* Banners */}
                    <AnimatePresence mode="wait">
                        {error && (
                            <motion.div 
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-100 flex items-start space-x-3 text-rose-700 text-sm font-medium"
                            >
                                <AlertCircle size={18} className="shrink-0 mt-0.5" />
                                <span>{error}</span>
                            </motion.div>
                        )}

                        {successMsg && (
                            <motion.div 
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-100 flex items-start space-x-3 text-emerald-700 text-sm font-medium"
                            >
                                <CheckCircle2 size={18} className="shrink-0 mt-0.5" />
                                <span>{successMsg}</span>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {isVerified ? (
                        <div className="py-8 text-center space-y-4">
                            <div className="h-20 w-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
                                <CheckCircle2 size={44} className="animate-bounce" />
                            </div>
                            <h3 className="text-2xl font-serif font-bold text-slate-800">Verification Complete!</h3>
                            <p className="text-slate-500 text-sm max-w-sm mx-auto leading-relaxed">
                                {accountStatus === 'Active'
                                    ? 'Your student account is active. You can sign in now.'
                                    : <>Your email and mobile are verified. Your alumni registration is <strong className="text-amber-600 font-semibold">pending administrator approval</strong>.</>}
                            </p>
                            <div className="pt-2">
                                <Link 
                                    to="/login"
                                    className="inline-block px-8 py-3.5 bg-slate-900 hover:bg-black text-white font-bold text-sm rounded-xl shadow-lg transition"
                                >
                                    Return to Sign In
                                </Link>
                            </div>
                        </div>
                    ) : (
                        <form onSubmit={handleVerifyEmail} className="space-y-6">
                            {!emailParam && (
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Registered Email Address</label>
                                    <input 
                                        type="email" 
                                        required 
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="you@example.com"
                                        className="w-full rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white shadow-sm focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 p-3.5 transition-all outline-none font-medium text-slate-800 text-sm" 
                                    />
                                </div>
                            )}

                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-3 text-center uppercase tracking-wider">Enter 6-Digit Verification Code</label>
                                <div className="flex justify-between gap-2 mb-4">
                                    {otp.map((data, index) => (
                                        <input
                                            key={index}
                                            type="text"
                                            maxLength="1"
                                            value={data}
                                            onChange={(e) => handleOtpChange(e.target, index)}
                                            onKeyDown={(e) => handleOtpKeyDown(e, index)}
                                            onFocus={(e) => e.target.select()}
                                            className="w-12 h-14 text-center text-xl font-mono font-bold bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none transition text-slate-800"
                                        />
                                    ))}
                                </div>

                                <div className="flex items-center justify-between text-xs mt-4">
                                    <span className="text-slate-500 font-medium">
                                        Resend available in: <strong className="text-amber-700 font-mono">{formatTimer(timer)}</strong>
                                    </span>
                                    <button
                                        type="button"
                                        disabled={!canResend || resendLoading}
                                        onClick={handleResendOTP}
                                        className="text-amber-600 hover:text-amber-700 font-bold disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 transition"
                                    >
                                        <RefreshCw size={13} className={resendLoading ? 'animate-spin' : ''} />
                                        <span>Resend OTP</span>
                                    </button>
                                </div>
                            </div>

                            <button 
                                type="submit" 
                                disabled={otp.join('').length !== 6 || loading}
                                className="w-full flex justify-center items-center py-3.5 px-4 rounded-xl shadow-lg shadow-amber-500/30 text-sm font-bold text-white bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:-translate-y-0.5 active:translate-y-0"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 size={18} className="mr-2 animate-spin" />
                                        <span>Verifying OTP...</span>
                                    </>
                                ) : (
                                    <>
                                        <span>{stage === 'email' ? 'Verify Email' : 'Verify Mobile'}</span>
                                        <Send size={16} className="ml-2" />
                                    </>
                                )}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};

export default VerifyEmailPage;
