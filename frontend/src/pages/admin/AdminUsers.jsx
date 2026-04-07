// AdminUsers.jsx
import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import { TopNav, BottomNav, Loading, Empty, BottomSheet, Icon } from '../../components';

export function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState('all');
  const [showAdd, setShowAdd] = useState(false);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({ name:'', mobile:'', password:'', role:'salesperson', shopName:'', city:'', state:'', pincode:'' });

  const ROLES = ['admin','salesperson','store_staff','b2c_staff','existing_retailer','new_retailer','end_user'];
  const ROLE_LABELS = { admin:'Admin', salesperson:'Salesperson', store_staff:'Store Staff', b2c_staff:'B2C Staff', existing_retailer:'Existing Retailer', new_retailer:'New Retailer', end_user:'End User' };

  const fetch = async () => {
    try {
      const params = roleFilter !== 'all' ? `?role=${roleFilter}` : '';
      const { data } = await api.get(`/users${params}`);
      setUsers(data);
    } catch { toast.error('Failed'); }
    finally { setLoading(false); }
  };
  useEffect(() => { fetch(); }, [roleFilter]);

  const createUser = async () => {
    try {
      await api.post('/users', form);
      toast.success('User created');
      setShowAdd(false);
      setForm({ name:'', mobile:'', password:'', role:'salesperson', shopName:'', city:'', state:'', pincode:'' });
      fetch();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  };

  const updateStatus = async (id, action) => {
    try {
      await api.patch(`/users/${id}/status`, { action });
      toast.success('Updated');
      fetch();
      setSelected(null);
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  };

  const convertRetailer = async (id) => {
    const pw = prompt('Set a password for this retailer:');
    if (!pw) return;
    try {
      await api.post(`/users/${id}/convert`, { password: pw });
      toast.success('Converted to Existing Retailer');
      fetch();
      setSelected(null);
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  };

  const ROLE_COLORS = { admin:'var(--primary)', salesperson:'var(--info)', store_staff:'var(--warning)', b2c_staff:'var(--accent)', existing_retailer:'var(--success)', new_retailer:'#8E44AD', end_user:'var(--text-muted)' };

  return (
    <div>
      <TopNav title="User Management" right={<button className="btn btn-primary btn-sm" onClick={() => setShowAdd(true)}>{Icon.plus}</button>} />
      <div className="page page-with-header">
        <div className="pill-tabs">
          {['all',...ROLES].map(r => (
            <span key={r} className={`pill${roleFilter===r?' active':''}`} onClick={() => setRoleFilter(r)}>
              {ROLE_LABELS[r] || 'All'}
            </span>
          ))}
        </div>
        {loading ? <Loading /> : users.length === 0 ? <Empty text="No users" /> : (
          users.map(u => (
            <div key={u._id} className="card card-sm" style={{ marginBottom:8, cursor:'pointer', opacity: u.isActive?1:0.6 }} onClick={() => setSelected(u)}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <div>
                  <div style={{ fontSize:14, fontWeight:700 }}>{u.name}</div>
                  <div style={{ fontSize:12, color:'var(--text-muted)' }}>{u.mobile}</div>
                </div>
                <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:4 }}>
                  <span style={{ fontSize:11, fontWeight:700, color: ROLE_COLORS[u.role] || 'var(--text)' }}>
                    {ROLE_LABELS[u.role]}
                  </span>
                  {u.isBlacklisted && <span className="badge badge-cancelled" style={{ fontSize:10 }}>Blacklisted</span>}
                  {!u.isActive && !u.isBlacklisted && <span className="badge badge-pending_confirmation" style={{ fontSize:10 }}>Inactive</span>}
                  {u.catalogUnlocked && u.role === 'new_retailer' && <span className="badge badge-confirmed" style={{ fontSize:10 }}>Unlocked</span>}
                </div>
              </div>
              {u.shopName && <div style={{ fontSize:12, color:'var(--text-secondary)', marginTop:2 }}>🏪 {u.shopName} · {u.city}</div>}
            </div>
          ))
        )}
      </div>

      {/* Create user */}
      <BottomSheet open={showAdd} onClose={() => setShowAdd(false)} title="Create User">
        {['name','mobile'].map(k => (
          <div className="form-group" key={k}>
            <label className="form-label">{k.charAt(0).toUpperCase()+k.slice(1)} *</label>
            <input className="form-input" value={form[k]} onChange={e => setForm(f=>({...f,[k]:e.target.value}))} />
          </div>
        ))}
        <div className="form-group">
          <label className="form-label">Role *</label>
          <select className="form-input form-select" value={form.role} onChange={e => setForm(f=>({...f,role:e.target.value}))}>
            {ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Password / PIN *</label>
          <input className="form-input" type="password" value={form.password} onChange={e => setForm(f=>({...f,password:e.target.value}))} />
        </div>
        {['existing_retailer','new_retailer'].includes(form.role) && (
          <div className="form-group">
            <label className="form-label">Shop Name</label>
            <input className="form-input" value={form.shopName} onChange={e => setForm(f=>({...f,shopName:e.target.value}))} />
          </div>
        )}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
          {['city','state','pincode'].map(k => (
            <div className="form-group" key={k}>
              <label className="form-label">{k.charAt(0).toUpperCase()+k.slice(1)}</label>
              <input className="form-input" value={form[k]} onChange={e => setForm(f=>({...f,[k]:e.target.value}))} />
            </div>
          ))}
        </div>
        <button className="btn btn-primary btn-full" onClick={createUser}>Create User</button>
      </BottomSheet>

      {/* User detail / actions */}
      <BottomSheet open={!!selected} onClose={() => setSelected(null)} title={selected?.name}>
        {selected && (
          <>
            <div style={{ marginBottom:16, fontSize:14, color:'var(--text-secondary)' }}>
              <div>Mobile: {selected.mobile}</div>
              <div>Role: {ROLE_LABELS[selected.role]}</div>
              {selected.shopName && <div>Shop: {selected.shopName}</div>}
              {selected.city && <div>City: {selected.city}, {selected.state}</div>}
              <div>Status: {selected.isBlacklisted?'Blacklisted':selected.isActive?'Active':'Inactive'}</div>
            </div>
            <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
              {!selected.isActive && !selected.isBlacklisted && (
                <button className="btn btn-success btn-sm" onClick={() => updateStatus(selected._id,'activate')}>✓ Activate</button>
              )}
              {selected.isActive && !selected.isBlacklisted && (
                <button className="btn btn-outline btn-sm" onClick={() => updateStatus(selected._id,'deactivate')}>Deactivate</button>
              )}
              {!selected.isBlacklisted && (
                <button className="btn btn-danger btn-sm" onClick={() => updateStatus(selected._id,'blacklist')}>🚫 Blacklist</button>
              )}
              {selected.isBlacklisted && (
                <button className="btn btn-success btn-sm" onClick={() => updateStatus(selected._id,'activate')}>Remove Blacklist</button>
              )}
              {selected.role === 'new_retailer' && !selected.catalogUnlocked && (
                <button className="btn btn-sm" style={{ background:'#8E44AD', color:'#fff' }} onClick={() => updateStatus(selected._id,'unlock_catalog')}>🔓 Unlock Catalog</button>
              )}
              {selected.role === 'new_retailer' && (
                <button className="btn btn-sm btn-primary" onClick={() => convertRetailer(selected._id)}>⭐ Convert to Retailer</button>
              )}
            </div>
          </>
        )}
      </BottomSheet>
      <BottomNav />
    </div>
  );
}

export default AdminUsers;
