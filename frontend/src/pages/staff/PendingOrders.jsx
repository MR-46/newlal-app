import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import { TopNav, BottomNav, Loading, Empty, BottomSheet, Icon, StatusBadge } from '../../components';
import { useAuth } from '../../context/AuthContext';

function FulfillSheet({ order, onClose, onUpdate }) {
  const { user } = useAuth();
  const [items, setItems] = useState(order.items.map(i => ({ ...i, pickedQty: i.pickedQty ?? i.orderedQty })));
  const [saving, setSaving] = useState(false);

  const toggleCheck = (idx) => {
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, isChecked: !it.isChecked } : it));
  };
  const toggleRestock = (idx) => {
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, isRestockNeeded: !it.isRestockNeeded } : it));
  };
  const setPickedQty = (idx, val) => {
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, pickedQty: Math.max(0, Number(val)) } : it));
  };

  const saveItems = async () => {
    setSaving(true);
    try {
      await api.patch(`/orders/${order._id}/items`, {
        itemUpdates: items.map(it => ({ itemId: it._id, isChecked: it.isChecked, pickedQty: it.pickedQty, isRestockNeeded: it.isRestockNeeded }))
      });
      toast.success('Saved');
      onUpdate();
    } catch { toast.error('Failed to save'); }
    finally { setSaving(false); }
  };

  const updateStatus = async (status) => {
    try {
      await api.patch(`/orders/${order._id}/status`, { status });
      toast.success(`Marked as ${status}`);
      onUpdate();
      onClose();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  };

  return (
    <>
      <div style={{ marginBottom: 12 }}>
        <StatusBadge status={order.status} urgent={order.isUrgent} />
        <div style={{ marginTop: 8, fontSize: 14, color: 'var(--text-secondary)' }}>
          <strong>{order.customerName}</strong>
          {order.customerMobile && ` · ${order.customerMobile}`}
        </div>
        {order.remarks && <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>📝 {order.remarks}</div>}
        {order.fulfilledByNames?.length > 0 && (
          <div style={{ fontSize: 12, color: 'var(--info)', marginTop: 4 }}>
            Being fulfilled by: {order.fulfilledByNames.join(', ')}
          </div>
        )}
      </div>

      <div className="section-title">Items to Prepare</div>
      {items.map((item, idx) => (
        <div key={idx} style={{ padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            {/* Picked checkbox */}
            <div className={`check-box${item.isChecked ? ' checked' : ''}`} onClick={() => toggleCheck(idx)} style={{ marginTop: 2 }}>
              {item.isChecked && <span style={{ width: 14, height: 14, display: 'block', color: '#fff' }}>{Icon.check}</span>}
            </div>
            <div style={{ flex: 1 }}>
              <div className={`item-name${item.isChecked ? ' check-text done' : ''}`}>{item.itemName}</div>
              <div className="item-sub">{[item.vehicle, item.brand, item.partNumber].filter(Boolean).join(' · ')}</div>
              {/* Picked qty */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Ordered: <strong>{item.orderedQty}</strong></span>
                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Picked:</span>
                <input type="number" value={item.pickedQty} min={0} max={item.orderedQty}
                  onChange={e => setPickedQty(idx, e.target.value)}
                  style={{ width: 56, padding: '4px 8px', borderRadius: 6, border: '1.5px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: 14, fontWeight: 700 }} />
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{item.unit}</span>
              </div>
              {/* Restock checkbox */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
                <div className={`check-box${item.isRestockNeeded ? ' restock' : ''}`} style={{ width: 18, height: 18 }} onClick={() => toggleRestock(idx)}>
                  {item.isRestockNeeded && <span style={{ color: '#fff', fontSize: 10, fontWeight: 700 }}>R</span>}
                </div>
                <span style={{ fontSize: 12, color: 'var(--warning)' }}>Mark for Restock</span>
              </div>
            </div>
          </div>
        </div>
      ))}

      <div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
        <button className="btn btn-outline btn-sm" onClick={saveItems} disabled={saving}>
          {saving ? 'Saving...' : '💾 Save Progress'}
        </button>
        {order.status === 'confirmed' && (
          <button className="btn btn-sm" style={{ background: 'var(--info)', color: '#fff' }}
            onClick={() => updateStatus('in_progress')}>Start Fulfilling</button>
        )}
        {order.status === 'in_progress' && (
          <>
            <button className="btn btn-sm btn-outline" onClick={() => updateStatus('confirmed')}>↩ Undo</button>
            <button className="btn btn-success btn-sm" onClick={() => updateStatus('ready')}>✓ Mark Ready</button>
          </>
        )}
        {order.status === 'ready' && (
          <>
            <button className="btn btn-sm btn-outline" onClick={() => updateStatus('in_progress')}>↩ Undo Ready</button>
            <button className="btn btn-sm" style={{ background: 'var(--secondary)', color: '#fff' }} onClick={() => updateStatus('dispatched')}>🚚 Dispatch</button>
          </>
        )}
      </div>
    </>
  );
}

export default function PendingOrders() {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  const fetch = async () => {
    try {
      const { data } = await api.get('/orders/pending');
      setOrders(data);
    } catch { toast.error('Failed'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetch(); const t = setInterval(fetch, 30000); return () => clearInterval(t); }, []);

  return (
    <div>
      <TopNav title="Pending Orders" right={
        orders.length > 0 ? <span className="badge badge-in_progress">{orders.length}</span> : null
      } />
      <div className="page page-with-header">
        {loading ? <Loading /> : orders.length === 0 ? <Empty text="No pending orders 🎉" /> : (
          orders.map(order => (
            <div key={order._id} className={`card order-card${order.isUrgent ? ' urgent' : ''}`} onClick={() => setSelected(order)}>
              <div className="order-header">
                <div>
                  <div className="order-id">{order.orderId} {order.isUrgent && <span style={{ color:'var(--danger)' }}>⚡</span>}</div>
                  <div className="order-customer">{order.customerName}</div>
                  {order.customerMobile && <div style={{ fontSize:12, color:'var(--text-muted)' }}>{order.customerMobile}</div>}
                </div>
                <div><span className={`badge badge-${order.status}`}>{order.status.replace('_',' ')}</span></div>
              </div>
              <div className="order-meta">
                <span>📦 {order.items?.length} items</span>
                <span>👤 {order.createdByName}</span>
                <span>🕐 {new Date(order.createdAt).toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' })}</span>
              </div>
            </div>
          ))
        )}
      </div>

      <BottomSheet open={!!selected} onClose={() => { setSelected(null); fetch(); }} title={selected?.orderId}>
        {selected && <FulfillSheet order={selected} onClose={() => { setSelected(null); }} onUpdate={fetch} />}
      </BottomSheet>
      <BottomNav pendingCount={orders.length} />
    </div>
  );
}
