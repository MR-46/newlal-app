import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import './index.css';

// Pages
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';

// Internal
import CreateOrder from './pages/salesperson/CreateOrder';
import MyOrders from './pages/salesperson/MyOrders';
import PendingOrders from './pages/staff/PendingOrders';
import AllOrders from './pages/staff/AllOrders';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminItems from './pages/admin/AdminItems';
import AdminCustomers from './pages/admin/AdminCustomers';
import AdminUsers from './pages/admin/AdminUsers';
import AdminReports from './pages/admin/AdminReports';
import AdminRecycleBin from './pages/admin/AdminRecycleBin';
import ProfilePage from './pages/ProfilePage';

// External
import RetailerCatalog from './pages/retailer/RetailerCatalog';
import RetailerOrders from './pages/retailer/RetailerOrders';
import EndUserCatalog from './pages/enduser/EndUserCatalog';
import EndUserOrders from './pages/enduser/EndUserOrders';
import EndUserWishlist from './pages/enduser/EndUserWishlist';

function RequireAuth({ children }) {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" replace />;
}

function RoleRouter() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;

  switch (user.role) {
    case 'admin':
      return <Navigate to="/admin/dashboard" replace />;
    case 'salesperson':
      return <Navigate to="/orders/create" replace />;
    case 'store_staff':
    case 'b2c_staff':
      return <Navigate to="/staff/pending" replace />;
    case 'existing_retailer':
      return <Navigate to="/retailer/catalog" replace />;
    case 'new_retailer':
      return <Navigate to="/retailer/catalog" replace />;
    case 'end_user':
      return <Navigate to="/shop/catalog" replace />;
    default:
      return <Navigate to="/login" replace />;
  }
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/" element={<RoleRouter />} />

      {/* Salesperson / Admin shared order routes */}
      <Route path="/orders/create" element={<RequireAuth><CreateOrder /></RequireAuth>} />
      <Route path="/orders/mine" element={<RequireAuth><MyOrders /></RequireAuth>} />
      <Route path="/profile" element={<RequireAuth><ProfilePage /></RequireAuth>} />

      {/* Staff */}
      <Route path="/staff/pending" element={<RequireAuth><PendingOrders /></RequireAuth>} />
      <Route path="/staff/all" element={<RequireAuth><AllOrders /></RequireAuth>} />

      {/* Admin */}
      <Route path="/admin/dashboard" element={<RequireAuth><AdminDashboard /></RequireAuth>} />
      <Route path="/admin/items" element={<RequireAuth><AdminItems /></RequireAuth>} />
      <Route path="/admin/customers" element={<RequireAuth><AdminCustomers /></RequireAuth>} />
      <Route path="/admin/users" element={<RequireAuth><AdminUsers /></RequireAuth>} />
      <Route path="/admin/reports" element={<RequireAuth><AdminReports /></RequireAuth>} />
      <Route path="/admin/bin" element={<RequireAuth><AdminRecycleBin /></RequireAuth>} />

      {/* Existing Retailer */}
      <Route path="/retailer/catalog" element={<RequireAuth><RetailerCatalog /></RequireAuth>} />
      <Route path="/retailer/orders" element={<RequireAuth><RetailerOrders /></RequireAuth>} />

      {/* End User */}
      <Route path="/shop/catalog" element={<RequireAuth><EndUserCatalog /></RequireAuth>} />
      <Route path="/shop/orders" element={<RequireAuth><EndUserOrders /></RequireAuth>} />
      <Route path="/shop/wishlist" element={<RequireAuth><EndUserWishlist /></RequireAuth>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="app-container">
          <AppRoutes />
          <Toaster position="top-center" toastOptions={{ duration: 3000, style: { borderRadius: '10px', fontSize: '14px' } }} />
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}
