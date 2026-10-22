import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const PAGE_TITLES = {
  '/': '🍽️ New Order',
  '/purchases': '📦 Record Purchase',
  '/expenses': '🧾 Add Expense',
  '/notifications': '🔔 Alerts & Stock',
  '/summary': '📊 Daily Summary',
};

export default function TopBar() {
  const { pathname } = useLocation();
  const navigate = useNavigate();

  function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login', { replace: true });
  }

  return (
    <header style={{
      height: 56,
      background: '#1c1410',
      color: '#fff',
      display: 'flex',
      alignItems: 'center',
      padding: '0 16px',
      gap: 12,
      flexShrink: 0,
      boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
    }}>
      <span style={{ fontSize: 22 }}>🇪🇹</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 700, fontSize: 15 }}>Habesha Restaurant</div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>
          {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
        </div>
      </div>
      <div style={{ fontSize: 14, fontWeight: 600, color: '#f5c97a' }}>
        {PAGE_TITLES[pathname] || 'Manager App'}
      </div>
      <button
        type="button"
        onClick={logout}
        style={{
          padding: '7px 10px',
          border: '1px solid rgba(255,255,255,0.3)',
          borderRadius: 6,
          background: 'transparent',
          color: '#fff',
          fontSize: 12,
        }}
      >
        Sign out
      </button>
    </header>
  );
}
