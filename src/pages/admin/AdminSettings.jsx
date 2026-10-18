import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import API from '../../services/api';
import { applyAppearance } from '../../services/appearance';
import { logout } from '../../features/auth/authSlice';
import { 
    Save, 
    Globe, 
    Shield, 
    Bell, 
    Palette, 
    Mail, 
    Smartphone,
    Loader2,
    AlertTriangle,
    Key,
    CheckCircle2,
    Sun,
    Moon,
    Monitor,
    Eye,
    EyeOff,
    LogOut,
    ArrowLeft
} from 'lucide-react';
import { Link } from 'react-router-dom';
import Breadcrumbs from '../../components/Breadcrumbs';

const validatePasswordComplexity = (pwd) => {
    if (pwd.length < 8 || pwd.length > 16) {
        return 'New password must be between 8 and 16 characters in length.';
    }
    if (!/[A-Z]/.test(pwd)) {
        return 'New password must contain at least one uppercase letter (A-Z).';
    }
    if (!/[a-z]/.test(pwd)) {
        return 'New password must contain at least one lowercase letter (a-z).';
    }
    if (!/[0-9]/.test(pwd)) {
        return 'New password must contain at least one number (0-9).';
    }
    if (!/[^a-zA-Z0-9]/.test(pwd)) {
        return 'New password must contain at least one special character (e.g. !@#$%^&*).';
    }
    return null;
};

