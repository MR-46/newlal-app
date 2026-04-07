// AdminCustomers.jsx
import { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import { TopNav, BottomNav, Loading, Empty, BottomSheet, Icon } from '../../components';

export function AdminCustomers() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const fileRef = useRef();

  const fetch = async () => {
    try {
      const { data } = await api.get(`/customers?search=${q}`);
      setCustomers(data);
    } catch { } finally { setLoading(false); }
  };
  useEffect(() => { fetch(); }, [q]);

  const uploadFile = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    const fd = new FormData(); fd.append('file', file);
    try {
      const { data } = await api.post('/customers/upload', fd);
      toast.success(`${data.added} added, ${data.skipped} skipped`);
      fetch();
    } catch (err) { toast.error(err.response?.data?.error || 'Upload failed'); }
    finally { e.target.value = ''; }
  };

  return (
    <div>
      <TopNav title="Customers" right={
        <div style={{ display:'flex', gap:6 }}>
          <input type="file" ref={fileRef} accept=".xlsx,.csv" style={{ display:'none' }} onChange={uploadFile} />
          <button className="btn btn-outline btn-sm" onClick={() => fileRef.current?.click()}>{Icon.upload} Upload</button>
        </div>
      } />
      <div className="page page-with-header">
        <div className="search-bar">
          <span className="search-icon">{Icon.search}</span>
          <input placeholder="Search customers..." value={q} onChange={e => setQ(e.target.value)} />
        </div>
        {loading ? <Loading /> : customers.length === 0 ? <Empty text="No customers" /> : (
          customers.map(c => (
            <div key={c._id} className="card card-sm" style={{ marginBottom:8 }}>
              <div style={{ fontWeight:700, fontSize:14 }}>{c.name}</div>
              <div style={{ fontSize:12, color:'var(--text-muted)' }}>
                {c.mobile && `📞 ${c.mobile}`} {c.city && `· 📍 ${c.city}`}
              </div>
              <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:2 }}>
                {c.totalOrders} orders · Last: {c.lastOrderDate ? new Date(c.lastOrderDate).toLocaleDateString('en-IN') : 'Never'}
              </div>
            </div>
          ))
        )}
      </div>
      <BottomNav />
    </div>
  );
}

export default AdminCustomers;
