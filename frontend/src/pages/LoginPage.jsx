import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!mobile || !password) return toast.error('Enter mobile and password/PIN');
    setLoading(true);
    try {
      const user = await login(mobile, password);
      toast.success(`Welcome, ${user.name}!`);
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <img src="/logo.png" alt="New Lal" className="login-logo" onError={e => e.target.style.display = 'none'} />
      <div className="login-title">NEW LAL</div>
      <div className="login-subtitle">Order Management System</div>

      <form onSubmit={handleLogin} style={{ width: '100%', maxWidth: 360 }}>
        <div className="card" style={{ padding: 24 }}>
          <div className="form-group">
            <label className="form-label">Mobile Number</label>
            <input className="form-input" type="tel" placeholder="Enter mobile number" value={mobile} onChange={e => setMobile(e.target.value)} autoComplete="tel" />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Password / PIN</label>
            <div className="input-group">
              <input className="form-input" type={showPass ? 'text' : 'password'} placeholder="Password or PIN" value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" />
              <button type="button" className="btn btn-outline btn-sm" onClick={() => setShowPass(s => !s)} style={{ flexShrink: 0 }}>
                {showPass ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>
        </div>

        <button className="btn btn-primary btn-full btn-lg" type="submit" disabled={loading} style={{ marginTop: 12 }}>
          {loading ? 'Logging in...' : 'Login'}
        </button>
      </form>

      <div style={{ marginTop: 24, textAlign: 'center', fontSize: 14, color: 'var(--text-secondary)' }}>
        New customer or retailer?{' '}
        <Link to="/register" style={{ color: 'var(--primary)', fontWeight: 600 }}>Register here</Link>
      </div>
    </div>
  );
}
