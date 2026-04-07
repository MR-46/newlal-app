// RetailerCatalog.jsx
import { useState, useEffect, useCallback, useRef } from 'react';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import { TopNav, BottomNav, BottomSheet, Icon } from '../../components';
import { useAuth } from '../../context/AuthContext';

export function RetailerCatalog() {
  const { user } = useAuth();
  const [q, setQ] = useState('');
  const [results, setResults] = useState([]);
  const [cart, setCart] = useState([]);
  const [showCart, setShowCart] = useState(false);
  const [showItem, setShowItem] = useState(null);
  const [qty, setQty] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [remarks, setRemarks] = useState('');
  const isNewRetailer = user?.role === 'new_retailer';
  const isUnlocked = user?.catalogUnlocked;
  const debounce = useRef(null);

  const search = useCallback((val) => {
    clearTimeout(debounce.current);
    if (!val.trim()) { setResults([]); return; }
    debounce.current = setTimeout(async () => {
      try {
        const { data } = await api.get(`/items?q=${encodeURIComponent(val)}&limit=40`);
        setResults(data.items);
      } catch {}
    }, 250);
  }, []);

  useEffect(() => { search(q); }, [q, search]);

  const addToCart = () => {
    if (!showItem) return;
    setCart(prev => {
      const ex = prev.find(c => c.itemId === showItem._id);
      if (ex) return prev.map(c => c.itemId === showItem._id ? { ...c, qty: c.qty + qty } : c);
      return [...prev, { itemId: showItem._id, itemName: showItem.itemName, brand: showItem.brand, vehicle: showItem.vehicle, partNumber: showItem.partNumber, unit: showItem.unit, slabPricing: showItem.slabPricing, qty }];
    });
    setShowItem(null);
    toast.success('Added to enquiry cart');
  };

  const submit = async () => {
    if (!cart.length) return toast.error('Add items first');
    setSubmitting(true);
    try {
      const endpoint = isNewRetailer ? '/enquiries' : '/orders';
      const payload = isNewRetailer
        ? { items: cart.map(c => ({ itemId: c.itemId, qty: c.qty })) }
        : { items: cart.map(c => ({ itemId: c.itemId, qty: c.qty })), remarks, orderType: 'b2b' };
      await api.post(endpoint, payload);
      toast.success(isNewRetailer ? 'Enquiry submitted!' : 'Order placed!');
      setCart([]);
      setShowCart(false);
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
    finally { setSubmitting(false); }
  };

  const getPrice = (item) => {
    if (!item.slabPricing?.length) return null;
    const cartItem = cart.find(c => c.itemId === item._id);
    const q2 = cartItem?.qty || 1;
    const slab = item.slabPricing.find(s => q2 >= s.minQty && (!s.maxQty || q2 <= s.maxQty));
    return slab ? `₹${slab.price}/${item.unit}` : `₹${item.slabPricing[0]?.price}+`;
  };

  return (
    <div>
      <TopNav title={isNewRetailer ? 'Product Catalog' : 'Order Catalog'} />
      <div className="page page-with-header">
        {isNewRetailer && !isUnlocked && (
          <div className="card" style={{ background:'#FFF3CD', border:'1px solid #FFCA28', marginBottom:12 }}>
            <p style={{ fontSize:13, color:'#856404', fontWeight:600 }}>🔒 Showing showcase items only</p>
            <p style={{ fontSize:12, color:'#856404' }}>Call us to unlock the full catalog with 5000+ products!</p>
          </div>
        )}

        <div className="search-bar">
          <span className="search-icon">{Icon.search}</span>
          <input placeholder="Search items, part no, brand..." value={q} onChange={e => setQ(e.target.value)} />
        </div>

        {results.map(item => (
          <div key={item._id} className="card card-sm" style={{ marginBottom:8, display:'flex', alignItems:'center', gap:12 }}>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:13, fontWeight:700 }}>{item.itemName}</div>
              <div style={{ fontSize:12, color:'var(--text-muted)' }}>
                {[item.vehicle, item.brand, item.partNumber].filter(Boolean).join(' · ')}
              </div>
              {!isNewRetailer && getPrice(item) && (
                <div style={{ fontSize:12, color:'var(--success)', fontWeight:600, marginTop:2 }}>{getPrice(item)}</div>
              )}
              {isNewRetailer && item.slabPricing?.length > 0 && (
                <div style={{ fontSize:11, color:'var(--info)', marginTop:2 }}>
                  {item.slabPricing.map((s,i) => `${s.minQty}${s.maxQty?'-'+s.maxQty:'+'}pcs: ₹${s.price}`).join(' | ')}
                </div>
              )}
            </div>
            <button className="btn btn-primary btn-sm" style={{ borderRadius:'50%', width:32, height:32, padding:0, flexShrink:0 }}
              onClick={() => { setShowItem(item); setQty(1); }}>{Icon.plus}</button>
          </div>
        ))}

        {!q && <div className="empty-state"><p>Search for items above</p></div>}
      </div>

      {cart.length > 0 && (
        <div className="cart-badge" onClick={() => setShowCart(true)}>
          {Icon.cart} {cart.length} items · Submit {isNewRetailer ? 'Enquiry' : 'Order'}
        </div>
      )}

      <BottomSheet open={!!showItem} onClose={() => setShowItem(null)} title="Add to Cart">
        {showItem && (
          <>
            <div className="card" style={{ marginBottom:16 }}>
              <div style={{ fontWeight:700 }}>{showItem.itemName}</div>
              <div style={{ fontSize:13, color:'var(--text-muted)', marginTop:4 }}>
                {[showItem.vehicle, showItem.brand, showItem.partNumber].filter(Boolean).join(' · ')}
              </div>
              {showItem.slabPricing?.length > 0 && (
                <div style={{ marginTop:8 }}>
                  {showItem.slabPricing.map((s,i) => (
                    <div key={i} style={{ fontSize:12, color:'var(--info)' }}>
                      {s.minQty}{s.maxQty?`-${s.maxQty}`:'+'} pcs → ₹{s.price}/{showItem.unit}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="qty-controls" style={{ justifyContent:'center', marginBottom:20 }}>
              <button className="qty-btn minus" onClick={() => setQty(q => Math.max(1, q-1))}>−</button>
              <span className="qty-value" style={{ fontSize:24, minWidth:48 }}>{qty}</span>
              <button className="qty-btn" onClick={() => setQty(q => q+1)}>+</button>
            </div>
            <button className="btn btn-primary btn-full btn-lg" onClick={addToCart}>
              {isNewRetailer ? 'Add to Enquiry' : 'Add to Cart'}
            </button>
          </>
        )}
      </BottomSheet>

      <BottomSheet open={showCart} onClose={() => setShowCart(false)} title={isNewRetailer ? 'My Enquiry' : 'My Cart'}>
        {cart.map(item => (
          <div key={item.itemId} className="item-row">
            <div className="item-info">
              <div className="item-name">{item.itemName}</div>
              <div className="item-sub">{item.vehicle || item.brand || ''}</div>
            </div>
            <div className="qty-controls">
              <button className="qty-btn minus" onClick={() => setCart(p => p.map(c => c.itemId===item.itemId?{...c,qty:Math.max(1,c.qty-1)}:c))}>−</button>
              <span className="qty-value">{item.qty}</span>
              <button className="qty-btn" onClick={() => setCart(p => p.map(c => c.itemId===item.itemId?{...c,qty:c.qty+1}:c))}>+</button>
            </div>
          </div>
        ))}
        {!isNewRetailer && (
          <div className="form-group" style={{ marginTop:12 }}>
            <label className="form-label">Remarks (Optional)</label>
            <input className="form-input" value={remarks} onChange={e => setRemarks(e.target.value)} />
          </div>
        )}
        <button className="btn btn-primary btn-full btn-lg" onClick={submit} disabled={submitting} style={{ marginTop:8 }}>
          {submitting ? 'Submitting...' : isNewRetailer ? 'Submit Enquiry' : 'Place Order'}
        </button>
      </BottomSheet>

      <BottomNav />
    </div>
  );
}

export default RetailerCatalog;
