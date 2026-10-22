import React, { useState, useEffect } from 'react';
import api from '../api/client';

export default function DailySummaryPage() {
  const [summary, setSummary] = useState(null);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get(`/analytics/daily-summary?date=${date}`)
      .then(res => setSummary(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [date]);

  return (
    <div className="page-content">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ fontSize: 17, fontWeight: 700 }}>Daily Summary</h2>
        <input
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
          style={{ padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 9, fontSize: 13 }}
        />
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', paddingTop: 40, color: 'var(--muted)' }}>Loading...</div>
      ) : summary && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
            <SumCard icon="🧾" label="Total Orders" value={summary.order_count} color="#2563eb" />
            <SumCard icon="💰" label="Total Revenue" value={`$${summary.total_revenue.toFixed(2)}`} color="var(--success)" />
            <SumCard icon="💵" label="Cash Sales" value={`$${summary.cash_revenue.toFixed(2)}`} color="var(--primary)" />
            <SumCard icon="💳" label="Card Sales" value={`$${summary.card_revenue.toFixed(2)}`} color="#7c3aed" />
          </div>

          {summary.top_items_today?.length > 0 && (
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 16 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>🏆 Today's Top Items</h3>
              {summary.top_items_today.map((item, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: i < summary.top_items_today.length - 1 ? '1px solid var(--border)' : 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: '50%',
                      background: i === 0 ? '#ffd700' : i === 1 ? '#e5e7eb' : '#f3f4f6',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 12, fontWeight: 700,
                    }}>
                      {i + 1}
                    </div>
                    <span style={{ fontSize: 14, fontWeight: 500 }}>{item.item}</span>
                  </div>
                  <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--primary)' }}>{item.qty_sold} sold</span>
                </div>
              ))}
            </div>
          )}

          {summary.order_count === 0 && (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--muted)' }}>
              <div style={{ fontSize: 36, marginBottom: 10 }}>📭</div>
              <div style={{ fontSize: 15, fontWeight: 600 }}>No orders on {date}</div>
              <div style={{ fontSize: 13, marginTop: 4 }}>Use the POS screen to add orders.</div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function SumCard({ icon, label, value, color }) {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px' }}>
      <div style={{ fontSize: 22, marginBottom: 6 }}>{icon}</div>
      <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 800, color }}>{value}</div>
    </div>
  );
}
