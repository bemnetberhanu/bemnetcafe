import React, { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import api from '../api/client';
import StatCard from '../components/StatCard';

export default function DashboardPage() {
  const [summary, setSummary] = useState(null);
  const [financial, setFinancial] = useState(null);
  const [lowStock, setLowStock] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const today = new Date();
        const start = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();
        const end = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59).toISOString();

        const [summaryRes, financialRes, stockRes] = await Promise.all([
          api.get('/analytics/daily-summary'),
          api.get(`/analytics/financial?start_date=${start}&end_date=${end}&group_by=day`),
          api.get('/ingredients'),
        ]);

        setSummary(summaryRes.data);
        setFinancial(financialRes.data);
        setLowStock(stockRes.data.filter(i => i.is_low_stock));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) return <div style={{ padding: 40, color: 'var(--color-text-muted)' }}>Loading dashboard...</div>;

  const chartData = financial?.chart_data?.map(d => ({
    date: new Date(d.period).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    Revenue: d.revenue.toFixed(2),
    Profit: d.profit.toFixed(2),
  })) || [];

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 6 }}>Dashboard</h1>
      <p style={{ color: 'var(--color-text-muted)', marginBottom: 24, fontSize: 14 }}>
        Today's snapshot — {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
      </p>

      {/* Today's Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 28 }}>
        <StatCard
          label="Today's Revenue"
          value={`$${summary?.total_revenue?.toFixed(2) || '0.00'}`}
          icon="💰"
          color="var(--color-success)"
          sub={`${summary?.order_count || 0} orders`}
        />
        <StatCard
          label="Cash Sales"
          value={`$${summary?.cash_revenue?.toFixed(2) || '0.00'}`}
          icon="💵"
          color="var(--color-primary)"
        />
        <StatCard
          label="Card Sales"
          value={`$${summary?.card_revenue?.toFixed(2) || '0.00'}`}
          icon="💳"
          color="var(--color-info)"
        />
        <StatCard
          label="Today's COGS"
          value={`$${summary?.cogs?.toFixed(2) || '0.00'}`}
          icon="🥩"
          color="var(--color-warning)"
        />
        <StatCard
          label="Today's Operating Expenses"
          value={`$${summary?.operating_costs?.toFixed(2) || '0.00'}`}
          icon="🏢"
          color="var(--color-info)"
        />
        <StatCard
          label={summary?.net_profit < 0 ? "Today's Net Loss" : "Today's Net Profit"}
          value={`$${summary?.net_profit?.toFixed(2) || '0.00'}`}
          icon={summary?.net_profit < 0 ? '❌' : '🏆'}
          color={summary?.net_profit < 0 ? 'var(--color-danger)' : 'var(--color-success)'}
          sub={`${summary?.profit_margin || '0.00'}% margin`}
        />
        <StatCard
          label="Today's Purchases (separate)"
          value={`$${summary?.purchase_costs?.toFixed(2) || '0.00'}`}
          icon="📦"
          color="var(--color-primary)"
        />
        <StatCard
          label="Low Stock Alerts"
          value={lowStock.length}
          icon="⚠️"
          color={lowStock.length > 0 ? 'var(--color-danger)' : 'var(--color-success)'}
          sub={lowStock.length > 0 ? 'Items need restocking' : 'All items in stock'}
        />
      </div>

      {/* Monthly Stats */}
      {financial && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16, marginBottom: 28 }}>
          <StatCard label="Monthly Revenue" value={`$${financial.summary.revenue.toFixed(2)}`} icon="📈" color="var(--color-success)" />
          <StatCard label="Monthly COGS" value={`$${financial.summary.cogs.toFixed(2)}`} icon="🥩" color="var(--color-warning)" />
          <StatCard label="Operating Costs" value={`$${financial.summary.operating_costs.toFixed(2)}`} icon="🏢" color="var(--color-info)" />
          <StatCard label="Purchases (separate)" value={`$${Number(financial.summary.purchase_costs || 0).toFixed(2)}`} icon="📦" color="var(--color-primary)" />
          <StatCard label={financial.summary.net_profit >= 0 ? 'Net Profit' : 'Net Loss'} value={`$${financial.summary.net_profit.toFixed(2)}`} icon={financial.summary.net_profit >= 0 ? '🏆' : '❌'} color={financial.summary.net_profit >= 0 ? 'var(--color-success)' : 'var(--color-danger)'} sub={`${financial.summary.profit_margin}% margin`} />
        </div>
      )}

      <div className="dashboard-main-grid" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20 }}>
        {/* Revenue vs Profit chart */}
        <div className="dashboard-panel" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius)', padding: 24, boxShadow: 'var(--shadow)' }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Revenue vs Profit — This Month</h3>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={v => `$${v}`} />
                <Tooltip formatter={(v) => `$${parseFloat(v).toFixed(2)}`} />
                <Legend />
                <Line type="monotone" dataKey="Revenue" stroke="var(--color-success)" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="Profit" stroke="var(--color-primary)" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)' }}>
              No sales data for this month yet.
            </div>
          )}
        </div>

        {/* Low stock panel */}
        <div className="dashboard-panel" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius)', padding: 24, boxShadow: 'var(--shadow)' }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>
            ⚠️ Low Stock Alerts {lowStock.length > 0 && <span style={{ background: 'var(--color-danger)', color: '#fff', borderRadius: 12, padding: '2px 8px', fontSize: 12, marginLeft: 8 }}>{lowStock.length}</span>}
          </h3>
          {lowStock.length === 0 ? (
            <div style={{ color: 'var(--color-text-muted)', fontSize: 14, paddingTop: 8 }}>
              ✅ All ingredients are sufficiently stocked.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {lowStock.map(item => (
                <div key={item.id} style={{
                  padding: '10px 14px',
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: 8,
                  fontSize: 13,
                }}>
                  <div style={{ fontWeight: 600, color: 'var(--color-danger)' }}>{item.name}</div>
                  <div style={{ color: 'var(--color-text-muted)', marginTop: 2 }}>
                    Stock: {item.current_quantity} {item.unit_of_measure} (reorder at {item.reorder_level})
                  </div>
                  <div style={{ color: 'var(--color-text-muted)' }}>
                    Buy: {item.reorder_quantity} {item.unit_of_measure}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Today's top items */}
      {summary?.top_items_today?.length > 0 && (
        <div style={{ marginTop: 20, background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius)', padding: 24, boxShadow: 'var(--shadow)' }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Today's Top Selling Items</h3>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {summary.top_items_today.map((item, i) => (
              <div key={i} style={{
                padding: '10px 18px',
                background: i === 0 ? 'var(--color-primary-light)' : 'var(--color-bg)',
                border: '1px solid var(--color-border)',
                borderRadius: 8,
                fontSize: 13,
              }}>
                <span style={{ fontWeight: 600 }}>#{i + 1} {item.item}</span>
                <span style={{ marginLeft: 8, color: 'var(--color-text-muted)' }}>{item.qty_sold} sold</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
