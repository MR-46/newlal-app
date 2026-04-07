import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// ─── Icons (inline SVG) ───────────────────────────────
export const Icon = {
  home: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  plus: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  list: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>,
  clock: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  user: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  grid: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>,
  package: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="16.5" y1="9.4" x2="7.5" y2="4.21"/><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>,
  chart: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
  users: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>,
  search: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  cart: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/></svg>,
  heart: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>,
  sun: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>,
  moon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>,
  bell: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>,
  whatsapp: <svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>,
  trash: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>,
  edit: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  chevronRight: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>,
  check: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>,
  x: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  upload: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0018 9h-1.26A8 8 0 103 16.3"/></svg>,
  download: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="8 17 12 21 16 17"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.88 18.09A5 5 0 0018 9h-1.26A8 8 0 103 16.29"/></svg>,
  alert: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
  logout: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
};

// ─── Status Badge ─────────────────────────────────────
const STATUS_LABELS = {
  placed: 'Placed', pending_confirmation: 'Awaiting Confirm',
  confirmed: 'Confirmed', in_progress: 'In Progress',
  ready: 'Ready', dispatched: 'Dispatched',
  shipped: 'Shipped', delivered: 'Delivered', cancelled: 'Cancelled',
};
export function StatusBadge({ status, urgent }) {
  return (
    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
      <span className={`badge badge-${status}`}>{STATUS_LABELS[status] || status}</span>
      {urgent && <span className="badge badge-urgent">⚡ URGENT</span>}
    </div>
  );
}

// ─── Top Nav ──────────────────────────────────────────
export function TopNav({ title, right, back }) {
  const { theme, toggleTheme } = useAuth();
  const navigate = useNavigate();
  return (
    <div className="top-nav">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {back && (
          <button className="btn btn-ghost btn-sm" style={{ padding: '6px 8px' }} onClick={() => navigate(-1)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" width="20" height="20"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
        )}
        <h1 style={{ fontSize: 17 }}>{title}</h1>
      </div>
      <div className="top-nav-actions">
        {right}
        <button className="btn btn-ghost btn-sm" style={{ padding: '6px 8px' }} onClick={toggleTheme}>
          {theme === 'dark' ? <span style={{ width: 20, height: 20, display: 'block' }}>{Icon.sun}</span> : <span style={{ width: 20, height: 20, display: 'block' }}>{Icon.moon}</span>}
        </button>
      </div>
    </div>
  );
}

// ─── Bottom Nav configs ───────────────────────────────
const NAV_CONFIGS = {
  salesperson: [
    { to: '/orders/create', icon: Icon.plus, label: 'Create' },
    { to: '/orders/mine', icon: Icon.list, label: 'My Orders' },
    { to: '/profile', icon: Icon.user, label: 'Profile' },
  ],
  admin: [
    { to: '/admin/dashboard', icon: Icon.grid, label: 'Dashboard' },
    { to: '/admin/items', icon: Icon.package, label: 'Items' },
    { to: '/admin/customers', icon: Icon.users, label: 'Customers' },
    { to: '/admin/users', icon: Icon.user, label: 'Users' },
    { to: '/admin/reports', icon: Icon.chart, label: 'Reports' },
  ],
  store_staff: [
    { to: '/staff/pending', icon: Icon.clock, label: 'Pending' },
    { to: '/staff/all', icon: Icon.list, label: 'All Orders' },
    { to: '/profile', icon: Icon.user, label: 'Profile' },
  ],
  b2c_staff: [
    { to: '/staff/pending', icon: Icon.clock, label: 'Pending' },
    { to: '/staff/all', icon: Icon.list, label: 'All Orders' },
    { to: '/profile', icon: Icon.user, label: 'Profile' },
  ],
  existing_retailer: [
    { to: '/retailer/catalog', icon: Icon.search, label: 'Catalog' },
    { to: '/retailer/orders', icon: Icon.list, label: 'My Orders' },
    { to: '/profile', icon: Icon.user, label: 'Profile' },
  ],
  new_retailer: [
    { to: '/retailer/catalog', icon: Icon.search, label: 'Catalog' },
    { to: '/profile', icon: Icon.user, label: 'Profile' },
  ],
  end_user: [
    { to: '/shop/catalog', icon: Icon.search, label: 'Shop' },
    { to: '/shop/orders', icon: Icon.list, label: 'My Orders' },
    { to: '/shop/wishlist', icon: Icon.heart, label: 'Wishlist' },
    { to: '/profile', icon: Icon.user, label: 'Profile' },
  ],
};

export function BottomNav({ pendingCount }) {
  const { user } = useAuth();
  const items = NAV_CONFIGS[user?.role] || [];
  return (
    <nav className="bottom-nav">
      {items.map(item => (
        <NavLink key={item.to} to={item.to} className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
          {item.icon}
          {item.label === 'Pending' && pendingCount > 0 && <span className="nav-badge">{pendingCount}</span>}
          <span>{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}

// ─── Order Card ───────────────────────────────────────
export function OrderCard({ order, onClick, actions }) {
  const itemCount = order.items?.length || 0;
  const totalQty = order.items?.reduce((s, i) => s + i.orderedQty, 0) || 0;
  return (
    <div className={`card order-card${order.isUrgent ? ' urgent' : ''}`} onClick={onClick}>
      <div className="order-header">
        <div>
          <div className="order-id">{order.orderId}</div>
          <div className="order-customer">{order.customerName}</div>
        </div>
        <StatusBadge status={order.status} urgent={order.isUrgent} />
      </div>
      <div className="order-meta">
        <span>📦 {itemCount} item{itemCount !== 1 ? 's' : ''} · {totalQty} qty</span>
        {order.createdByName && <span>👤 {order.createdByName}</span>}
        <span>🕐 {new Date(order.createdAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
      </div>
      {order.remarks && <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>📝 {order.remarks}</div>}
      {actions && <div className="order-actions" onClick={e => e.stopPropagation()}>{actions}</div>}
    </div>
  );
}

// ─── Loading / Empty ──────────────────────────────────
export function Loading() {
  return <div className="loading-center"><div className="spinner" /></div>;
}
export function Empty({ text = 'Nothing here yet' }) {
  return (
    <div className="empty-state">
      {Icon.package}
      <p>{text}</p>
    </div>
  );
}

// ─── Bottom Sheet ─────────────────────────────────────
export function BottomSheet({ open, onClose, children, title }) {
  if (!open) return null;
  return (
    <>
      <div className="overlay" onClick={onClose} />
      <div className="bottom-sheet">
        <div className="sheet-handle" />
        {title && <h3 style={{ marginBottom: 16, fontSize: 17, fontWeight: 700 }}>{title}</h3>}
        {children}
      </div>
    </>
  );
}

// ─── Confirm Dialog ───────────────────────────────────
export function ConfirmDialog({ open, onClose, onConfirm, title, message, danger }) {
  if (!open) return null;
  return (
    <>
      <div className="overlay" onClick={onClose} />
      <div className="bottom-sheet">
        <div className="sheet-handle" />
        <h3 style={{ marginBottom: 8, fontSize: 17 }}>{title}</h3>
        <p style={{ color: 'var(--text-secondary)', marginBottom: 24 }}>{message}</p>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-outline btn-full" onClick={onClose}>Cancel</button>
          <button className={`btn btn-full ${danger ? 'btn-danger' : 'btn-primary'}`} onClick={() => { onConfirm(); onClose(); }}>Confirm</button>
        </div>
      </div>
    </>
  );
}
