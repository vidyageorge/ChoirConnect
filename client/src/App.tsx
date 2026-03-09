import { BrowserRouter as Router, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Dashboard from './pages/Dashboard';
import Members from './pages/Members';
import Attendance from './pages/Attendance';
import AttendanceCorrections from './pages/AttendanceCorrections';
import Expenses from './pages/Expenses';
import Login from './pages/Login';
import ResetPassword from './pages/ResetPassword';

function Sidebar() {
  const location = useLocation();
  const { user, logout } = useAuth();

  const allNavItems = [
    { path: '/', label: 'Dashboard', icon: '📊', adminOnly: false },
    { path: '/members', label: 'Members', icon: '👥', adminOnly: false },
    { path: '/attendance', label: 'Attendance', icon: '✓', adminOnly: false },
    { path: '/attendance-corrections', label: 'Correction requests', icon: '✏️', adminOnly: false },
    { path: '/expenses', label: 'Expenses', icon: '💰', adminOnly: false },
  ];
  const navItems = user?.role === 'admin'
    ? allNavItems
    : allNavItems.filter((item) => !item.adminOnly);

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <h1>ChoirMate</h1>
        <p>Choir Management System</p>
      </div>
      <nav className="sidebar-nav">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
          >
            <span className="nav-item-icon">{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </nav>
      <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
        <p style={{ fontSize: '0.875rem', opacity: 0.9, marginBottom: '0.5rem' }}>{user?.username}</p>
        <button type="button" className="btn btn-secondary btn-small" onClick={() => logout()} style={{ width: '100%' }}>
          Log out
        </button>
      </div>
    </div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="loading" style={{ minHeight: '60vh' }}>
        <div className="loading-spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <div className="app">
                  <Sidebar />
                  <div className="main-content">
                    <Routes>
                      <Route path="/" element={<Dashboard />} />
                      <Route path="/members" element={<Members />} />
                      <Route path="/attendance" element={<Attendance />} />
                      <Route path="/attendance-corrections" element={<AttendanceCorrections />} />
                      <Route path="/expenses" element={<Expenses />} />
                    </Routes>
                  </div>
                </div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;

