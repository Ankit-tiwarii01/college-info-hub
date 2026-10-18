import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
    ArrowLeft, 
    KeyRound, 
    CheckCircle2, 
    Send, 
    Loader2, 
    ShieldCheck, 
    Lock, 
    Eye, 
    EyeOff, 
    RefreshCw, 
    AlertCircle, 
    Check, 
    X 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import API from '../../services/api';

const ForgotPasswordPage = () => {
    const navigate = useNavigate();

    // Flow Step: 1 = Email, 2 = Verify OTP, 3 = New Password, 4 = Success
    const [step, setStep] = useState(1);

    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const [debugOtp, setDebugOtp] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');

    // Timer for OTP countdown (5 minutes = 300 seconds)
    const [timer, setTimer] = useState(300);
    const [canResend, setCanResend] = useState(false);

    useEffect(() => {
        let interval = null;
        if (step === 2 && timer > 0) {
            interval = setInterval(() => {
                setTimer((prev) => prev - 1);
            }, 1000);
        } else if (timer === 0) {
            setCanResend(true);
            clearInterval(interval);
        }
        return () => clearInterval(interval);
    }, [step, timer]);

    const formatTimer = (seconds) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    };

    // --- STEP 1: Request OTP ---
    const handleSendOTP = async (e) => {
        if (e) e.preventDefault();
        if (!email.trim()) {
            setError('Please enter your registered email address.');
            return;
        }

        setLoading(true);
        setError('');
        try {
            const res = await API.post('/auth/forgot-password', { email: email.trim().toLowerCase() });
            setStep(2);
            setTimer(300);
            setCanResend(false);
            if (res.data.otp) {
                setDebugOtp(res.data.otp);
            }
            setSuccessMsg(res.data.message || 'If an account exists, a 6-digit OTP has been sent to your email.');
        } catch (err) {
            setError(err.response?.data?.detail || 'Failed to send OTP. Please check your connection.');
        } finally {
            setLoading(false);
        }
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

    // --- STEP 2: Verify OTP ---
    const handleVerifyOTP = async (e) => {
        e.preventDefault();
        const otpCode = otp.join('');
        if (otpCode.length !== 6) {
            setError('Please enter the complete 6-digit OTP code.');
            return;
        }

        setLoading(true);
        setError('');
        try {
            await API.post('/auth/verify-otp', {
                email: email.trim().toLowerCase(),
                otp: otpCode
            });
            setStep(3);
            setError('');
        } catch (err) {
            setError(err.response?.data?.detail || 'Invalid or expired OTP code.');
        } finally {
            setLoading(false);
        }
    };

    // --- STEP 3: Reset Password Validation & Submit ---
    const passwordRequirements = [
        { label: '8 to 16 characters in length', test: (p) => p.length >= 8 && p.length <= 16 },
        { label: 'At least one uppercase letter (A-Z)', test: (p) => /[A-Z]/.test(p) },
        { label: 'At least one lowercase letter (a-z)', test: (p) => /[a-z]/.test(p) },
        { label: 'At least one number (0-9)', test: (p) => /[0-9]/.test(p) },
        { label: 'At least one special character (!@#$%^&*)', test: (p) => /[^a-zA-Z0-9]/.test(p) }
    ];

    const isPasswordValid = passwordRequirements.every((req) => req.test(newPassword));

    const handleResetPassword = async (e) => {
        e.preventDefault();
        if (!isPasswordValid) {
            setError('Please ensure your new password satisfies all security requirements.');
            return;
        }
        if (newPassword !== confirmPassword) {
            setError('New passwords do not match.');
            return;
        }

        setLoading(true);
        setError('');
        try {
            await API.post('/auth/reset-password', {
                email: email.trim().toLowerCase(),
                otp: otp.join(''),
                new_password: newPassword
            });
            setStep(4);
        } catch (err) {
            setError(err.response?.data?.detail || 'Failed to reset password. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-[calc(100vh-80px)] flex">
            {/* Left Side Branding */}
            <div className="hidden lg:flex w-1/2 bg-slate-900 relative items-center justify-center overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-amber-600/30 via-slate-900/80 to-slate-950 z-10" />
                <img 
                    src="https://images.unsplash.com/photo-1434030216411-0b793f4b4173?q=80&w=2070&auto=format&fit=crop" 
                    alt="University Study" 
                    className="absolute inset-0 w-full h-full object-cover opacity-40 scale-105"
                />
                <div className="relative z-20 max-w-md px-12 text-white">
                    <div className="h-16 w-16 bg-gradient-to-br from-amber-400 to-amber-600 rounded-2xl flex items-center justify-center mb-8 shadow-2xl shadow-amber-500/30">
                        <ShieldCheck size={36} className="text-white" />
                    </div>
                    <h2 className="text-5xl font-serif font-bold mb-6 leading-tight">Protected & Verified.</h2>
                    <p className="text-lg text-slate-300 font-light leading-relaxed">
                        Secure email OTP verification ensures your account credentials remain safe and under your control.
                    </p>
                </div>
            </div>

            {/* Right Side Step Form */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-6 md:p-12 bg-white">
                <div className="max-w-md w-full">
                    {step < 4 && (
                        <div className="mb-8">
                            <Link to="/login" className="inline-flex items-center text-xs font-bold text-slate-400 hover:text-slate-600 mb-6 transition">
                                <ArrowLeft size={16} className="mr-1" /> Back to Sign In
                            </Link>
                            
                            {/* Step Indicator */}
                            <div className="flex items-center space-x-2 mb-6">
                                {[1, 2, 3].map((s) => (
                                    <div 
                                        key={s} 
                                        className={`h-2 flex-1 rounded-full transition-all duration-500 ${
                                            step >= s ? 'bg-gradient-to-r from-amber-500 to-amber-600' : 'bg-slate-100'
                                        }`}
                                    />
                                ))}
                            </div>

                            <div className="h-12 w-12 bg-amber-100 rounded-2xl flex items-center justify-center mb-4">
                                {step === 1 && <KeyRound size={24} className="text-amber-600" />}
                                {step === 2 && <ShieldCheck size={24} className="text-amber-600" />}
                                {step === 3 && <Lock size={24} className="text-amber-600" />}
                            </div>

                            <h1 className="text-3xl font-serif font-bold text-slate-800 mb-1">
                                {step === 1 && 'Forgot Password?'}
                                {step === 2 && 'Enter Verification Code'}
                                {step === 3 && 'Create New Password'}
                            </h1>
                            <p className="text-xs text-slate-500 font-medium">
                                {step === 1 && 'Enter your registered email address to receive a 6-digit OTP code.'}
                                {step === 2 && `We sent a 6-digit OTP code to ${email}. Code expires in 5 minutes.`}
                                {step === 3 && 'Enter a strong new password for your account below.'}
                            </p>
                        </div>
                    )}

                    {error && (
                        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6 p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-start space-x-3 text-rose-700 text-xs font-semibold">
                            <AlertCircle size={18} className="shrink-0 text-rose-500 mt-0.5" />
                            <span>{error}</span>
                        </motion.div>
                    )}

                    {/* STEP 1: Enter Email */}
                    {step === 1 && (
                        <form onSubmit={handleSendOTP} className="space-y-6">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-2">Registered Email Address</label>
                                <input 
                                    type="email" 
                                    required 
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="you@example.com"
                                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white shadow-sm focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 p-3.5 transition-all outline-none font-medium text-slate-800 text-sm" 
                                />
                            </div>

                            <button 
                                type="submit" 
                                disabled={!email || loading}
                                className="w-full flex justify-center items-center py-3.5 px-4 rounded-xl shadow-lg shadow-amber-500/30 text-sm font-bold text-white bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:-translate-y-0.5"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 size={18} className="mr-2 animate-spin" />
                                        <span>Sending OTP Code...</span>
                                    </>
                                ) : (
                                    <>
                                        <span>Send 6-Digit OTP</span>
                                        <Send size={16} className="ml-2" />
                                    </>
                                )}
                            </button>
                        </form>
                    )}

                    {/* STEP 2: Enter 6-Digit OTP */}
                    {step === 2 && (
                        <form onSubmit={handleVerifyOTP} className="space-y-6">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-3 text-center">Enter 6-Digit Verification Code</label>
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
                                        Time remaining: <strong className="text-amber-700 font-mono">{formatTimer(timer)}</strong>
                                    </span>
                                    <button
                                        type="button"
                                        disabled={!canResend || loading}
                                        onClick={handleSendOTP}
                                        className="text-amber-600 hover:text-amber-700 font-bold disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 transition"
                                    >
                                        <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
                                        <span>Resend OTP</span>
                                    </button>
                                </div>
                            </div>

                            <button 
                                type="submit" 
                                disabled={otp.join('').length !== 6 || loading}
                                className="w-full flex justify-center items-center py-3.5 px-4 rounded-xl shadow-lg shadow-amber-500/30 text-sm font-bold text-white bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 size={18} className="mr-2 animate-spin" />
                                        <span>Verifying Code...</span>
                                    </>
                                ) : (
                                    <span>Verify OTP Code</span>
                                )}
                            </button>
                        </form>
                    )}

                    {/* STEP 3: Enter New Password */}
                    {step === 3 && (
                        <form onSubmit={handleResetPassword} className="space-y-5">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">New Password</label>
                                <div className="relative">
                                    <input 
                                        type={showNewPassword ? 'text' : 'password'}
                                        required 
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        placeholder="••••••••"
                                        className="w-full rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white shadow-sm focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 p-3.5 pr-10 transition-all outline-none font-medium text-slate-800 text-sm" 
                                    />
                                    <button 
                                        type="button" 
                                        onClick={() => setShowNewPassword(!showNewPassword)}
                                        className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600 transition"
                                    >
                                        {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Confirm New Password</label>
                                <div className="relative">
                                    <input 
                                        type={showConfirmPassword ? 'text' : 'password'}
                                        required 
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        placeholder="••••••••"
                                        className="w-full rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white shadow-sm focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 p-3.5 pr-10 transition-all outline-none font-medium text-slate-800 text-sm" 
                                    />
                                    <button 
                                        type="button" 
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600 transition"
                                    >
                                        {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>

                            {/* Password Rules Checklist */}
                            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-2">
                                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">Password Requirements</p>
                                {passwordRequirements.map((req, idx) => {
                                    const met = req.test(newPassword);
                                    return (
                                        <div key={idx} className="flex items-center space-x-2 text-xs">
                                            {met ? (
                                                <Check size={14} className="text-emerald-600 shrink-0 font-bold" />
                                            ) : (
                                                <X size={14} className="text-slate-300 shrink-0" />
                                            )}
                                            <span className={met ? 'text-emerald-700 font-semibold' : 'text-slate-500'}>
                                                {req.label}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>

                            <button 
                                type="submit" 
                                disabled={!isPasswordValid || newPassword !== confirmPassword || loading}
                                className="w-full flex justify-center items-center py-3.5 px-4 rounded-xl shadow-lg shadow-amber-500/30 text-sm font-bold text-white bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 size={18} className="mr-2 animate-spin" />
                                        <span>Updating Password...</span>
                                    </>
                                ) : (
                                    <span>Save New Password</span>
                                )}
                            </button>
                        </form>
                    )}

                    {/* STEP 4: Success Screen */}
                    {step === 4 && (
                        <div className="text-center py-6">
                            <div className="h-20 w-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
                                <CheckCircle2 size={44} className="text-emerald-600 animate-bounce" />
                            </div>
                            <h2 className="text-3xl font-serif font-bold text-slate-800 mb-2">Password Changed!</h2>
                            <p className="text-slate-500 text-sm mb-8 leading-relaxed">
                                Your account password has been reset successfully. You may now sign in using your new credentials.
                            </p>
                            <button 
                                onClick={() => navigate('/login')}
                                className="w-full py-3.5 px-6 bg-slate-900 hover:bg-black text-white font-bold rounded-xl shadow-lg transition-all text-sm"
                            >
                                Back to Sign In
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ForgotPasswordPage;
