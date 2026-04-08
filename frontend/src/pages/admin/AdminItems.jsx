// AdminItems.jsx
import { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import { TopNav, BottomNav, Loading, Empty, BottomSheet, Icon } from '../../components';

export function AdminItems() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [uploadMode, setUploadMode] = useState('add'); // 'add' or 'replace'
  const [form, setForm] = useState({ itemName:'', vehicle:'', brand:'', partNumber:'', unit:'NOS', mrp:'', isShowcase:false });
  const fileRef = useRef();

  const fetch = async () => {
    try {
      const { data } = await api.get(`/items?q=${q}&limit=50`);
      setItems(data.items);
    } catch { toast.error('Failed'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetch(); }, [q]);

  const addItem = async () => {
    try {
      await api.post('/items', form);
      toast.success('Item added');
      setShowAdd(false);
      setForm({ itemName:'', vehicle:'', brand:'', partNumber:'', unit:'NOS', mrp:'', isShowcase:false });
      fetch();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  };

  const uploadFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    const confirm = uploadMode === 'replace' ? window.confirm('This will DELETE all existing items and replace with new file. Continue?') : true;
    if (!confirm) return;
    try {
      const endpoint = uploadMode === 'replace' ? '/items/upload/replace' : '/items/upload/add';
      const { data } = await api.post(endpoint, fd);
      toast.success(`Done: ${data.added} added, ${data.skipped || 0} skipped`);
      fetch();
    } catch (err) { toast.error(err.response?.data?.error || 'Upload failed'); }
    finally { e.target.value = ''; }
  };

  const deleteAllItems = async () => {
    if (!window.confirm('⚠️ This will permanently delete ALL items from the database. This cannot be undone. Are you sure?')) return;
    if (!window.confirm('Are you absolutely sure? All items will be deleted.')) return;
    try {
      const { data } = await api.delete('/items/master/all');
      toast.success(`Deleted ${data.deleted} items. Upload a fresh master now.`);
      fetch();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to delete'); }
  };

  return (
    <div>
      <TopNav title="Item Master" right={
        <div style={{ display:'flex', gap:6 }}>
          <button className="btn btn-danger btn-sm" onClick={deleteAllItems} title="Delete all items">🗑️ Delete All</button>
          <button className="btn btn-outline btn-sm" onClick={() => setShowUpload(true)}>{Icon.upload}</button>
          <button className="btn btn-primary btn-sm" onClick={() => setShowAdd(true)}>{Icon.plus}</button>
        </div>
      } />
      <div className="page page-with-header">
        <div className="search-bar">
          <span className="search-icon">{Icon.search}</span>
          <input placeholder="Search items..." value={q} onChange={e => setQ(e.target.value)} />
        </div>
        {loading ? <Loading /> : items.length === 0 ? <Empty text="No items" /> : (
          items.map(item => (
            <div key={item._id} className="card card-sm" style={{ marginBottom:8 }}>
              <div style={{ fontSize:13, fontWeight:700 }}>{item.itemName}</div>
              <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:2 }}>
                {[item.vehicle, item.brand, item.partNumber].filter(Boolean).join(' · ')} · {item.unit}
              </div>
              {item.isShowcase && <span className="badge badge-confirmed" style={{ marginTop:4, fontSize:10 }}>Showcase</span>}
            </div>
          ))
        )}
      </div>

      <BottomSheet open={showAdd} onClose={() => setShowAdd(false)} title="Add Item">
        {['itemName','vehicle','brand','partNumber'].map(k => (
          <div className="form-group" key={k}>
            <label className="form-label">{k.replace(/([A-Z])/g,' $1').trim()} {k==='itemName'?'*':''}</label>
            <input className="form-input" value={form[k]} onChange={e => setForm(f=>({...f,[k]:e.target.value}))} />
          </div>
        ))}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
          <div className="form-group">
            <label className="form-label">Unit</label>
            <input className="form-input" value={form.unit} onChange={e => setForm(f=>({...f,unit:e.target.value}))} />
          </div>
          <div className="form-group">
            <label className="form-label">MRP (₹)</label>
            <input className="form-input" type="number" value={form.mrp} onChange={e => setForm(f=>({...f,mrp:e.target.value}))} />
          </div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:16 }}>
          <input type="checkbox" id="showcase" checked={form.isShowcase} onChange={e => setForm(f=>({...f,isShowcase:e.target.checked}))} style={{ width:18, height:18 }} />
          <label htmlFor="showcase" style={{ fontSize:14 }}>Show to unverified retailers (Showcase)</label>
        </div>
        <button className="btn btn-primary btn-full" onClick={addItem}>Add Item</button>
      </BottomSheet>

      <BottomSheet open={showUpload} onClose={() => setShowUpload(false)} title="Upload Item Master">
        <div style={{ display:'flex', gap:8, marginBottom:16 }}>
          {['add','replace'].map(m => (
            <button key={m} className={`btn btn-full ${uploadMode===m?'btn-primary':'btn-outline'}`} style={{ fontSize:13 }} onClick={() => setUploadMode(m)}>
              {m === 'add' ? '➕ Add New Items' : '🔄 Replace All'}
            </button>
          ))}
        </div>
        {uploadMode === 'replace' && (
          <div className="card" style={{ background:'#FFF3CD', border:'1px solid #FFCA28', marginBottom:16 }}>
            <p style={{ fontSize:13, color:'#856404' }}>⚠️ This will delete ALL existing items and replace with the uploaded file.</p>
          </div>
        )}
        <div className="card" style={{ background:'var(--bg)', marginBottom:16 }}>
          <p style={{ fontSize:12, color:'var(--text-secondary)', marginBottom:8, fontWeight:600 }}>Required columns:</p>
          <p style={{ fontSize:12, color:'var(--text-muted)' }}>ORIGINAL DESCRIPTION · ITEM NAME * · VEHICLE · BRAND/GROUP · PART NUMBER · UNIT</p>
        </div>
        <input type="file" ref={fileRef} accept=".xlsx,.xls,.csv" style={{ display:'none' }} onChange={uploadFile} />
        <button className="btn btn-primary btn-full" onClick={() => fileRef.current?.click()}>
          {Icon.upload} Choose File (.xlsx / .csv)
        </button>
      </BottomSheet>

      <BottomNav />
    </div>
  );
}

export default AdminItems;
