// EndUserWishlist.jsx
import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import { TopNav, BottomNav, Loading, Empty, Icon } from '../../components';

export function EndUserWishlist() {
  const [wishlist, setWishlist] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/items?showcaseOnly=false&limit=100').then(() => {}).catch(() => {});
    // Wishlist from local storage for now (can be moved to backend)
    const saved = JSON.parse(localStorage.getItem('nl_wishlist') || '[]');
    setWishlist(saved);
    setLoading(false);
  }, []);

  const remove = (itemId) => {
    const updated = wishlist.filter(i => i._id !== itemId);
    setWishlist(updated);
    localStorage.setItem('nl_wishlist', JSON.stringify(updated));
    toast.success('Removed from wishlist');
  };

  return (
    <div>
      <TopNav title="Wishlist" />
      <div className="page page-with-header">
        {loading ? <Loading /> : wishlist.length === 0 ? (
          <div className="empty-state">
            {Icon.heart}
            <p>Your wishlist is empty</p>
            <p style={{ fontSize:12, marginTop:6 }}>Add items from the catalog</p>
          </div>
        ) : (
          wishlist.map(item => (
            <div key={item._id} className="card card-sm" style={{ marginBottom:8, display:'flex', alignItems:'center', gap:12 }}>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:13, fontWeight:700 }}>{item.itemName}</div>
                <div style={{ fontSize:12, color:'var(--text-muted)' }}>
                  {[item.vehicle, item.brand, item.partNumber].filter(Boolean).join(' · ')}
                </div>
                {item.mrp && <div style={{ fontSize:13, color:'var(--success)', fontWeight:700 }}>₹{item.mrp}</div>}
              </div>
              <button className="btn btn-ghost btn-sm" style={{ color:'var(--danger)' }} onClick={() => remove(item._id)}>
                {Icon.trash}
              </button>
            </div>
          ))
        )}
      </div>
      <BottomNav />
    </div>
  );
}

export default EndUserWishlist;
