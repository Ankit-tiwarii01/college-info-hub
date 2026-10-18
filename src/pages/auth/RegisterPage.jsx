import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { registerUser } from '../../features/auth/authSlice';

export default function RegisterPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [form, setForm] = useState({name:'', enrollment_no:'', phone:'', email:'', password:'', confirm_password:'', course:'MCA', batch:'', section:''});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const fields = [['name','Full name'], ['enrollment_no','Enrollment number'], ['phone','Mobile number'], ['email','Email'], ['password','Password'], ['confirm_password','Confirm password'], ['course','Course'], ['batch','Batch (e.g. 2025-2027)'], ['section','Section (optional)']];
  async function submit(e) {
    e.preventDefault(); setError('');
    if (form.password !== form.confirm_password) { setError('Passwords do not match.'); return; }
    setBusy(true);
    try {
      await dispatch(registerUser(form)).unwrap();
      navigate(`/verify-email?email=${encodeURIComponent(form.email.trim().toLowerCase())}`);
    } catch (err) {
      setError(typeof err === 'string' ? err : Array.isArray(err) ? err.map(x => x.msg).join(' ') : 'Registration failed.');
    } finally { setBusy(false); }
  }
  return <div className="max-w-xl mx-auto my-12 p-8 bg-white rounded-2xl shadow-xl">
    <h1 className="text-3xl font-bold mb-2">Student registration</h1>
    <p className="text-slate-500 mb-6">Join to see updates, opportunities and posts from alumni and administrators.</p>
    {error && <p role="alert" className="text-red-600 mb-4">{error}</p>}
    <form onSubmit={submit} className="space-y-4">
      {fields.map(([key,label]) => <label key={key} className="block text-sm font-medium">{label}
        <input className="block w-full mt-1 p-3 border rounded-lg" required={key !== 'section'}
          type={key.includes('password') ? 'password' : key === 'email' ? 'email' : key === 'phone' ? 'tel' : 'text'}
          minLength={key.includes('password') ? 6 : undefined} value={form[key]}
          onChange={e => setForm({...form, [key]:e.target.value})} />
      </label>)}
      <button disabled={busy} className="w-full bg-amber-500 text-white rounded-lg py-3 font-bold disabled:opacity-50">{busy ? 'Creating account…' : 'Create student account'}</button>
    </form>
    <p className="mt-6"><Link to="/login" className="text-amber-700">Sign in</Link> · <Link to="/alumni/register" className="text-amber-700">Register as alumni</Link></p>
  </div>;
}
