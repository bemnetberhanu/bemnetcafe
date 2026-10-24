import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { clearAuth } from '../auth';

const PAGE_TITLES = {
  '/': '🍽️ አዲስ ትዕዛዝ',
  '/purchases': '📦 ግዥ መዝግብ',
  '/expenses': '🧾 ወጪ ጨምር',
  '/notifications': '🔔 ማሳወቂያ እና ክምችት',
  '/summary': '📊 የዕለቱ ማጠቃለያ',
};

export default function TopBar() {
  const { pathname } = useLocation();
  const navigate = useNavigate();

  function logout() {
    clearAuth();
    navigate('/login', { replace: true });
  }

  return (
    <header className="manager-topbar" style={{
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
      <span className="manager-brand-icon" style={{ fontSize: 22 }}>🇪🇹</span>
      <div className="manager-brand" style={{ flex: 1 }}>
        <div style={{ fontWeight: 700, fontSize: 15 }}>Habesha Restaurant</div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>
          {new Date().toLocaleDateString('am-ET', { weekday: 'short', month: 'short', day: 'numeric' })}
        </div>
      </div>
      <div className="manager-page-title" style={{ fontSize: 14, fontWeight: 600, color: '#f5c97a' }}>
        {PAGE_TITLES[pathname] || 'የአስተዳዳሪ መተግበሪያ'}
      </div>
      <button
        className="manager-signout"
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
        ውጣ
      </button>
    </header>
  );
}
