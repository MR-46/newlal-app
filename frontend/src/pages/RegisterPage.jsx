import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [role, setRole] = useState('end_user');
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name:'', mobile:'', pin:'', confirmPin:'', shopName:'', address:'', city:'', state:'', pincode:'' });

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.pin !== form.confirmPin) return toast.error('PINs do not match');
    if (form.pin.length < 4) return toast.error('PIN must be at least 4 digits');
    if (!form.name || !form.mobile) return toast.error('Name and mobile are required');
    if (role === 'new_retailer' && !form.shopName) return toast.error('Shop name is required');

    setLoading(true);
    try {
      await register({ ...form, role });
      toast.success('Registered successfully!');
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '24px 16px', minHeight: '100vh' }}>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <div style={{ fontSize: 24, fontWeight: 900, color: 'var(--primary)' }}>NEW LAL</div>
        <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Create your account</div>
      </div>

      {/* Role selector */}
      <div className="card" style={{ marginBottom: 16 }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 10 }}>I am a...</p>
        <div style={{ display: 'flex', gap: 8 }}>
          {[{ v:'end_user', label:'Individual Customer' }, { v:'new_retailer', label:'Retailer / Shop' }].map(r => (
            <button key={r.v} type="button" onClick={() => setRole(r.v)}
              className={`btn btn-full ${role === r.v ? 'btn-primary' : 'btn-outline'}`} style={{ fontSize: 13 }}>
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="card">
          <div className="form-group">
            <label className="form-label">Full Name *</label>
            <input className="form-input" placeholder="Your full name" value={form.name} onChange={set('name')} />
          </div>
          <div className="form-group">
            <label className="form-label">Mobile Number *</label>
            <input className="form-input" type="tel" placeholder="10-digit mobile" value={form.mobile} onChange={set('mobile')} />
          </div>

          {role === 'new_retailer' && (
            <div className="form-group">
              <label className="form-label">Shop Name *</label>
              <input className="form-input" placeholder="Your shop name" value={form.shopName} onChange={set('shopName')} />
            </div>
          )}
          {role === 'end_user' && (
            <div className="form-group">
              <label className="form-label">Delivery Address</label>
              <input className="form-input" placeholder="House no, street, area" value={form.address} onChange={set('address')} />
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div className="form-group">
              <label className="form-label">City *</label>
              <input className="form-input" placeholder="City" value={form.city} onChange={set('city')} />
            </div>
            <div className="form-group">
              <label className="form-label">State *</label>
              <input className="form-input" placeholder="State" value={form.state} onChange={set('state')} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Pincode *</label>
            <input className="form-input" type="tel" placeholder="6-digit pincode" value={form.pincode} onChange={set('pincode')} />
          </div>

          <div className="divider" />

          <div className="form-group">
            <label className="form-label">Set PIN (4-6 digits) *</label>
            <input className="form-input" type="password" placeholder="Create a PIN" value={form.pin} onChange={set('pin')} inputMode="numeric" maxLength={6} />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Confirm PIN *</label>
            <input className="form-input" type="password" placeholder="Repeat PIN" value={form.confirmPin} onChange={set('confirmPin')} inputMode="numeric" maxLength={6} />
          </div>
        </div>

        {role === 'new_retailer' && (
          <div className="card" style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              ℹ️ As a new retailer, you'll see our showcase products initially. Call us to unlock the full catalog and get verified.
            </p>
          </div>
        )}

        <button className="btn btn-primary btn-full btn-lg" type="submit" disabled={loading} style={{ marginTop: 8 }}>
          {loading ? 'Creating account...' : 'Create Account'}
        </button>
      </form>

      <div style={{ marginTop: 16, textAlign: 'center', fontSize: 14, color: 'var(--text-secondary)' }}>
        Already have an account? <Link to="/login" style={{ color: 'var(--primary)', fontWeight: 600 }}>Login</Link>
      </div>
    </div>
  );
}
