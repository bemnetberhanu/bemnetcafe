import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';

const navItems = [
  { to: '/', label: 'Dashboard', icon: '📊', exact: true },
  { to: '/financial', label: 'Financials', icon: '💰' },
  { to: '/ranking', label: 'Sales Ranking', icon: '🏆' },
  { to: '/menu', label: 'Menu & Recipes', icon: '🍽️' },
  { to: '/ingredients', label: 'Ingredients', icon: '🥩' },
  { to: '/orders', label: 'Orders', icon: '📋' },
  { to: '/expenses', label: 'Expenses', icon: '🧾' },
  { to: '/users', label: 'Users', icon: '👥' },
];

export default function Layout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--color-bg)' }}>
      {/* Sidebar */}
      <aside style={{
        width: sidebarOpen ? 240 : 64,
        background: '#1c1410',
        color: '#fff',
        display: 'flex',
        flexDirection: 'column',
        transition: 'width 0.2s ease',
        flexShrink: 0,
      }}>
        <div style={{ padding: '20px 16px', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 28 }}>🇪🇹</span>
          {sidebarOpen && (
            <div>
              <div style={{ fontWeight: 700, fontSize: 15 }}>Habesha</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>Admin Dashboard</div>
            </div>
          )}
        </div>

        <nav style={{ flex: 1, padding: '12px 0', overflowY: 'auto' }}>
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.exact}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '10px 16px',
                color: isActive ? '#f5c97a' : 'rgba(255,255,255,0.7)',
                background: isActive ? 'rgba(200,134,10,0.2)' : 'transparent',
                borderLeft: isActive ? '3px solid var(--color-primary)' : '3px solid transparent',
                fontSize: 14,
                fontWeight: isActive ? 600 : 400,
                transition: 'all 0.15s',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
              })}
            >
              <span style={{ fontSize: 18, flexShrink: 0 }}>{item.icon}</span>
              {sidebarOpen && <span>{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          {sidebarOpen && (
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{user?.name}</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', textTransform: 'capitalize' }}>{user?.role}</div>
            </div>
          )}
          <button
            onClick={handleLogout}
            style={{
              width: '100%',
              padding: '8px 12px',
              background: 'rgba(220,38,38,0.2)',
              color: '#fca5a5',
              border: '1px solid rgba(220,38,38,0.3)',
              borderRadius: 6,
              fontSize: 13,
              cursor: 'pointer',
            }}
          >
            {sidebarOpen ? '🚪 Logout' : '🚪'}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Top bar */}
        <header style={{
          height: 56,
          background: 'var(--color-surface)',
          borderBottom: '1px solid var(--color-border)',
          display: 'flex',
          alignItems: 'center',
          padding: '0 24px',
          gap: 16,
          boxShadow: 'var(--shadow)',
        }}>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            style={{ background: 'none', border: 'none', fontSize: 20, padding: 4 }}
            aria-label="Toggle sidebar"
          >
            ☰
          </button>
          <div style={{ flex: 1 }} />
          <div style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
            {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
        </header>

        {/* Page content */}
        <main style={{ flex: 1, overflow: 'auto', padding: 24 }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
