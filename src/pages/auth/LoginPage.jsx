import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { loginUser, fetchProfile } from '../../features/auth/authSlice';
import { useNavigate, Link } from 'react-router-dom';
import { Loader2, LogIn, ArrowRight, ShieldCheck, Eye, EyeOff } from 'lucide-react';

/*
// ===== OLD STUDENT REGISTRATION/LOGIN CODE (DISABLED & PRESERVED) =====
// Student login and registration are permanently disabled.
// Preserved here strictly for backup reference.
//
// const OldStudentLoginFlow = () => {
//   return <div>Student Login Disabled</div>;
// };
// ===== END OLD STUDENT CODE =====
*/

const LoginPage = () => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading, error, isAuthenticated } = useSelector((state) => state.auth);

  useEffect(() => {
    if (isAuthenticated) {
      dispatch(fetchProfile()).then((action) => {
        const userRole = action.payload?.role?.toLowerCase();
        if (userRole === 'admin') {
          navigate('/admin');
        } else {
          navigate('/alumni/dashboard');
        }
      });
    }
  }, [isAuthenticated, navigate, dispatch]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!identifier || !password) return;
    dispatch(loginUser({ email: identifier.trim(), password }));
  };

  return (
    <div className="min-h-[calc(100vh-80px)] flex">
      {/* Left Side - Brand Image */}
      <div className="hidden lg:flex w-1/2 bg-slate-900 relative items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/20 to-slate-900/90 z-10"></div>
        <img 
          src="https://images.unsplash.com/photo-1523050854058-8df90110c9f1?q=80&w=2070&auto=format&fit=crop" 
          alt="University Campus" 
          className="absolute inset-0 w-full h-full object-cover opacity-60"
        />
        <div className="relative z-20 max-w-lg px-12 text-white">
          <div className="h-14 w-14 bg-amber-500/20 backdrop-blur-md rounded-2xl flex items-center justify-center mb-6 border border-amber-400/30">
            <ShieldCheck size={32} className="text-amber-400" />
          </div>
          <h2 className="text-5xl font-serif font-bold mb-6 leading-tight">Welcome to Campus InfoHub</h2>
          <p className="text-lg text-slate-200 font-light leading-relaxed">
            Access your account to manage campus information, engage with alumni, track vacancies, and manage community activities.
          </p>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-white">
        <div className="max-w-md w-full">
          <div className="mb-8">
            <div className="h-14 w-14 bg-gradient-to-br from-amber-400 to-amber-600 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-500/20 mb-6">
              <LogIn size={28} className="text-white" />
            </div>
            <h1 className="text-4xl font-serif font-bold text-slate-800 mb-2">Sign In</h1>
            <p className="text-slate-500 font-medium">Access your Campus InfoHub account</p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded-xl mb-6 text-sm flex items-start gap-2 shadow-sm">
              <div className="w-2 h-2 bg-red-500 rounded-full mt-1.5 shrink-0"></div>
              <span className="font-medium">{error}</span>
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">
                Email Address / Enrollment No. *
              </label>
              <input 
                type="text" 
                required 
                autoComplete="username"
                className="w-full rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white shadow-sm focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 p-3.5 transition-all outline-none font-medium text-slate-800 placeholder-slate-400" 
                value={identifier}
                placeholder="alumni@example.com or admin@university.edu.in"
                onChange={(e) => setIdentifier(e.target.value)}
              />
            </div>
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-bold text-slate-700">Password *</label>
                <Link to="/forgot-password" className="text-sm text-amber-600 hover:text-amber-700 font-bold hover:underline">Forgot?</Link>
              </div>
              <div className="relative">
                <input 
                  type={showPassword ? 'text' : 'password'} 
                  required 
                  autoComplete="current-password"
                  className="w-full rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white shadow-sm focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 p-3.5 pr-10 transition-all outline-none font-medium text-slate-800 placeholder-dots" 
                  value={password}
                  placeholder="••••••••"
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full flex justify-center items-center py-3.5 px-4 rounded-xl shadow-lg shadow-amber-500/30 text-base font-bold text-white bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 disabled:opacity-70 disabled:cursor-not-allowed transition-all transform hover:-translate-y-0.5"
            >
              {loading ? <Loader2 className="animate-spin h-5 w-5" /> : <>Sign In to Dashboard <ArrowRight size={18} className="ml-2" /></>}
            </button>
          </form>

          <div className="mt-8 text-center text-sm text-slate-500 font-medium">
            New student? <Link to="/register" className="text-amber-600 font-bold">Register as student</Link><br />Don't have an alumni account?{' '}
            <Link to="/alumni/register" className="text-amber-600 font-bold hover:text-amber-700 hover:underline">
              Register as Alumni
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
