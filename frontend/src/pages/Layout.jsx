import React from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../AuthContext.jsx';

const navItems = [
  { path: '/dashboard', label: '📊 Dashboard' },
  { path: '/items', label: '📋 Exercices' },
  { path: '/log', label: '✏️ Enregistrer' },
  { path: '/stats', label: '📈 Statistiques' },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-logo">Sport Tracker</div>
        {navItems.map(item => (
          <div
            key={item.path}
            className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
            onClick={() => navigate(item.path)}
          >
            {item.label}
          </div>
        ))}
        {user?.role === 'admin' && (
          <div
            className={`nav-item ${location.pathname === '/admin' ? 'active' : ''}`}
            onClick={() => navigate('/admin')}
          >
            ⚙️ Administration
          </div>
        )}
        <div style={{ flex: 1 }} />
        <div style={{ padding: '0 12px' }}>
          <div className="text-muted" style={{ fontSize: '.82rem', marginBottom: 8 }}>
            {user?.username} <span className={`badge badge-${user?.role}`}>{user?.role}</span>
          </div>
          <button className="btn btn-ghost btn-sm w-full" onClick={logout}>Déconnexion</button>
        </div>
      </aside>
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
