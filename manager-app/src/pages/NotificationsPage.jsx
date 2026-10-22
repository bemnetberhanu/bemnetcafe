import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import api from '../api/client';

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [lowStock, setLowStock] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [notifRes, stockRes] = await Promise.all([
        api.get('/notifications?limit=30'),
        api.get('/ingredients'),
      ]);
      setNotifications(notifRes.data.notifications);
      setUnreadCount(notifRes.data.unread_count);
      setLowStock(stockRes.data.filter(i => i.is_low_stock));
    } catch (err) {
      toast.error('Failed to load notifications.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function markAllRead() {
    try {
      await api.patch('/notifications/all/read');
      setUnreadCount(0);
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      toast.success('All notifications marked as read.');
    } catch {}
  }

  async function markOneRead(id) {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch {}
  }

  if (loading) return <div className="page-content" style={{ textAlign: 'center', color: 'var(--muted)', paddingTop: 40 }}>Loading...</div>;

  return (
    <div className="page-content">
      {/* Low stock inventory hub */}
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 10 }}>
          🔴 Low Stock Inventory
          {lowStock.length > 0 && (
            <span style={{ marginLeft: 8, background: 'var(--danger)', color: '#fff', borderRadius: 12, padding: '2px 8px', fontSize: 12 }}>
              {lowStock.length}
            </span>
          )}
        </h2>
        {lowStock.length === 0 ? (
          <div style={{ padding: '16px', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 10, fontSize: 13, color: 'var(--success)', fontWeight: 600 }}>
            ✅ All ingredients are sufficiently stocked!
          </div>
        ) : (
          lowStock.map(item => (
            <div key={item.id} style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '12px 14px', marginBottom: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--danger)' }}>⚠️ {item.name}</div>
                <span style={{ fontSize: 11, background: '#fee2e2', color: 'var(--danger)', padding: '2px 8px', borderRadius: 20, fontWeight: 600 }}>LOW</span>
              </div>
              <div style={{ fontSize: 13, color: '#7f1d1d', marginTop: 4 }}>
                Current: <strong>{parseFloat(item.current_quantity)} {item.unit_of_measure}</strong>
                · Reorder at: {parseFloat(item.reorder_level)} {item.unit_of_measure}
              </div>
              <div style={{ fontSize: 13, color: '#7f1d1d', marginTop: 2 }}>
                Please buy: <strong>{parseFloat(item.reorder_quantity)} {item.unit_of_measure}</strong>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Notifications log */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700 }}>
            🔔 Notification Log
            {unreadCount > 0 && (
              <span style={{ marginLeft: 8, background: 'var(--danger)', color: '#fff', borderRadius: 12, padding: '2px 8px', fontSize: 12 }}>
                {unreadCount} unread
              </span>
            )}
          </h2>
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              style={{ padding: '6px 12px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 7, fontSize: 12, cursor: 'pointer' }}
            >
              Mark all read
            </button>
          )}
        </div>

        {notifications.length === 0 ? (
          <div style={{ padding: '20px', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
            No notifications yet.
          </div>
        ) : (
          notifications.map(n => (
            <div
              key={n.id}
              onClick={() => !n.is_read && markOneRead(n.id)}
              style={{
                background: n.is_read ? 'var(--surface)' : '#fffbeb',
                border: `1px solid ${n.is_read ? 'var(--border)' : '#fde68a'}`,
                borderRadius: 10, padding: '11px 14px', marginBottom: 8,
                cursor: n.is_read ? 'default' : 'pointer',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                <div style={{ fontSize: 13, color: n.is_read ? 'var(--text)' : '#92400e', flex: 1 }}>
                  {n.message}
                </div>
                {!n.is_read && (
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--warning)', flexShrink: 0, marginTop: 4 }} />
                )}
              </div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
                {new Date(n.created_at).toLocaleString()}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