const AdminSettings = () => {
    const [activeTab, setActiveTab] = useState('general');
    const [isLoading, setIsLoading] = useState(false);
    const [fetchingSettings, setFetchingSettings] = useState(true);

    const [settings, setSettings] = useState({
        siteName: 'College Community Hub',
        supportEmail: 'support@collegehub.com',
        maintenanceMode: false,
        allowRegistration: true,
        emailNotifications: true,
        pushNotifications: false,
        theme: 'light',
        primaryColor: 'amber'
    });

    // Password state
    const [passwordData, setPasswordData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });
    const [isPasswordLoading, setIsPasswordLoading] = useState(false);
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    // Load settings from backend on mount
    useEffect(() => {
        API.get('/admin/settings')
            .then(res => {
                const d = res.data;
                const fetchedTheme = d.theme || 'light';
                const fetchedColor = d.primary_color || 'amber';
                setSettings({
                    siteName: d.site_name || 'College Community Hub',
                    supportEmail: d.support_email || 'support@collegehub.com',
                    maintenanceMode: !!d.maintenance_mode,
                    allowRegistration: !!d.allow_registration,
                    emailNotifications: !!d.email_notifications,
                    pushNotifications: !!d.push_notifications,
                    theme: fetchedTheme,
                    primaryColor: fetchedColor,
                });
                applyAppearance(fetchedTheme, fetchedColor);
                if (d.site_name) {
                    document.title = d.site_name;
                }
            })
            .catch(() => {
                applyAppearance('light', 'amber');
                toast.error('Could not load system settings.');
            })
            .finally(() => setFetchingSettings(false));
    }, []);

    const handleToggle = (key) => {
        setSettings(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setSettings(prev => ({ ...prev, [name]: value }));
    };

    const handleThemeSelect = (newTheme) => {
        setSettings(prev => {
            const updated = { ...prev, theme: newTheme };
            applyAppearance(updated.theme, updated.primaryColor);
            return updated;
        });
    };

    const handleColorSelect = (newColor) => {
        setSettings(prev => {
            const updated = { ...prev, primaryColor: newColor };
            applyAppearance(updated.theme, updated.primaryColor);
            return updated;
        });
    };

    const handleSave = async () => {
        setIsLoading(true);
        try {
            await API.put('/admin/settings', {
                site_name: settings.siteName,
                support_email: settings.supportEmail,
                maintenance_mode: settings.maintenanceMode,
                allow_registration: settings.allowRegistration,
                email_notifications: settings.emailNotifications,
                push_notifications: settings.pushNotifications,
                theme: settings.theme,
                primary_color: settings.primaryColor,
            });
            applyAppearance(settings.theme, settings.primaryColor);
            document.title = settings.siteName;
            toast.success('Settings saved successfully!', { description: 'Your appearance and system preferences have been updated.' });
        } catch (err) {
            toast.error('Failed to save settings.', { description: err.response?.data?.detail || 'Please try again.' });
        } finally {
            setIsLoading(false);
        }
    };

    const dispatch = useDispatch();
    const navigate = useNavigate();
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [errorModal, setErrorModal] = useState({
        isOpen: false,
        title: '',
        message: ''
    });

    const handlePasswordChange = async (e) => {
        e.preventDefault();
        
        if (!passwordData.currentPassword) {
            setErrorModal({
                isOpen: true,
                title: 'Previous Password Required',
                message: 'Please enter your previous/current password to proceed.'
            });
            toast.error('Previous password is required.');
            return;
        }

        const complexityError = validatePasswordComplexity(passwordData.newPassword);
        if (complexityError) {
            setErrorModal({
                isOpen: true,
                title: 'Password Rules Not Followed',
                message: complexityError
            });
            toast.error(complexityError);
            return;
        }

        if (passwordData.newPassword !== passwordData.confirmPassword) {
            setErrorModal({
                isOpen: true,
                title: 'Passwords Do Not Match',
                message: 'The new password and confirm password fields do not match. Please make sure both fields are identical.'
            });
            toast.error('New passwords do not match.');
            return;
        }

        setIsPasswordLoading(true);
        try {
            await API.post('/admin/change-password', {
                current_password: passwordData.currentPassword,
                new_password: passwordData.newPassword
            });
            setShowSuccessModal(true);
        } catch (err) {
            const detailMsg = err.response?.data?.detail || 'Failed to update password. Please check your inputs.';
            setErrorModal({
                isOpen: true,
                title: err.response?.status === 400 && detailMsg.toLowerCase().includes('password')
                    ? 'Incorrect Previous Password'
                    : 'Password Update Failed',
                message: detailMsg
            });
            toast.error('Failed to update password.', { description: detailMsg });
        } finally {
            setIsPasswordLoading(false);
        }
    };

    const handleModalRedirect = () => {
        dispatch(logout());
        navigate('/admin/login');
    };

    const tabs = [
        { id: 'general', label: 'General', icon: Globe },
        { id: 'security', label: 'Security', icon: Shield },
        { id: 'notifications', label: 'Notifications', icon: Bell },
        { id: 'appearance', label: 'Appearance', icon: Palette },
    ];

    if (fetchingSettings) {
        return (
            <div className="flex justify-center items-center h-64">
                <Loader2 className="animate-spin text-amber-500" size={32} />
            </div>
        );
    }

    const colorOptions = [
        { id: 'amber', name: 'Amber Gold', bg: 'bg-amber-500', activeBg: 'bg-amber-500/10 border-amber-500' },
        { id: 'indigo', name: 'Indigo Blue', bg: 'bg-indigo-500', activeBg: 'bg-indigo-500/10 border-indigo-500' },
        { id: 'emerald', name: 'Emerald Green', bg: 'bg-emerald-500', activeBg: 'bg-emerald-500/10 border-emerald-500' },
        { id: 'rose', name: 'Rose Red', bg: 'bg-rose-500', activeBg: 'bg-rose-500/10 border-rose-500' },
        { id: 'sky', name: 'Sky Cyan', bg: 'bg-sky-500', activeBg: 'bg-sky-500/10 border-sky-500' },
    ];

    const renderContent = () => {
        switch (activeTab) {
            case 'general':
                return (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700">Site Name</label>
                                <div className="relative">
                                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                    <input 
                                        type="text" 
                                        name="siteName"
                                        value={settings.siteName}
                                        onChange={handleChange}
                                        className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all font-medium text-slate-700"
                                        placeholder="e.g. College Community Hub"
                                    />
                                </div>
                                <p className="text-xs text-slate-400">The name displayed in the browser tab and navigation bar.</p>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700">Support Email</label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                    <input 
                                        type="email" 
                                        name="supportEmail"
                                        value={settings.supportEmail}
                                        onChange={handleChange}
                                        className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all font-medium text-slate-700"
                                        placeholder="e.g. support@collegehub.com"
                                    />
                                </div>
                                <p className="text-xs text-slate-400">Contact address for user support inquiries and systemic notices.</p>
                            </div>
                        </div>
                    </div>
                );
            case 'security':
                return (
                    <div className="space-y-8">
                        <div className="bg-white border border-slate-200 rounded-2xl p-5 flex items-start space-x-4 shadow-sm">
                            <div className="p-2.5 bg-amber-50 rounded-xl text-amber-600 border border-amber-100">
                                <Shield size={22} />
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center justify-between mb-1">
                                    <h4 className="font-bold text-slate-800 text-base">Public User Registration</h4>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input 
                                            type="checkbox" 
                                            checked={settings.allowRegistration}
                                            onChange={() => handleToggle('allowRegistration')}
                                            className="sr-only peer" 
                                        />
                                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-amber-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                                    </label>
                                </div>
                                <p className="text-sm text-slate-500">Allow new students/alumni to sign up. If disabled, new user registrations are blocked.</p>
                            </div>
                        </div>

                        {/* Admin Password Change Form */}
                        <div className="bg-slate-50/70 border border-slate-200 rounded-2xl p-6 shadow-sm">
                            <div className="flex items-center space-x-3 mb-4">
                                <div className="p-2 bg-slate-800 text-white rounded-lg">
                                    <Key size={18} />
                                </div>
                                <div>
                                    <h4 className="font-bold text-slate-800 text-base">Change Admin Password</h4>
                                    <p className="text-xs text-slate-500">Update your administrator account password</p>
                                </div>
                            </div>

                            {/* Password Complexity Requirements Box */}
                            <div className="mb-5 bg-amber-50/70 border border-amber-200/60 rounded-xl p-3.5 text-xs text-amber-950 leading-relaxed">
                                <p className="font-bold mb-1 flex items-center gap-1.5"><Shield size={14} className="text-amber-600" /> Password Requirements:</p>
                                <ul className="list-disc list-inside space-y-0.5 text-amber-900 font-medium pl-1">
                                    <li>8 to 16 characters long</li>
                                    <li>Mix of uppercase (A-Z) and lowercase (a-z) letters</li>
                                    <li>At least one number (0-9) and special character (!@#$%...)</li>
                                </ul>
                            </div>

                            <form onSubmit={handlePasswordChange} className="space-y-4 max-w-md">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">Previous Password</label>
                                    <div className="relative">
                                        <input 
                                            type={showCurrentPassword ? "text" : "password"}
                                            value={passwordData.currentPassword}
                                            onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                                            className="w-full pl-3 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-medium text-slate-800"
                                            placeholder="Enter previous password"
                                        />
                                        <button 
                                            type="button" 
                                            onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
                                        >
                                            {showCurrentPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                        </button>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1">New Password</label>
                                        <div className="relative">
                                            <input 
                                                type={showNewPassword ? "text" : "password"}
                                                value={passwordData.newPassword}
                                                onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                                                className="w-full pl-3 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-medium text-slate-800"
                                                placeholder="8-16 chars"
                                            />
                                            <button 
                                                type="button" 
                                                onClick={() => setShowNewPassword(!showNewPassword)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
                                            >
                                                {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                            </button>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1">Confirm New Password</label>
                                        <div className="relative">
                                            <input 
                                                type={showConfirmPassword ? "text" : "password"}
                                                value={passwordData.confirmPassword}
                                                onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                                                className="w-full pl-3 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-medium text-slate-800"
                                                placeholder="Re-enter password"
                                            />
                                            <button 
                                                type="button" 
                                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
                                            >
                                                {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                                <button
                                    type="submit"
                                    disabled={isPasswordLoading}
                                    className="flex items-center space-x-2 bg-slate-800 hover:bg-slate-900 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isPasswordLoading ? <Loader2 size={14} className="animate-spin" /> : <Key size={14} />}
                                    <span>{isPasswordLoading ? 'Updating Password...' : 'Update Password'}</span>
                                </button>
                            </form>
                        </div>
                    </div>
                );
            case 'notifications':
                return (
                    <div className="space-y-4">
                        <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm">
                            <div className="p-5 flex items-center justify-between border-b border-slate-100">
                                <div className="flex items-center space-x-3">
                                    <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
                                        <Mail size={20} />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-slate-800">Email Notifications</h4>
                                        <p className="text-xs text-slate-400 font-medium">Send system updates and administrative alerts via email</p>
                                    </div>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input 
                                        type="checkbox" 
                                        checked={settings.emailNotifications}
                                        onChange={() => handleToggle('emailNotifications')}
                                        className="sr-only peer" 
                                    />
                                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-amber-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                                </label>
                            </div>
                            <div className="p-5 flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                    <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
                                        <Smartphone size={20} />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-slate-800">Push Notifications</h4>
                                        <p className="text-xs text-slate-400 font-medium">Broadcast mobile and browser push alerts to active users</p>
                                    </div>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input 
                                        type="checkbox" 
                                        checked={settings.pushNotifications}
                                        onChange={() => handleToggle('pushNotifications')}
                                        className="sr-only peer" 
                                    />
                                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-amber-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                                </label>
                            </div>
                        </div>
                    </div>
                );
            case 'appearance':
                return (
                    <div className="space-y-8">
                         <div className="space-y-3">
                            <label className="text-sm font-bold text-slate-800 block">Theme Mode</label>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-xl">
                                {[
                                    { id: 'light', label: 'Light Mode', icon: Sun },
                                    { id: 'dark', label: 'Dark Mode', icon: Moon },
                                    { id: 'system', label: 'System Default', icon: Monitor }
                                ].map((t) => {
                                    const Icon = t.icon;
                                    const isSelected = settings.theme === t.id;
                                    return (
                                        <button 
                                            key={t.id}
                                            type="button"
                                            onClick={() => handleThemeSelect(t.id)}
                                            className={`p-4 rounded-2xl border-2 text-center transition-all flex flex-col items-center justify-center space-y-2 ${
                                                isSelected 
                                                ? 'border-amber-500 bg-amber-50/70 text-amber-900 font-bold shadow-md ring-2 ring-amber-500/20' 
                                                : 'border-slate-200 hover:border-slate-300 text-slate-600 bg-white'
                                            }`}
                                        >
                                            <Icon size={22} className={isSelected ? 'text-amber-600' : 'text-slate-400'} />
                                            <span className="text-sm font-bold">{t.label}</span>
                                            {isSelected && (
                                                <span className="text-[10px] text-amber-600 font-semibold flex items-center gap-1">
                                                    <CheckCircle2 size={12} /> Active
                                                </span>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                         </div>

                         <div className="space-y-3">
                            <label className="text-sm font-bold text-slate-800 block">Primary Accent Color</label>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                                {colorOptions.map((c) => {
                                    const isSelected = settings.primaryColor === c.id;
                                    return (
                                        <button 
                                            key={c.id}
                                            type="button"
                                            onClick={() => handleColorSelect(c.id)}
                                            className={`p-3.5 rounded-2xl border-2 flex items-center space-x-3 transition-all ${
                                                isSelected 
                                                ? 'border-amber-500 bg-amber-50/70 text-slate-900 font-bold shadow-md ring-2 ring-amber-500/20' 
                                                : 'border-slate-200 hover:border-slate-300 text-slate-600 bg-white'
                                            }`}
                                        >
                                            <div className={`w-5 h-5 rounded-full ${c.bg} shadow-sm border-2 border-white flex-shrink-0`}></div>
                                            <span className="text-xs font-bold whitespace-nowrap">{c.name}</span>
                                        </button>
                                    );
                                })}
                            </div>
                         </div>
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div className="max-w-5xl mx-auto py-2 space-y-4">
            {/* Navigation Breadcrumbs & Back Button */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <Breadcrumbs items={[{ label: 'Admin', path: '/admin' }, { label: 'Settings' }]} />
                <Link to="/admin" className="px-3.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 shadow-sm flex items-center gap-1.5 transition">
                    <ArrowLeft size={14} /> ← Back to Dashboard
                </Link>
            </div>

            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-serif font-bold text-slate-800">Settings</h1>
                    <p className="text-slate-500 mt-1">Manage system configurations and preferences</p>
                </div>
                <button 
                    onClick={handleSave}
                    disabled={isLoading}
                    className="flex items-center space-x-2 bg-gradient-to-r from-amber-500 to-amber-600 text-white px-6 py-2.5 rounded-xl font-bold shadow-lg shadow-amber-500/30 hover:shadow-amber-500/40 hover:-translate-y-0.5 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                >
                    {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                    <span>{isLoading ? 'Saving...' : 'Save Changes'}</span>
                </button>
            </div>

            <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl shadow-slate-200/50 border border-white/60 overflow-hidden">
                <div className="flex border-b border-slate-200 overflow-x-auto">
                    {tabs.map((tab) => {
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center space-x-2 px-6 py-4 font-bold text-sm transition-all whitespace-nowrap relative ${
                                    isActive ? 'text-amber-600 bg-amber-50/50' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                                }`}
                            >
                                <tab.icon size={18} />
                                <span>{tab.label}</span>
                                {isActive && (
                                    <motion.div 
                                        layoutId="activeSettingTab"
                                        className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-600"
                                    />
                                )}
                            </button>
                        )
                    })}
                </div>

                <div className="p-8 min-h-[420px]">
                    <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2 }}
                    >
                        {renderContent()}
                    </motion.div>
                </div>
            </div>

            {/* Password Changed Success Modal */}
            <AnimatePresence>
                {showSuccessModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                        <motion.div 
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl text-center border border-amber-100 relative overflow-hidden"
                        >
                            <div className="h-16 w-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
                                <CheckCircle2 size={36} />
                            </div>
                            <h3 className="text-2xl font-serif font-bold text-slate-800 mb-2">Password Changed!</h3>
                            <p className="text-slate-600 text-sm mb-6 leading-relaxed">
                                Your administrator password has been updated successfully. Please log in again using your new password.
                            </p>
                            <button
                                onClick={handleModalRedirect}
                                className="w-full py-3.5 px-6 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold rounded-xl shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center space-x-2 text-sm"
                            >
                                <LogOut size={18} />
                                <span>Go to Login Page</span>
                            </button>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Error Popup Modal */}
            <AnimatePresence>
                {errorModal.isOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                        <motion.div 
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl text-center border border-red-100 relative overflow-hidden"
                        >
                            <div className="h-16 w-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-red-400 to-red-600 flex items-center justify-center text-white shadow-lg shadow-red-500/20">
                                <AlertTriangle size={36} />
                            </div>
                            <h3 className="text-2xl font-serif font-bold text-slate-800 mb-2">{errorModal.title}</h3>
                            <p className="text-slate-600 text-sm mb-6 leading-relaxed">
                                {errorModal.message}
                            </p>
                            <button
                                onClick={() => setErrorModal({ isOpen: false, title: '', message: '' })}
                                className="w-full py-3.5 px-6 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl shadow-lg transition-all text-sm"
                            >
                                Try Again
                            </button>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default AdminSettings;
