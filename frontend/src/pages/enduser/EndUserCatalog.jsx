// EndUserCatalog.jsx - Vehicle-first navigation
import { useState, useEffect, useCallback, useRef } from 'react';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import { TopNav, BottomNav, BottomSheet, Icon } from '../../components';

export function EndUserCatalog() {
  const [step, setStep] = useState('vehicle'); // 'vehicle' | 'items'
  const [vehicles, setVehicles] = useState([]);
  const [selectedVehicle, setSelectedVehicle] = useState('');
  const [q, setQ] = useState('');
  const [results, setResults] = useState([]);
  const [cart, setCart] = useState([]);
  const [showItem, setShowItem] = useState(null);
  const [showCart, setShowCart] = useState(false);
  const [qty, setQty] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [address, setAddress] = useState('');
  const debounce = useRef(null);

  useEffect(() => {
    api.get('/items/meta/vehicles').then(r => setVehicles(r.data));
  }, []);

  const search = useCallback((val, vehicle) => {
    clearTimeout(debounce.current);
    if (!val.trim() && !vehicle) { setResults([]); return; }
    debounce.current = setTimeout(async () => {
      try {
        const params = new URLSearchParams({ limit: 40 });
        if (val) params.append('q', val);
        if (vehicle) params.append('vehicle', vehicle);
        const { data } = await api.get(`/items?${params}`);
        setResults(data.items);
      } catch {}
    }, 250);
  }, []);

  useEffect(() => { search(q, selectedVehicle); }, [q, selectedVehicle, search]);

  const addToCart = () => {
    setCart(prev => {
      const ex = prev.find(c => c.itemId === showItem._id);
      if (ex) return prev.map(c => c.itemId===showItem._id?{...c,qty:c.qty+qty}:c);
      return [...prev, { itemId:showItem._id, itemName:showItem.itemName, vehicle:showItem.vehicle, brand:showItem.brand, partNumber:showItem.partNumber, unit:showItem.unit, mrp:showItem.mrp, qty }];
    });
    setShowItem(null);
    toast.success('Added to cart');
  };

  const placeOrder = async () => {
    if (!cart.length) return toast.error('Cart is empty');
    setSubmitting(true);
    try {
      await api.post('/orders', {
        items: cart.map(c => ({ itemId: c.itemId, qty: c.qty })),
        orderType: 'b2c',
        remarks: address,
      });
      toast.success('Order placed! We will contact you for payment.');
      setCart([]);
      setShowCart(false);
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
    finally { setSubmitting(false); }
  };

  return (
    <div>
      <TopNav title="Shop" />
      <div className="page page-with-header">
        {/* Vehicle filter */}
        <div className="section-title">Filter by Vehicle</div>
        <div style={{ display:'flex', gap:8, overflowX:'auto', paddingBottom:8, marginBottom:8, scrollbarWidth:'none' }}>
          <span className={`pill${!selectedVehicle?' active':''}`} onClick={() => { setSelectedVehicle(''); setStep('vehicle'); }}>All</span>
          {vehicles.map(v => (
            <span key={v} className={`pill${selectedVehicle===v?' active':''}`} onClick={() => { setSelectedVehicle(v); setStep('items'); }}>
              {v}
            </span>
          ))}
        </div>

        <div className="search-bar">
          <span className="search-icon">{Icon.search}</span>
          <input placeholder="Search parts..." value={q} onChange={e => setQ(e.target.value)} />
        </div>

        {results.map(item => (
          <div key={item._id} className="card card-sm" style={{ marginBottom:8, display:'flex', alignItems:'center', gap:12 }}>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:13, fontWeight:700 }}>{item.itemName}</div>
              <div style={{ fontSize:12, color:'var(--text-muted)' }}>
                {[item.vehicle, item.brand, item.partNumber].filter(Boolean).join(' · ')}
              </div>
              {item.mrp && <div style={{ fontSize:13, color:'var(--success)', fontWeight:700, marginTop:2 }}>₹{item.mrp}</div>}
            </div>
            <button className="btn btn-primary btn-sm" style={{ borderRadius:'50%', width:32, height:32, padding:0, flexShrink:0 }}
              onClick={() => { setShowItem(item); setQty(1); }}>{Icon.plus}</button>
          </div>
        ))}

        {!q && !selectedVehicle && <div className="empty-state"><p>Select a vehicle or search for parts</p></div>}
      </div>

      {cart.length > 0 && (
        <div className="cart-badge" onClick={() => setShowCart(true)}>
          {Icon.cart} {cart.length} items · Place Order
        </div>
      )}

      <BottomSheet open={!!showItem} onClose={() => setShowItem(null)} title="Add to Cart">
        {showItem && (
          <>
            <div className="card" style={{ marginBottom:16 }}>
              <div style={{ fontWeight:700 }}>{showItem.itemName}</div>
              <div style={{ fontSize:13, color:'var(--text-muted)', marginTop:4 }}>{[showItem.vehicle, showItem.brand].filter(Boolean).join(' · ')}</div>
              {showItem.mrp && <div style={{ fontSize:16, fontWeight:800, color:'var(--success)', marginTop:8 }}>₹{showItem.mrp} / {showItem.unit}</div>}
            </div>
            <div className="qty-controls" style={{ justifyContent:'center', marginBottom:20 }}>
              <button className="qty-btn minus" onClick={() => setQty(q => Math.max(1,q-1))}>−</button>
              <span className="qty-value" style={{ fontSize:24, minWidth:48 }}>{qty}</span>
              <button className="qty-btn" onClick={() => setQty(q => q+1)}>+</button>
            </div>
            <button className="btn btn-primary btn-full btn-lg" onClick={addToCart}>Add to Cart</button>
          </>
        )}
      </BottomSheet>

      <BottomSheet open={showCart} onClose={() => setShowCart(false)} title="My Cart">
        {cart.map(item => (
          <div key={item.itemId} className="item-row">
            <div className="item-info">
              <div className="item-name">{item.itemName}</div>
              <div className="item-sub">{item.vehicle || item.brand || ''}</div>
              {item.mrp && <div style={{ fontSize:12, color:'var(--success)', fontWeight:600 }}>₹{item.mrp × item.qty}</div>}
            </div>
            <div className="qty-controls">
              <button className="qty-btn minus" onClick={() => setCart(p => p.map(c => c.itemId===item.itemId?{...c,qty:Math.max(1,c.qty-1)}:c))}>−</button>
              <span className="qty-value">{item.qty}</span>
              <button className="qty-btn" onClick={() => setCart(p => p.map(c => c.itemId===item.itemId?{...c,qty:c.qty+1}:c))}>+</button>
            </div>
          </div>
        ))}
        <div className="form-group" style={{ marginTop:12 }}>
          <label className="form-label">Delivery Address *</label>
          <input className="form-input" placeholder="Your full delivery address" value={address} onChange={e => setAddress(e.target.value)} />
        </div>
        <div className="card" style={{ background:'var(--bg)', border:'1px solid var(--border)', marginBottom:12 }}>
          <p style={{ fontSize:13, color:'var(--text-secondary)' }}>💳 Payment via UPI after order confirmation. We will contact you on WhatsApp with payment details.</p>
        </div>
        <button className="btn btn-primary btn-full btn-lg" onClick={placeOrder} disabled={submitting}>
          {submitting ? 'Placing...' : 'Place Order'}
        </button>
      </BottomSheet>

      <BottomNav />
    </div>
  );
}

export default EndUserCatalog;
