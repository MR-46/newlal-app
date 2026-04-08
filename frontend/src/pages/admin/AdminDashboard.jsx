import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import { TopNav, BottomNav, Loading, Icon } from '../../components';

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [perf, setPerf] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([
      api.get('/dashboard'),
      api.get('/dashboard/performance'),
    ]).then(([d, p]) => {
      setData(d.data);
      setPerf(p.data);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <><TopNav title="Dashboard" /><div className="page page-with-header"><Loading /></div><BottomNav /></>;

  return (
    <div>
      <TopNav title="Dashboard" />
      <div className="page page-with-header">

        {/* Stats */}
        <div className="stats-grid">
          <div className="stat-card" style={{ cursor:'pointer' }} onClick={() => navigate('/orders/mine')}>
            <div className="stat-value">{data?.todayOrders ?? 0}</div>
            <div className="stat-label">Orders Today</div>
          </div>
          <div className="stat-card">
            <div className="stat-value" style={{ color:'var(--warning)' }}>{data?.pendingB2B ?? 0}</div>
            <div className="stat-label">B2B Pending</div>
          </div>
          <div className="stat-card">
            <div className="stat-value" style={{ color:'var(--info)' }}>{data?.pendingB2C ?? 0}</div>
            <div className="stat-label">B2C Pending</div>
          </div>
          <div className="stat-card" style={{ cursor:'pointer' }} onClick={() => navigate('/admin/reports')}>
            <div className="stat-value" style={{ color:'var(--success)' }}>↗</div>
            <div className="stat-label">Reports</div>
          </div>
        </div>

        {/* Quick links */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:16 }}>
          {[
            { label:'📦 Item Master', to:'/admin/items' },
            { label:'👥 Customers', to:'/admin/customers' },
            { label:'👤 Users', to:'/admin/users' },
            { label:'📊 Reports', to:'/admin/reports' },
            { label:'🗑️ Recycle Bin', to:'/admin/bin' },
          ].map(l => (
            <button key={l.to} className="btn btn-outline" onClick={() => navigate(l.to)} style={{ padding:'14px 12px', fontSize:13 }}>
              {l.label}
            </button>
          ))}
        </div>

        {/* Top selling items */}
        <div className="section-title">Top Selling Items (Last 30 Days)</div>
        <div className="card">
          {data?.topItems?.length === 0 && <div style={{ color:'var(--text-muted)', fontSize:14 }}>No data yet</div>}
          {data?.topItems?.map((item, i) => (
            <div key={i} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 0', borderBottom: i < data.topItems.length-1 ? '1px solid var(--border)' : 'none' }}>
              <div style={{ width:28, height:28, borderRadius:'50%', background:'var(--bg)', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:800, fontSize:13, color:'var(--primary)', flexShrink:0 }}>#{i+1}</div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:13, fontWeight:600, color:'var(--text)' }}>{item._id}</div>
                <div style={{ fontSize:12, color:'var(--text-muted)' }}>{item.totalQty} units sold</div>
              </div>
            </div>
          ))}
        </div>

        {/* Performance */}
        {perf?.salespersonPerformance?.length > 0 && (
          <>
            <div className="section-title">Salesperson Performance</div>
            <div className="card">
              {perf.salespersonPerformance.map((p, i) => (
                <div key={i} style={{ display:'flex', justifyContent:'space-between', padding:'8px 0', borderBottom: i < perf.salespersonPerformance.length-1 ? '1px solid var(--border)' : 'none' }}>
                  <span style={{ fontSize:14 }}>{p._id}</span>
                  <span style={{ fontSize:14, fontWeight:700, color:'var(--primary)' }}>{p.orders} orders</span>
                </div>
              ))}
            </div>
          </>
        )}

        {perf?.staffPerformance?.length > 0 && (
          <>
            <div className="section-title">Staff Performance</div>
            <div className="card">
              {perf.staffPerformance.map((p, i) => (
                <div key={i} style={{ display:'flex', justifyContent:'space-between', padding:'8px 0', borderBottom: i < perf.staffPerformance.length-1 ? '1px solid var(--border)' : 'none' }}>
                  <span style={{ fontSize:14 }}>{p._id}</span>
                  <span style={{ fontSize:14, fontWeight:700, color:'var(--success)' }}>{p.fulfilled} fulfilled</span>
                </div>
              ))}
            </div>
          </>
        )}

      </div>
      <BottomNav />
    </div>
  );
}
