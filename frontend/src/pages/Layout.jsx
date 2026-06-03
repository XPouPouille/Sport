import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../AuthContext.jsx';
import { useSwipe } from '../useSwipe.js';

const navItems = [
  { path: '/dashboard', icon: '📊', label: 'Dashboard' },
  { path: '/items',     icon: '📋', label: 'Exercices' },
  { path: '/log',       icon: '✏️', label: 'Enregistrer' },
  { path: '/stats',     icon: '📈', label: 'Statistiques' },
  { path: '/profile',   icon: '👤', label: 'Mon profil' },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  useSwipe(user?.role === 'admin');

  const allNavItems = user?.role === 'admin'
    ? [...navItems, { path: '/admin', icon: '⚙️', label: 'Administration' }]
    : navItems;

  return (
    <div className="layout">
      {/* Sidebar desktop */}
      <aside className={`sidebar ${collapsed ? 'sidebar-collapsed' : ''}`}>
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

        {allNavItems.map(item => (
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

        <div style={{ flex: 1 }} />

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

      <main className="main-content main-with-bottom-nav">
        <Outlet />
      </main>

      {/* Bottom nav mobile */}
      <nav className="bottom-nav">
        {allNavItems.map(item => (
          <div
            key={item.path}
            className={`bottom-nav-item ${location.pathname === item.path ? 'active' : ''}`}
            onClick={() => navigate(item.path)}
          >
            <span className="bottom-nav-icon">{item.icon}</span>
            <span className="bottom-nav-label">{item.label}</span>
          </div>
        ))}
        <div className="bottom-nav-item" onClick={logout}>
          <span className="bottom-nav-icon">🚪</span>
          <span className="bottom-nav-label">Quitter</span>
        </div>
      </nav>
    </div>
  );
}
