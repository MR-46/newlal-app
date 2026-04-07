// AdminReports.jsx
import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import { TopNav, BottomNav, Loading, Icon } from '../../components';
import * as XLSX from 'xlsx';

export function AdminReports() {
  const [tab, setTab] = useState('stockout');
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const fetchReport = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (dateFrom) params.append('dateFrom', dateFrom);
      if (dateTo) params.append('dateTo', dateTo);
      const endpointMap = { stockout: '/reports/stockout', frequency: '/reports/customer-frequency', orders: '/reports/customer-orders' };
      const { data: r } = await api.get(`${endpointMap[tab]}?${params}`);
      setData(r);
    } catch { toast.error('Failed'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchReport(); }, [tab]);

  const exportXLSX = () => {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, tab);
    XLSX.writeFile(wb, `NewLal_${tab}_report.xlsx`);
  };

  return (
    <div>
      <TopNav title="Reports" right={
        <button className="btn btn-outline btn-sm" onClick={exportXLSX}>{Icon.download} Export</button>
      } />
      <div className="page page-with-header">
        <div className="tabs">
          {[['stockout','Stockout'],['frequency','Frequency'],['orders','Orders']].map(([v,l]) => (
            <div key={v} className={`tab${tab===v?' active':''}`} onClick={() => setTab(v)}>{l}</div>
          ))}
        </div>

        {/* Date filter */}
        <div style={{ display:'flex', gap:8, marginBottom:12 }}>
          <input className="form-input" type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={{ flex:1 }} />
          <input className="form-input" type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={{ flex:1 }} />
          <button className="btn btn-primary btn-sm" onClick={fetchReport}>Go</button>
        </div>

        {loading ? <Loading /> : (
          <>
            {tab === 'stockout' && data.map((r, i) => (
              <div key={i} className="card card-sm" style={{ marginBottom:8 }}>
                <div style={{ fontWeight:700, fontSize:13 }}>{r.itemName}</div>
                {r.partNumber && <div style={{ fontSize:12, color:'var(--text-muted)' }}>Part No: {r.partNumber}</div>}
                <div style={{ fontSize:12, color:'var(--danger)', marginTop:4 }}>Customers: {r.customers}</div>
              </div>
            ))}
            {tab === 'frequency' && data.map((r, i) => (
              <div key={i} style={{ display:'flex', justifyContent:'space-between', padding:'12px 0', borderBottom:'1px solid var(--border)' }}>
                <span style={{ fontSize:14 }}>{r._id}</span>
                <span style={{ fontWeight:700, color:'var(--primary)' }}>{r.orderCount} orders</span>
              </div>
            ))}
            {tab === 'orders' && data.slice(0,50).map((o, i) => (
              <div key={i} className="card card-sm" style={{ marginBottom:8 }}>
                <div style={{ display:'flex', justifyContent:'space-between' }}>
                  <span style={{ fontWeight:700, fontSize:13 }}>{o.orderId}</span>
                  <span style={{ fontSize:12, color:'var(--text-muted)' }}>{new Date(o.createdAt).toLocaleDateString('en-IN')}</span>
                </div>
                <div style={{ fontSize:12, color:'var(--text-secondary)' }}>{o.customerName} · {o.items?.length} items</div>
              </div>
            ))}
            {data.length === 0 && <div style={{ textAlign:'center', color:'var(--text-muted)', padding:40 }}>No data for selected range</div>}
          </>
        )}
      </div>
      <BottomNav />
    </div>
  );
}

export default AdminReports;
