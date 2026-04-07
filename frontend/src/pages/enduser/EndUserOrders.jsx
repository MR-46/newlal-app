// EndUserOrders.jsx
import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import { TopNav, BottomNav, Loading, Empty, OrderCard, BottomSheet, Icon, StatusBadge } from '../../components';

export function EndUserOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    api.get('/orders?limit=50').then(r => setOrders(r.data.orders)).catch(() => toast.error('Failed')).finally(() => setLoading(false));
  }, []);

  const cancelOrder = async (id) => {
    if (!window.confirm('Cancel this order?')) return;
    try {
      await api.patch(`/orders/${id}/status`, { status: 'cancelled' });
      toast.success('Order cancelled');
      setOrders(p => p.map(o => o._id===id?{...o,status:'cancelled'}:o));
      setSelected(null);
    } catch (err) { toast.error(err.response?.data?.error || 'Cannot cancel at this stage'); }
  };

  const whatsappCancel = (order) => {
    const text = encodeURIComponent(`Hi, I want to cancel my order ${order.orderId}. Please assist.`);
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  return (
    <div>
      <TopNav title="My Orders" />
      <div className="page page-with-header">
        {loading ? <Loading /> : orders.length === 0 ? <Empty text="No orders yet" /> : (
          orders.map(o => <OrderCard key={o._id} order={o} onClick={() => setSelected(o)} />)
        )}
      </div>

      <BottomSheet open={!!selected} onClose={() => setSelected(null)} title={selected?.orderId}>
        {selected && (
          <>
            <StatusBadge status={selected.status} />
            <div style={{ marginTop:12, marginBottom:12, fontSize:14, color:'var(--text-secondary)' }}>
              <div>Date: {new Date(selected.createdAt).toLocaleString('en-IN')}</div>
              {selected.trackingNumber && <div style={{ marginTop:4 }}>📦 Tracking: <strong>{selected.trackingNumber}</strong> ({selected.courierPartner})</div>}
            </div>
            <div className="section-title">Items</div>
            {selected.items?.map((item, i) => (
              <div key={i} className="item-row">
                <div className="item-info">
                  <div className="item-name">{item.itemName}</div>
                  <div className="item-sub">{item.vehicle || item.brand || ''}</div>
                </div>
                <span style={{ fontWeight:700 }}>×{item.orderedQty}</span>
              </div>
            ))}
            <div className="divider" />
            <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
              {['placed','pending_confirmation'].includes(selected.status) && (
                <button className="btn btn-danger btn-sm" onClick={() => cancelOrder(selected._id)}>Cancel Order</button>
              )}
              {['confirmed','in_progress','ready','dispatched','shipped'].includes(selected.status) && (
                <button className="btn btn-sm" style={{ background:'#25D366', color:'#fff' }} onClick={() => whatsappCancel(selected)}>
                  {Icon.whatsapp} Cancel via WhatsApp
                </button>
              )}
            </div>
          </>
        )}
      </BottomSheet>

      <BottomNav />
    </div>
  );
}

export default EndUserOrders;
