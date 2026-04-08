import { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import { TopNav, BottomNav, Loading, Empty, BottomSheet, Icon } from '../../components';

// ── Progress Overlay ──────────────────────────────────────────────────────────
function ProgressOverlay({ phase, uploadPct, itemCount }) {
  // phase: 'uploading' | 'processing' | 'done'
  const steps = [
    { key: 'uploading',   label: 'Uploading file to server' },
    { key: 'processing',  label: 'Replacing item master'    },
  ];

  return (
    <div style={{
      position:'fixed', inset:0, background:'rgba(0,0,0,0.6)',
      display:'flex', alignItems:'center', justifyContent:'center',
      zIndex:9999, padding:24,
    }}>
      <div style={{
        background:'var(--card)', borderRadius:20, padding:'28px 24px',
        width:'100%', maxWidth:360, boxShadow:'0 20px 60px rgba(0,0,0,0.3)',
      }}>
        {/* Title */}
        <div style={{ fontSize:17, fontWeight:700, marginBottom:4, color:'var(--text)' }}>
          Replacing Item Master
        </div>
        <div style={{ fontSize:13, color:'var(--text-secondary)', marginBottom:24 }}>
          Do not close or refresh the app
        </div>

        {/* Steps */}
        {steps.map((step, idx) => {
          const stepPhase = step.key;
          const isCurrent = phase === stepPhase;
          const isDone    = (phase === 'processing' && stepPhase === 'uploading') || phase === 'done';
          const isPending = (phase === 'uploading' && stepPhase === 'processing');

          return (
            <div key={step.key} style={{ marginBottom: idx === 0 ? 20 : 0 }}>
              {/* Step header */}
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
                <div style={{
                  width:24, height:24, borderRadius:'50%', flexShrink:0,
                  display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:700,
                  background: isDone ? 'var(--success)' : isCurrent ? 'var(--primary)' : 'var(--border)',
                  color: isDone || isCurrent ? '#fff' : 'var(--text-muted)',
                  transition:'background 0.3s',
                }}>
                  {isDone ? '✓' : idx + 1}
                </div>
                <div style={{
                  fontSize:14, fontWeight:600,
                  color: isPending ? 'var(--text-muted)' : 'var(--text)',
                }}>
                  {step.label}
                </div>
                {isCurrent && stepPhase === 'uploading' && (
                  <div style={{ marginLeft:'auto', fontSize:13, fontWeight:700, color:'var(--primary)' }}>
                    {uploadPct}%
                  </div>
                )}
                {isCurrent && stepPhase === 'processing' && itemCount > 0 && (
                  <div style={{ marginLeft:'auto', fontSize:12, color:'var(--text-muted)' }}>
                    {itemCount.toLocaleString()} items
                  </div>
                )}
              </div>

              {/* Progress bar */}
              {isCurrent && (
                <div style={{
                  height:8, background:'var(--border)', borderRadius:4, overflow:'hidden', marginLeft:34,
                }}>
                  {stepPhase === 'uploading' ? (
                    <div style={{
                      height:'100%', background:'var(--primary)', borderRadius:4,
                      width: `${uploadPct}%`, transition:'width 0.3s ease',
                    }} />
                  ) : (
                    // Indeterminate animated bar for server processing
                    <div style={{
                      height:'100%', background:'var(--primary)', borderRadius:4,
                      width:'40%',
                      animation:'slide 1.4s ease-in-out infinite',
                    }} />
                  )}
                </div>
              )}
              {isDone && (
                <div style={{ height:8, background:'var(--success)', borderRadius:4, marginLeft:34, opacity:0.4 }} />
              )}
              {isPending && (
                <div style={{ height:8, background:'var(--border)', borderRadius:4, marginLeft:34 }} />
              )}
            </div>
          );
        })}

        {/* Tip */}
        <div style={{ marginTop:24, padding:'10px 12px', background:'var(--bg)', borderRadius:10 }}>
          <div style={{ fontSize:12, color:'var(--text-muted)', lineHeight:1.6 }}>
            💡 Large files with 10,000+ items may take 30–60 seconds. This is normal.
          </div>
        </div>
      </div>

      <style>{`
        @keyframes slide {
          0%   { transform: translateX(-100%); }
          100% { transform: translateX(350%); }
        }
      `}</style>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export function AdminItems() {
  const [items, setItems]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [total, setTotal]         = useState(0);
  const [q, setQ]                 = useState('');
  const [showAdd, setShowAdd]     = useState(false);
  const [busy, setBusy]           = useState(false);
  const [phase, setPhase]         = useState('');       // 'uploading' | 'processing'
  const [uploadPct, setUploadPct] = useState(0);
  const [itemCount, setItemCount] = useState(0);
  const [form, setForm]           = useState({ itemName:'', vehicle:'', brand:'', partNumber:'', unit:'NOS', isShowcase:false });
  const replaceRef = useRef();

  const fetchItems = async () => {
    try {
      const { data } = await api.get(`/items?q=${encodeURIComponent(q)}&limit=50`);
      setItems(data.items);
      setTotal(data.total);
    } catch { toast.error('Failed to load items'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchItems(); }, [q]);

  // ── Replace Master ────────────────────────────────────────────────────────
  const handleReplacePick = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    e.target.value = '';
    const ok = window.confirm(
      `REPLACE ITEM MASTER\n\nThis will:\n1. Delete ALL existing items (${total.toLocaleString()})\n2. Upload "${file.name}" as new master\n\nContinue?`
    );
    if (!ok) return;
    replaceMaster(file);
  };

  const replaceMaster = async (file) => {
    setBusy(true);
    setUploadPct(0);
    setPhase('uploading');

    try {
      const fd = new FormData();
      fd.append('file', file);

      const { data } = await api.post('/items/upload/replace', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 300000,   // 5 min
        onUploadProgress: (evt) => {
          if (evt.total) {
            const pct = Math.min(99, Math.round((evt.loaded * 100) / evt.total));
            setUploadPct(pct);
            // Switch to processing phase once file is fully uploaded
            if (pct >= 99) {
              setPhase('processing');
              setItemCount(0);
            }
          }
        },
      });

      setUploadPct(100);
      setItemCount(data.added);
      toast.success(`✅ ${data.added.toLocaleString()} items loaded successfully!`);
      setQ('');
      fetchItems();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Upload failed. Please try again.');
    } finally {
      setBusy(false);
      setPhase('');
      setUploadPct(0);
    }
  };

  // ── Delete All ────────────────────────────────────────────────────────────
  const deleteAll = async () => {
    if (!window.confirm(`Delete ALL ${total.toLocaleString()} items?`)) return;
    if (!window.confirm('This cannot be undone. Confirm?')) return;
    setBusy(true);
    setPhase('processing');
    try {
      const { data } = await api.delete('/items/master/all');
      toast.success(`Deleted ${data.deleted} items.`);
      setItems([]);
      setTotal(0);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Delete failed');
    } finally {
      setBusy(false);
      setPhase('');
    }
  };

  // ── Add single item ───────────────────────────────────────────────────────
  const addItem = async () => {
    if (!form.itemName) return toast.error('Item name required');
    try {
      await api.post('/items', form);
      toast.success('Item added');
      setShowAdd(false);
      setForm({ itemName:'', vehicle:'', brand:'', partNumber:'', unit:'NOS', isShowcase:false });
      fetchItems();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  };

  return (
    <div>
      {busy && <ProgressOverlay phase={phase} uploadPct={uploadPct} itemCount={itemCount} />}

      <TopNav title={`Item Master${total ? ` (${total.toLocaleString()})` : ''}`} right={
        <button className="btn btn-primary btn-sm" onClick={() => setShowAdd(true)} disabled={busy}>{Icon.plus}</button>
      } />

      <div className="page page-with-header">

        {/* Replace Master — primary action */}
        <div className="card" style={{ marginBottom:16, borderLeft:'4px solid var(--primary)', borderRadius:'0 12px 12px 0' }}>
          <div style={{ fontSize:14, fontWeight:700, marginBottom:4 }}>Replace Item Master</div>
          <div style={{ fontSize:12, color:'var(--text-secondary)', marginBottom:12, lineHeight:1.6 }}>
            Deletes all existing items and loads fresh from Excel. Use this to fix duplicates or upload a new master.
          </div>
          <input type="file" ref={replaceRef} accept=".xlsx,.xls,.csv" style={{ display:'none' }} onChange={handleReplacePick} />
          <button className="btn btn-primary btn-full" onClick={() => replaceRef.current?.click()} disabled={busy}>
            {Icon.upload} Choose Excel & Replace All
          </button>
        </div>

        {/* Delete all */}
        {total > 0 && (
          <div style={{ marginBottom:16, textAlign:'center' }}>
            <button className="btn btn-danger btn-sm" onClick={deleteAll} disabled={busy}>
              🗑️ Delete All {total.toLocaleString()} Items
            </button>
          </div>
        )}

        {/* Search */}
        <div className="search-bar">
          <span className="search-icon">{Icon.search}</span>
          <input placeholder="Search items..." value={q} onChange={e => setQ(e.target.value)} disabled={busy} />
        </div>

        {/* Column reference */}
        <div className="card" style={{ background:'var(--bg)', marginBottom:12 }}>
          <div style={{ fontSize:11, color:'var(--text-muted)', fontFamily:'monospace', lineHeight:1.8 }}>
            Required columns: ORIGINAL DESCRIPTION · ITEM NAME* · VEHICLE · BRAND/GROUP · PART NUMBER · UNIT
          </div>
        </div>

        {loading ? <Loading /> : items.length === 0 ? (
          <Empty text={q ? 'No items found' : 'No items yet — upload your master above'} />
        ) : (
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

      {/* Add single item */}
      <BottomSheet open={showAdd} onClose={() => setShowAdd(false)} title="Add Single Item">
        {['itemName','vehicle','brand','partNumber'].map(k => (
          <div className="form-group" key={k}>
            <label className="form-label">{k === 'itemName' ? 'Item Name *' : k.replace(/([A-Z])/g,' $1').trim()}</label>
            <input className="form-input" value={form[k]} onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))} />
          </div>
        ))}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
          <div className="form-group">
            <label className="form-label">Unit</label>
            <input className="form-input" value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))} />
          </div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:16 }}>
          <input type="checkbox" id="showcase" checked={form.isShowcase}
            onChange={e => setForm(f => ({ ...f, isShowcase: e.target.checked }))} style={{ width:18, height:18 }} />
          <label htmlFor="showcase" style={{ fontSize:14 }}>Showcase (visible to unverified retailers)</label>
        </div>
        <button className="btn btn-primary btn-full" onClick={addItem}>Add Item</button>
      </BottomSheet>

      <BottomNav />
    </div>
  );
}

export default AdminItems;
