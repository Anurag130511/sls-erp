import { Routes, Route, Navigate, NavLink } from 'react-router-dom';
import { useAuth } from './api/AuthContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import PartyList from './pages/PartyList';
import Items from './pages/Items';
import Parameters from './pages/Parameters';
import Quotations from './pages/Quotations';
import QuotationForm from './pages/QuotationForm';
import QuotationDetail from './pages/QuotationDetail';
import PurchaseOrders from './pages/PurchaseOrders';
import PurchaseOrderForm from './pages/PurchaseOrderForm';
import PurchaseOrderDetail from './pages/PurchaseOrderDetail';
import Documents from './pages/Documents';
import Users from './pages/Users';
import Reports from './pages/Reports';

function ProtectedRoute({ children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function AdminRoute({ children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'admin') return <Navigate to="/" replace />;
  return children;
}

function Layout({ children }) {
  const { user, logout } = useAuth();
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <img src="/logo.png" alt="SLS" />
        </div>
        <nav>
          <NavLink to="/">Dashboard</NavLink>
          <NavLink to="/quotations">Quotations</NavLink>
          <NavLink to="/purchase-orders">Purchase Orders</NavLink>
          <NavLink to="/documents">Documents</NavLink>
          <NavLink to="/customers">Customers</NavLink>
          <NavLink to="/vendors">Vendors</NavLink>
          <NavLink to="/parameters">Parameters</NavLink>
          {user?.role === 'admin' && <NavLink to="/users">Users</NavLink>}
          {user?.role === 'admin' && <NavLink to="/reports">Reports</NavLink>}
        </nav>
        <div style={{ padding: '20px', marginTop: 20, borderTop: '1px solid #333' }}>
          <div style={{ fontSize: 12, color: '#aaa', marginBottom: 8 }}>{user?.name} ({user?.role})</div>
          <button className="btn secondary" onClick={logout}>Log out</button>
        </div>
      </aside>
      <main className="main-content">{children}</main>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<ProtectedRoute><Layout><Dashboard /></Layout></ProtectedRoute>} />
      <Route path="/customers" element={<ProtectedRoute><Layout><PartyList entity="customers" title="Customers" /></Layout></ProtectedRoute>} />
      <Route path="/vendors" element={<ProtectedRoute><Layout><PartyList entity="vendors" title="Vendors" /></Layout></ProtectedRoute>} />
      <Route path="/items" element={<ProtectedRoute><Layout><Items /></Layout></ProtectedRoute>} />
      <Route path="/parameters" element={<ProtectedRoute><Layout><Parameters /></Layout></ProtectedRoute>} />
      <Route path="/quotations" element={<ProtectedRoute><Layout><Quotations /></Layout></ProtectedRoute>} />
      <Route path="/quotations/new" element={<ProtectedRoute><Layout><QuotationForm /></Layout></ProtectedRoute>} />
      <Route path="/quotations/:id" element={<ProtectedRoute><Layout><QuotationDetail /></Layout></ProtectedRoute>} />
      <Route path="/purchase-orders" element={<ProtectedRoute><Layout><PurchaseOrders /></Layout></ProtectedRoute>} />
      <Route path="/purchase-orders/new" element={<ProtectedRoute><Layout><PurchaseOrderForm /></Layout></ProtectedRoute>} />
      <Route path="/purchase-orders/:id" element={<ProtectedRoute><Layout><PurchaseOrderDetail /></Layout></ProtectedRoute>} />
      <Route path="/documents" element={<ProtectedRoute><Layout><Documents /></Layout></ProtectedRoute>} />
      <Route path="/users" element={<AdminRoute><Layout><Users /></Layout></AdminRoute>} />
      <Route path="/reports" element={<AdminRoute><Layout><Reports /></Layout></AdminRoute>} />
    </Routes>
  );
}
