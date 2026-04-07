import { useState, useEffect, useRef, useCallback } from 'react';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import { TopNav, BottomNav, BottomSheet, Icon } from '../../components';
import { generateOrderPDF, shareOnWhatsApp } from '../../utils/pdf';

export default function CreateOrder() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [cart, setCart] = useState([]);
  const [recentItems, setRecentItems] = useState([]);
  const [freqItems, setFreqItems] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [staff, setStaff] = useState([]);
  const [showCart, setShowCart] = useState(false);
  const [showCustomer, setShowCustomer] = useState(false);
  const [showAddItem, setShowAddItem] = useState(null); // item object
  const [qty, setQty] = useState(1);
  const [customerMode, setCustomerMode] = useState('select'); // 'select' or 'new'
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [newCustomer, setNewCustomer] = useState({ name: '', mobile: '' });
  const [assignedStaff, setAssignedStaff] = useState('');
  const [remarks, setRemarks] = useState('');
  const [isUrgent, setIsUrgent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const debounceRef = useRef(null);

  useEffect(() => {
    api.get('/users/staff/list?type=b2b').then(r => setStaff(r.data));
    api.get('/customers').then(r => setCustomers(r.data));
  }, []);

  // Load customer-specific recent/freq items when customer selected
  useEffect(() => {
    if (!selectedCustomer) { setRecentItems([]); setFreqItems([]); return; }
    api.get(`/orders/customer/${selectedCustomer._id}/history`).then(r => {
      const all = r.data.flatMap(o => o.items);
      const seen = {}, freq = {};
      all.forEach(i => {
        if (!seen[i.item]) { seen[i.item] = i; setRecentItems(prev => [...prev.slice(-4), i]); }
        freq[i.item] = (freq[i.item] || 0) + 1;
      });
      const sorted = Object.entries(freq).sort((a,b) => b[1]-a[1]).slice(0,8).map(([id]) => seen[id]).filter(Boolean);
      setFreqItems(sorted);
      setRecentItems(Object.values(seen).slice(0,6));
    }).catch(() => {});
  }, [selectedCustomer]);

  const search = useCallback((q) => {
    clearTimeout(debounceRef.current);
    if (!q.trim()) { setResults([]); return; }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const { data } = await api.get(`/items?q=${encodeURIComponent(q)}&limit=30`);
        setResults(data.items);
      } finally { setSearching(false); }
    }, 250);
  }, []);

  useEffect(() => { search(query); }, [query, search]);

  const openAddItem = (item) => { setShowAddItem(item); setQty(1); };

  const addToCart = () => {
    if (!showAddItem) return;
    setCart(prev => {
      const existing = prev.find(c => c.itemId === showAddItem._id);
      if (existing) return prev.map(c => c.itemId === showAddItem._id ? { ...c, qty: c.qty + qty } : c);
      return [...prev, { itemId: showAddItem._id, itemName: showAddItem.itemName, partNumber: showAddItem.partNumber, brand: showAddItem.brand, vehicle: showAddItem.vehicle, unit: showAddItem.unit, qty }];
    });
    setShowAddItem(null);
    toast.success('Added to cart');
  };

  const updateCartQty = (itemId, delta) => {
    setCart(prev => prev.map(c => c.itemId === itemId ? { ...c, qty: Math.max(1, c.qty + delta) } : c).filter(c => c.qty > 0));
  };
  const removeFromCart = (itemId) => setCart(prev => prev.filter(c => c.itemId !== itemId));

  const totalItems = cart.reduce((s, c) => s + c.qty, 0);

  const submitOrder = async () => {
    if (!cart.length) return toast.error('Add items to cart first');
    const customer = customerMode === 'select' ? selectedCustomer : null;
    if (!customer && !newCustomer.name) return toast.error('Select or enter a customer');

    setSubmitting(true);
    try {
      const payload = {
        items: cart.map(c => ({ itemId: c.itemId, qty: c.qty })),
        customerId: customer?._id,
        customerName: customer ? customer.name : newCustomer.name,
        customerMobile: customer ? customer.mobile : newCustomer.mobile,
        assignedStaffId: assignedStaff || undefined,
        remarks,
        isUrgent,
        orderType: 'b2b',
      };
      const { data: order } = await api.post('/orders', payload);
      toast.success(`Order ${order.orderId} created!`);

      // PDF + WhatsApp
      const pdf = generateOrderPDF(order);
      setShowCustomer(false);
      setCart([]);
      setQuery('');
      setRemarks('');
      setIsUrgent(false);
      setSelectedCustomer(null);
      setNewCustomer({ name: '', mobile: '' });

      // Ask to share
      if (window.confirm('Share order on WhatsApp?')) shareOnWhatsApp(order, pdf);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create order');
    } finally { setSubmitting(false); }
  };

  const ItemChip = ({ item }) => (
    <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:10, padding:'10px 12px', cursor:'pointer', minWidth:120 }}
      onClick={() => openAddItem(item)}>
      <div style={{ fontSize:12, fontWeight:700, color:'var(--text)', lineHeight:1.3 }}>{item.itemName?.slice(0,25)}</div>
      <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:2 }}>{item.vehicle || item.brand || item.partNumber || ''}</div>
    </div>
  );

  return (
    <div>
      <TopNav title="Create Order" right={
        isUrgent ? <span className="badge badge-urgent">⚡ URGENT</span> : null
      } />

      <div className="page page-with-header">
        {/* Search */}
        <div className="search-bar">
          <span className="search-icon">{Icon.search}</span>
          <input placeholder="Search by item, part no, brand..." value={query} onChange={e => setQuery(e.target.value)} autoComplete="off" />
        </div>

        {/* Search results */}
        {query.trim() && (
          <div className="card" style={{ marginBottom: 12 }}>
            {searching ? (
              <div style={{ textAlign:'center', padding:20, color:'var(--text-muted)' }}>Searching...</div>
            ) : results.length === 0 ? (
              <div style={{ textAlign:'center', padding:20, color:'var(--text-muted)' }}>No items found</div>
            ) : results.map(item => (
              <div key={item._id} className="item-row" style={{ cursor:'pointer' }} onClick={() => openAddItem(item)}>
                <div className="item-info">
                  <div className="item-name">{item.itemName}</div>
                  <div className="item-sub">{[item.vehicle, item.brand, item.partNumber].filter(Boolean).join(' · ')}</div>
                </div>
                <button className="btn btn-primary btn-sm" style={{ flexShrink:0, borderRadius:'50%', width:32, height:32, padding:0 }}>{Icon.plus}</button>
              </div>
            ))}
          </div>
        )}

        {/* Recent items */}
        {!query && recentItems.length > 0 && (
          <>
            <div className="section-title">Recent Items {selectedCustomer ? `for ${selectedCustomer.name}` : ''}</div>
            <div style={{ display:'flex', gap:8, overflowX:'auto', paddingBottom:8, marginBottom:4, scrollbarWidth:'none' }}>
              {recentItems.map((item, i) => <ItemChip key={i} item={item} />)}
            </div>
          </>
        )}

        {/* Frequently ordered */}
        {!query && freqItems.length > 0 && (
          <>
            <div className="section-title">Frequently Ordered</div>
            <div className="card">
              {freqItems.map((item, i) => (
                <div key={i} className="item-row" style={{ cursor:'pointer' }} onClick={() => openAddItem(item)}>
                  <div className="item-info">
                    <div className="item-name">{item.itemName}</div>
                    <div className="item-sub">{[item.vehicle, item.brand, item.partNumber].filter(Boolean).join(' · ')}</div>
                  </div>
                  <button className="btn btn-primary btn-sm" style={{ flexShrink:0, borderRadius:'50%', width:32, height:32, padding:0 }}>{Icon.plus}</button>
                </div>
              ))}
            </div>
          </>
        )}

        {!query && !selectedCustomer && (
          <div className="empty-state" style={{ paddingTop:60 }}>
            {Icon.search}
            <p>Search for items to add to cart</p>
            <p style={{ fontSize:12, marginTop:6 }}>Select a customer first to see their order history</p>
          </div>
        )}
      </div>

      {/* Floating cart button */}
      {cart.length > 0 && (
        <div className="cart-badge" onClick={() => setShowCart(true)}>
          {Icon.cart} {cart.length} item{cart.length !== 1 ? 's' : ''} · {totalItems} qty
        </div>
      )}

      <BottomNav />

      {/* Add to cart sheet */}
      <BottomSheet open={!!showAddItem} onClose={() => setShowAddItem(null)} title="Add to Cart">
        {showAddItem && (
          <>
            <div className="card" style={{ marginBottom:16 }}>
              <div style={{ fontSize:15, fontWeight:700 }}>{showAddItem.itemName}</div>
              <div style={{ fontSize:13, color:'var(--text-muted)', marginTop:4 }}>
                {[showAddItem.vehicle, showAddItem.brand, showAddItem.partNumber].filter(Boolean).join(' · ')}
              </div>
            </div>
            <p style={{ fontSize:13, fontWeight:600, color:'var(--text-secondary)', marginBottom:10 }}>Quantity</p>
            <div className="qty-controls" style={{ justifyContent:'center', marginBottom:24 }}>
              <button className="qty-btn minus" onClick={() => setQty(q => Math.max(1, q-1))}>−</button>
              <span className="qty-value" style={{ fontSize:24, minWidth:48 }}>{qty}</span>
              <button className="qty-btn" onClick={() => setQty(q => q+1)}>+</button>
            </div>
            <button className="btn btn-primary btn-full btn-lg" onClick={addToCart}>Add to Cart</button>
          </>
        )}
      </BottomSheet>

      {/* Cart sheet */}
      <BottomSheet open={showCart} onClose={() => setShowCart(false)} title={`Cart (${cart.length} items)`}>
        {cart.map(item => (
          <div key={item.itemId} className="item-row">
            <div className="item-info">
              <div className="item-name">{item.itemName}</div>
              <div className="item-sub">{item.vehicle || item.brand || ''}</div>
            </div>
            <div className="qty-controls">
              <button className="qty-btn minus" onClick={() => updateCartQty(item.itemId, -1)}>−</button>
              <span className="qty-value">{item.qty}</span>
              <button className="qty-btn" onClick={() => updateCartQty(item.itemId, 1)}>+</button>
              <button className="btn btn-ghost btn-sm" style={{ color:'var(--danger)', padding:'4px 6px' }} onClick={() => removeFromCart(item.itemId)}>{Icon.trash}</button>
            </div>
          </div>
        ))}

        <div className="divider" />

        {/* Assign staff */}
        <div className="form-group">
          <label className="form-label">Assign to Staff (Optional)</label>
          <select className="form-input form-select" value={assignedStaff} onChange={e => setAssignedStaff(e.target.value)}>
            <option value="">Unassigned (any staff)</option>
            {staff.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
          </select>
        </div>

        {/* Urgent + Remarks */}
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12 }}>
          <input type="checkbox" id="urgent" checked={isUrgent} onChange={e => setIsUrgent(e.target.checked)} style={{ width:18, height:18 }} />
          <label htmlFor="urgent" style={{ fontSize:14, fontWeight:600, color:'var(--danger)' }}>⚡ Mark as Urgent</label>
        </div>
        <div className="form-group">
          <label className="form-label">Remarks (Optional)</label>
          <input className="form-input" placeholder="e.g. Deliver before 5pm" value={remarks} onChange={e => setRemarks(e.target.value)} />
        </div>

        <button className="btn btn-primary btn-full btn-lg" onClick={() => { setShowCart(false); setShowCustomer(true); }}>
          Proceed to Customer Details
        </button>
      </BottomSheet>

      {/* Customer details sheet */}
      <BottomSheet open={showCustomer} onClose={() => setShowCustomer(false)} title="Customer Details">
        <div style={{ display:'flex', gap:8, marginBottom:16 }}>
          {['select','new'].map(m => (
            <button key={m} className={`btn btn-full ${customerMode===m?'btn-primary':'btn-outline'}`} style={{ fontSize:13 }}
              onClick={() => setCustomerMode(m)}>
              {m === 'select' ? 'Select Customer' : '+ New Customer'}
            </button>
          ))}
        </div>

        {customerMode === 'select' ? (
          <div className="form-group">
            <label className="form-label">Select Customer</label>
            <select className="form-input form-select" value={selectedCustomer?._id || ''} onChange={e => {
              const c = customers.find(c => c._id === e.target.value);
              setSelectedCustomer(c || null);
            }}>
              <option value="">Select from customer list...</option>
              {customers.map(c => <option key={c._id} value={c._id}>{c.name}{c.mobile ? ` (${c.mobile})` : ''}</option>)}
            </select>
          </div>
        ) : (
          <>
            <div className="form-group">
              <label className="form-label">Customer Name *</label>
              <input className="form-input" placeholder="Enter name" value={newCustomer.name} onChange={e => setNewCustomer(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Mobile (Optional)</label>
              <input className="form-input" type="tel" placeholder="Mobile number" value={newCustomer.mobile} onChange={e => setNewCustomer(f => ({ ...f, mobile: e.target.value }))} />
            </div>
          </>
        )}

        <button className="btn btn-primary btn-full btn-lg" onClick={submitOrder} disabled={submitting}>
          {submitting ? 'Placing Order...' : 'Place Order'}
        </button>
      </BottomSheet>
    </div>
  );
}
