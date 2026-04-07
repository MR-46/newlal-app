// ProfilePage.jsx
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { TopNav, BottomNav, Icon } from '../components';
import toast from 'react-hot-toast';

const ROLE_LABELS = { admin:'Admin', salesperson:'Salesperson', store_staff:'Store Staff', b2c_staff:'B2C Staff', existing_retailer:'Existing Retailer', new_retailer:'New Retailer', end_user:'End User' };

export default function ProfilePage() {
  const { user, logout, theme, toggleTheme } = useAuth();
  const navigate = useNavigate();
  const handleLogout = () => { logout(); navigate('/login'); toast.success('Logged out'); };

  return (
    <div>
      <TopNav title="Profile" />
      <div className="page page-with-header">
        <div className="card" style={{ textAlign:'center', padding:32 }}>
          <div style={{ width:72, height:72, borderRadius:'50%', background:'var(--primary)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 12px', fontSize:28, color:'#fff', fontWeight:800 }}>
            {user?.name?.[0]?.toUpperCase()}
          </div>
          <div style={{ fontSize:20, fontWeight:800 }}>{user?.name}</div>
          <div style={{ color:'var(--text-muted)', fontSize:14 }}>{user?.mobile}</div>
          <span className="badge badge-confirmed" style={{ marginTop:8 }}>{ROLE_LABELS[user?.role]}</span>
          {user?.shopName && <div style={{ marginTop:8, fontSize:14, color:'var(--text-secondary)' }}>🏪 {user.shopName}</div>}
          {user?.city && <div style={{ fontSize:13, color:'var(--text-muted)' }}>📍 {user.city}</div>}
        </div>

        <div className="card">
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 0' }}>
            <span style={{ fontSize:15 }}>{theme === 'dark' ? '🌙 Dark Mode' : '☀️ Light Mode'}</span>
            <div onClick={toggleTheme} style={{ width:48, height:26, borderRadius:13, background: theme==='dark'?'var(--primary)':'var(--border)', cursor:'pointer', position:'relative', transition:'background 0.2s' }}>
              <div style={{ position:'absolute', top:3, left: theme==='dark'?23:3, width:20, height:20, borderRadius:'50%', background:'#fff', transition:'left 0.2s' }} />
            </div>
          </div>
        </div>

        <button className="btn btn-danger btn-full btn-lg" onClick={handleLogout} style={{ marginTop:16 }}>
          {Icon.logout} Logout
        </button>
      </div>
      <BottomNav />
    </div>
  );
}
