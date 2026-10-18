import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { loginUser, fetchProfile } from '../../features/auth/authSlice';
import { useNavigate, Link } from 'react-router-dom';
import { Loader2, ShieldCheck } from 'lucide-react';

const AdminLoginPage = () => {
  const [email, setEmail] = useState('admin@collegehub.com');
  const [password, setPassword] = useState('admin123'); // Pre-filled for convenience as requested
  
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading, error, isAuthenticated } = useSelector((state) => state.auth);

  useEffect(() => {
    if (isAuthenticated) {
        dispatch(fetchProfile()).then((action) => {
            if (action.payload?.role === 'admin') {
                navigate('/admin');
            } else {
                // If logged in but not admin, maybe redirect to feed
                 navigate('/feed');
            }
        });
    }
  }, [isAuthenticated, navigate, dispatch]);

  const handleSubmit = (e) => {
    e.preventDefault();
    dispatch(loginUser({ email, password }));
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-12 px-4 bg-gray-50">
      <div className="bg-white p-8 md:p-10 rounded-2xl shadow-xl w-full max-w-md border-t-4 border-secondary-900">
        <div className="text-center mb-10">
             <div className="h-14 w-14 bg-secondary-900 rounded-xl flex items-center justify-center shadow-lg shadow-secondary-900/30 mx-auto mb-4">
                <ShieldCheck size={28} className="text-white" />
             </div>
            <h2 className="text-3xl font-serif font-bold text-gray-800">Admin Portal</h2>
            <p className="text-gray-500 mt-2">Secure access for administrators</p>
        </div>

        {error && <div className="bg-red-50 border border-red-100 text-red-600 p-4 rounded-lg mb-6 text-sm">Login Failed. Please check credentials.</div>}
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Email Address</label>
            <input 
              type="email" 
              required 
              className="w-full rounded-lg border-gray-300 shadow-sm focus:border-secondary-900 focus:ring-1 focus:ring-secondary-900 p-2.5 border" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Password</label>
            <input 
              type="password" 
              required 
              className="w-full rounded-lg border-gray-300 shadow-sm focus:border-secondary-900 focus:ring-1 focus:ring-secondary-900 p-2.5 border" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-lg shadow-secondary-900/30 text-base font-bold text-white bg-secondary-900 hover:bg-black focus:outline-none disabled:opacity-50 transition-all transform hover:-translate-y-0.5"
          >
            {loading ? <Loader2 className="animate-spin h-5 w-5" /> : 'Login to Dashboard'}
          </button>
        </form>
        <div className="mt-8 text-center text-sm">
           <Link to="/login" className="text-secondary-700 hover:underline font-medium">Back to Student Information System</Link>
        </div>
      </div>
    </div>
  );
};

export default AdminLoginPage;
