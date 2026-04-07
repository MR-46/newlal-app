// AdminRecycleBin.jsx
import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import { TopNav, BottomNav, Loading, Empty, Icon } from '../../components';

export function AdminRecycleBin() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetch = async () => {
    try { const { data } = await api.get('/orders/bin/list'); setOrders(data); }
    catch { toast.error('Failed'); } finally { setLoading(false); }
  };
  useEffect(() => { fetch(); }, []);

  const restore = async (id) => {
    try { await api.patch(`/orders/${id}/restore`); toast.success('Restored'); fetch(); }
    catch { toast.error('Failed'); }
  };

  return (
    <div>
      <TopNav title="Recycle Bin" back />
      <div className="page page-with-header">
        {loading ? <Loading /> : orders.length === 0 ? <Empty text="Recycle bin is empty" /> : (
          orders.map(o => (
            <div key={o._id} className="card card-sm" style={{ marginBottom:8, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div>
                <div style={{ fontWeight:700, fontSize:14 }}>{o.orderId}</div>
                <div style={{ fontSize:12, color:'var(--text-muted)' }}>{o.customerName} · Deleted {new Date(o.deletedAt).toLocaleDateString('en-IN')}</div>
              </div>
              <button className="btn btn-success btn-sm" onClick={() => restore(o._id)}>Restore</button>
            </div>
          ))
        )}
      </div>
      <BottomNav />
    </div>
  );
}

export default AdminRecycleBin;
