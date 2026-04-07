// RetailerOrders.jsx
import { useState, useEffect } from 'react';
import api from '../../utils/api';
import { TopNav, BottomNav, Loading, Empty, OrderCard, Icon } from '../../components';

export function RetailerOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    const fetch = async () => {
      try {
        const p = filter !== 'all' ? `?status=${filter}` : '';
        const { data } = await api.get(`/orders${p}&limit=50`);
        setOrders(data.orders);
      } catch {} finally { setLoading(false); }
    };
    fetch();
  }, [filter]);

  return (
    <div>
      <TopNav title="My Orders" />
      <div className="page page-with-header">
        <div className="pill-tabs">
          {['all','pending_confirmation','confirmed','in_progress','ready','dispatched'].map(s => (
            <span key={s} className={`pill${filter===s?' active':''}`} onClick={() => setFilter(s)}>
              {s.replace(/_/g,' ')}
            </span>
          ))}
        </div>
        {loading ? <Loading /> : orders.length === 0 ? <Empty text="No orders yet" /> : (
          orders.map(o => <OrderCard key={o._id} order={o} />)
        )}
      </div>
      <BottomNav />
    </div>
  );
}

export default RetailerOrders;
