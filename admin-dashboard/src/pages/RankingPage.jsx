import React, { useEffect, useState } from 'react';
import api from '../api/client';

export default function RankingPage() {
  const [ranking, setRanking] = useState(null);
  const [patterns, setPatterns] = useState([]);
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const [rankRes, patRes] = await Promise.all([
          api.get(`/analytics/ranking?days=${days}`),
          api.get('/analytics/patterns'),
        ]);
        setRanking(rankRes.data);
        setPatterns(patRes.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [days]);

  return (
    <div>
      <div className="admin-page-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700 }}>Sales Ranking & Patterns</h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 14 }}>Best sellers, worst sellers, and day-of-week trends</p>
        </div>
        <select
          value={days}
          onChange={e => setDays(Number(e.target.value))}
          style={{ padding: '8px 14px', borderRadius: 7, border: '1px solid var(--color-border)', fontSize: 13 }}
        >
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
        </select>
      </div>

      {loading ? (
        <div style={{ padding: 40, color: 'var(--color-text-muted)' }}>Loading...</div>
      ) : (
        <div className="ranking-columns" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
          {/* Top Sellers */}
          <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius)', padding: 24, boxShadow: 'var(--shadow)' }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>🏆 Top Sellers</h3>
            {ranking?.top_sellers?.length === 0 ? (
              <div style={{ color: 'var(--color-text-muted)', fontSize: 14 }}>No sales data yet.</div>
            ) : (
              ranking?.top_sellers?.map((item, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 0', borderBottom: i < ranking.top_sellers.length - 1 ? '1px solid var(--color-border)' : 'none'
                }}>
                  <div style={{
                    width: 30, height: 30, borderRadius: '50%',
                    background: i === 0 ? '#ffd700' : i === 1 ? '#c0c0c0' : i === 2 ? '#cd7f32' : 'var(--color-bg)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 700, fontSize: 13, flexShrink: 0,
                  }}>
                    {i + 1}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 500, fontSize: 14 }}>{item.item_name}</div>
                    <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{item.category}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--color-success)' }}>{item.total_sold} sold</div>
                    <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>${item.total_revenue.toFixed(2)}</div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Worst Sellers */}
          <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius)', padding: 24, boxShadow: 'var(--shadow)' }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>📉 Needs Attention</h3>
            {ranking?.worst_sellers?.length === 0 ? (
              <div style={{ color: 'var(--color-text-muted)', fontSize: 14 }}>No data yet.</div>
            ) : (
              ranking?.worst_sellers?.map((item, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 0', borderBottom: i < ranking.worst_sellers.length - 1 ? '1px solid var(--color-border)' : 'none'
                }}>
                  <div style={{
                    width: 30, height: 30, borderRadius: '50%',
                    background: '#fee2e2',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 700, fontSize: 13, color: 'var(--color-danger)', flexShrink: 0,
                  }}>
                    {i + 1}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 500, fontSize: 14 }}>{item.item_name}</div>
                    <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{item.category}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--color-danger)' }}>{item.total_sold} sold</div>
                    <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>${item.total_revenue.toFixed(2)}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Day-of-week patterns */}
      <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius)', padding: 24, boxShadow: 'var(--shadow)' }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>📅 Day-of-Week Sales Patterns</h3>
        {patterns.length === 0 ? (
          <div style={{ color: 'var(--color-text-muted)', fontSize: 14 }}>
            Not enough data yet. Patterns appear after orders are recorded across multiple days.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
            {patterns.map((day, i) => (
              <div key={i} style={{
                padding: '14px 16px',
                background: 'var(--color-bg)',
                border: '1px solid var(--color-border)',
                borderRadius: 8,
              }}>
                <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6, color: 'var(--color-primary)' }}>
                  {day.day_of_week}
                </div>
                <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 4 }}>
                  🥇 {day.top_seller}
                </div>
                <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                  Avg {day.avg_sales} units/day
                </div>
                {day.all_items?.slice(1, 3).map((it, j) => (
                  <div key={j} style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>
                    • {it.item} (avg {it.avg_per_day})
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
