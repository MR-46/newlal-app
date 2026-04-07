import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import { TopNav, BottomNav, Loading, Empty, OrderCard, Icon } from '../../components';

export default function AllOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetch = async () => {
      try {
        const params = new URLSearchParams({ limit: 100 });
        if (filter !== 'all') params.append('status', filter);
        if (search) params.append('search', search);
        const { data } = await api.get(`/orders?${params}`);
        setOrders(data.orders);
      } catch { toast.error('Failed'); }
      finally { setLoading(false); }
    };
    fetch();
  }, [filter, search]);

  return (
    <div>
      <TopNav title="All Orders" />
      <div className="page page-with-header">
        <div className="search-bar">
          <span className="search-icon">{Icon.search}</span>
          <input placeholder="Search orders..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="pill-tabs">
          {['all','pending_confirmation','confirmed','in_progress','ready','dispatched'].map(s => (
            <span key={s} className={`pill${filter===s?' active':''}`} onClick={() => setFilter(s)}>
              {s.replace(/_/g,' ')}
            </span>
          ))}
        </div>
        {loading ? <Loading /> : orders.length === 0 ? <Empty text="No orders" /> : (
          orders.map(o => <OrderCard key={o._id} order={o} />)
        )}
      </div>
      <BottomNav />
    </div>
  );
}
