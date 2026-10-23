import React, { useState, useEffect } from 'react';
import api from '../api/client';

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    async function fetchOrders() {
      setLoading(true);
      try {
        const res = await api.get(`/orders?date=${date}`);
        setOrders(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchOrders();
  }, [date]);

  const totalRevenue = orders.reduce((s, o) => s + parseFloat(o.total_amount), 0);

  return (
    <div>
      <div className="admin-page-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700 }}>Orders</h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 14 }}>View all orders placed by the manager</p>
        </div>
        <div className="orders-date" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <label style={{ fontSize: 13, fontWeight: 500 }}>Date:</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} style={{ padding: '8px 12px', border: '1px solid var(--color-border)', borderRadius: 7, fontSize: 14 }} />
        </div>
      </div>

      <div className="orders-summary" style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
        <div style={{ padding: '14px 20px', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)' }}>
          <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 4 }}>TOTAL ORDERS</div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>{orders.length}</div>
        </div>
        <div style={{ padding: '14px 20px', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)' }}>
          <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 4 }}>TOTAL REVENUE</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--color-success)' }}>${totalRevenue.toFixed(2)}</div>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: 40, color: 'var(--color-text-muted)' }}>Loading...</div>
      ) : orders.length === 0 ? (
        <div style={{ padding: 60, textAlign: 'center', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius)', color: 'var(--color-text-muted)' }}>
          No orders found for {date}.
        </div>
      ) : (
        <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)', overflow: 'hidden' }}>
          {orders.map((order, i) => (
            <div key={order.id} style={{ borderBottom: i < orders.length - 1 ? '1px solid var(--color-border)' : 'none' }}>
              <div
                className="order-row"
                style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 16, cursor: 'pointer' }}
                onClick={() => setExpanded(expanded === order.id ? null : order.id)}
              >
                <div style={{ fontWeight: 600, fontSize: 14, minWidth: 80 }}>#{order.id}</div>
                <div style={{ flex: 1, fontSize: 13, color: 'var(--color-text-muted)' }}>
                  {new Date(order.order_date).toLocaleTimeString()} · {order.item_count} item(s) · by {order.created_by_name || 'N/A'}
                </div>
                <span style={{
                  padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                  background: order.payment_method === 'cash' ? '#dcfce7' : '#dbeafe',
                  color: order.payment_method === 'cash' ? 'var(--color-success)' : 'var(--color-info)',
                }}>
                  {order.payment_method}
                </span>
                <div style={{ fontWeight: 700, color: 'var(--color-primary)', minWidth: 80, textAlign: 'right' }}>
                  ${parseFloat(order.total_amount).toFixed(2)}
                </div>
                <span style={{ fontSize: 18, color: 'var(--color-text-muted)' }}>{expanded === order.id ? '▲' : '▼'}</span>
              </div>

              {expanded === order.id && (
                <OrderDetail orderId={order.id} />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function OrderDetail({ orderId }) {
  const [order, setOrder] = useState(null);

  useEffect(() => {
    api.get(`/orders/${orderId}`).then(res => setOrder(res.data)).catch(console.error);
  }, [orderId]);

  if (!order) return <div style={{ padding: '12px 20px', color: 'var(--color-text-muted)', fontSize: 13 }}>Loading...</div>;

  return (
    <div style={{ padding: '12px 20px 16px', background: 'var(--color-bg)', borderTop: '1px solid var(--color-border)' }}>
      {order.items?.map((item, i) => (
        <div key={i} className="order-detail-row" style={{ display: 'flex', gap: 12, padding: '6px 0', fontSize: 13 }}>
          <span style={{ fontWeight: 500, flex: 1 }}>{item.item_name}{item.variation_name ? ` (${item.variation_name})` : ''}</span>
          <span style={{ color: 'var(--color-text-muted)' }}>×{item.quantity}</span>
          <span style={{ fontWeight: 600, minWidth: 70, textAlign: 'right' }}>${parseFloat(item.subtotal).toFixed(2)}</span>
        </div>
      ))}
      {order.notes && (
        <div style={{ marginTop: 8, padding: '8px 12px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 6, fontSize: 13, color: '#92400e' }}>
          Note: {order.notes}
        </div>
      )}
    </div>
  );
}
