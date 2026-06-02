import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../AuthContext.jsx';

const navItems = [
  { path: '/dashboard', icon: '📊', label: 'Dashboard' },
  { path: '/items',     icon: '📋', label: 'Exercices' },
  { path: '/log',       icon: '✏️', label: 'Enregistrer' },
  { path: '/stats',     icon: '📈', label: 'Statistiques' },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="layout">
      <aside className={`sidebar ${collapsed ? 'sidebar-collapsed' : ''}`}>
        {/* Header */}
        <div className="sidebar-header">
          {!collapsed && <div className="sidebar-logo">Sport Tracker</div>}
          <button
            className="sidebar-toggle"
            onClick={() => setCollapsed(c => !c)}
            title={collapsed ? 'Étendre' : 'Réduire'}
          >
            {collapsed ? '→' : '←'}
          </button>
        </div>

        {/* Nav */}
        {navItems.map(item => (
          <div
            key={item.path}
            className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
            onClick={() => navigate(item.path)}
            title={collapsed ? item.label : ''}
          >
            <span className="nav-icon">{item.icon}</span>
            {!collapsed && <span className="nav-label">{item.label}</span>}
          </div>
        ))}

        {user?.role === 'admin' && (
          <div
            className={`nav-item ${location.pathname === '/admin' ? 'active' : ''}`}
            onClick={() => navigate('/admin')}
            title={collapsed ? 'Administration' : ''}
          >
            <span className="nav-icon">⚙️</span>
            {!collapsed && <span className="nav-label">Administration</span>}
          </div>
        )}

        <div style={{ flex: 1 }} />

        {/* Footer */}
        <div className="sidebar-footer">
          {!collapsed && (
            <div className="text-muted" style={{ fontSize: '.82rem', marginBottom: 8 }}>
              {user?.username} <span className={`badge badge-${user?.role}`}>{user?.role}</span>
            </div>
          )}
          <button
            className={`btn btn-ghost btn-sm ${collapsed ? '' : 'w-full'}`}
            onClick={logout}
            title={collapsed ? 'Déconnexion' : ''}
          >
            {collapsed ? '🚪' : 'Déconnexion'}
          </button>
        </div>
      </aside>

      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
