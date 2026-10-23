import React, { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import api from '../api/client';

const navItems = [
  { to: '/', icon: '🍽️', label: 'POS', exact: true },
  { to: '/purchases', icon: '📦', label: 'Purchase' },
  { to: '/expenses', icon: '🧾', label: 'Expense' },
  { to: '/notifications', icon: '🔔', label: 'Alerts', badge: true },
  { to: '/summary', icon: '📊', label: 'Summary' },
];

export default function BottomNav() {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    async function fetchCount() {
      try {
        const res = await api.get('/notifications/unread');
        setUnreadCount(res.data.count || 0);
      } catch {}
    }
    fetchCount();
    const interval = setInterval(fetchCount, 60000); // refresh every minute
    return () => clearInterval(interval);
  }, []);

  return (
    <nav className="manager-bottom-nav" style={{
      height: 'var(--nav-height)',
      background: '#1c1410',
      display: 'flex',
      alignItems: 'stretch',
      flexShrink: 0,
      boxShadow: '0 -2px 8px rgba(0,0,0,0.25)',
    }}>
      {navItems.map(item => (
        <NavLink
          key={item.to}
          className="manager-nav-link"
          to={item.to}
          end={item.exact}
          style={({ isActive }) => ({
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 2,
            color: isActive ? '#f5c97a' : 'rgba(255,255,255,0.55)',
            background: isActive ? 'rgba(200,134,10,0.2)' : 'transparent',
            borderTop: isActive ? '2px solid var(--primary)' : '2px solid transparent',
            textDecoration: 'none',
            fontSize: 10,
            fontWeight: isActive ? 600 : 400,
            position: 'relative',
          })}
        >
          <div style={{ position: 'relative' }}>
            <span style={{ fontSize: 22 }}>{item.icon}</span>
            {item.badge && unreadCount > 0 && (
              <span className="badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
            )}
          </div>
          <span>{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
