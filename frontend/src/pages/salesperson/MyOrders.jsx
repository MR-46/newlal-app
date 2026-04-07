import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import { TopNav, BottomNav, OrderCard, Loading, Empty, BottomSheet, Icon, StatusBadge } from '../../components';
import { downloadOrderPDF, shareOnWhatsApp } from '../../utils/pdf';

export default function MyOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);

  const statuses = ['all','placed','confirmed','in_progress','ready','dispatched'];

  const fetchOrders = async () => {
    try {
      const params = new URLSearchParams({ limit: 100 });
      if (filter !== 'all') params.append('status', filter);
      if (search) params.append('search', search);
      const { data } = await api.get(`/orders?${params}`);
      setOrders(data.orders);
    } catch { toast.error('Failed to load orders'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchOrders(); }, [filter, search]);

  const markReady = async (id) => {
    try {
      await api.patch(`/orders/${id}/status`, { status: 'ready' });
      toast.success('Marked as Ready');
      fetchOrders();
      setSelected(null);
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  };

  const deleteOrder = async (id) => {
    if (!window.confirm('Move this order to recycle bin?')) return;
    try {
      await api.delete(`/orders/${id}`);
      toast.success('Order deleted');
      fetchOrders();
      setSelected(null);
    } catch (err) { toast.error(err.response?.data?.error || 'Cannot delete'); }
  };

  return (
    <div>
      <TopNav title="My Orders" />
      <div className="page page-with-header">
        <div className="search-bar">
          <span className="search-icon">{Icon.search}</span>
          <input placeholder="Search orders..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        <div className="pill-tabs">
          {statuses.map(s => (
            <span key={s} className={`pill${filter===s?' active':''}`} onClick={() => setFilter(s)}>
              {s.charAt(0).toUpperCase() + s.slice(1).replace('_',' ')}
            </span>
          ))}
        </div>

        {loading ? <Loading /> : orders.length === 0 ? <Empty text="No orders found" /> : (
          orders.map(order => (
            <OrderCard key={order._id} order={order} onClick={() => setSelected(order)}
              actions={
                <>
                  {['placed','confirmed'].includes(order.status) && (
                    <button className="btn btn-outline btn-sm" onClick={() => markReady(order._id)}>Mark Ready</button>
                  )}
                  <button className="btn btn-ghost btn-sm" onClick={() => shareOnWhatsApp(order)} title="WhatsApp"
                    style={{ color: '#25D366' }}>{Icon.whatsapp}</button>
                  {['placed','pending_confirmation','confirmed'].includes(order.status) && (
                    <button className="btn btn-ghost btn-sm" style={{ color:'var(--danger)' }} onClick={() => deleteOrder(order._id)}>
                      {Icon.trash}
                    </button>
                  )}
                </>
              }
            />
          ))
        )}
      </div>

      {/* Order detail sheet */}
      <BottomSheet open={!!selected} onClose={() => setSelected(null)} title={selected?.orderId}>
        {selected && (
          <>
            <StatusBadge status={selected.status} urgent={selected.isUrgent} />
            <div style={{ marginTop:12, marginBottom:12, fontSize:14, color:'var(--text-secondary)' }}>
              <div>Customer: <strong>{selected.customerName}</strong></div>
              {selected.customerMobile && <div>Mobile: {selected.customerMobile}</div>}
              {selected.remarks && <div>Note: {selected.remarks}</div>}
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
              <button className="btn btn-outline btn-sm" onClick={() => downloadOrderPDF(selected)}>{Icon.download} PDF</button>
              <button className="btn btn-sm" style={{ background:'#25D366', color:'#fff' }} onClick={() => shareOnWhatsApp(selected)}>{Icon.whatsapp} WhatsApp</button>
              {['placed','pending_confirmation','confirmed'].includes(selected.status) && (
                <button className="btn btn-danger btn-sm" onClick={() => deleteOrder(selected._id)}>{Icon.trash} Delete</button>
              )}
            </div>
          </>
        )}
      </BottomSheet>

      <BottomNav />
    </div>
  );
}
