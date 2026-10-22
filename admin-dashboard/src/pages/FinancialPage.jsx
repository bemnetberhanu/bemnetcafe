import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';
import api from '../api/client';
import StatCard from '../components/StatCard';

const PRESETS = {
  today: () => {
    const d = new Date(); d.setHours(0,0,0,0);
    const e = new Date(); e.setHours(23,59,59,999);
    return { start: d.toISOString(), end: e.toISOString(), group: 'day' };
  },
  this_week: () => {
    const now = new Date();
    const start = new Date(now); start.setDate(now.getDate() - now.getDay()); start.setHours(0,0,0,0);
    const end = new Date(now); end.setHours(23,59,59,999);
    return { start: start.toISOString(), end: end.toISOString(), group: 'day' };
  },
  this_month: () => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();
    return { start, end, group: 'day' };
  },
  last_3_months: () => {
    const end = new Date(); end.setHours(23,59,59,999);
    const start = new Date(); start.setMonth(start.getMonth() - 3); start.setHours(0,0,0,0);
    return { start: start.toISOString(), end: end.toISOString(), group: 'week' };
  },
};

export default function FinancialPage() {
  const [report, setReport] = useState(null);
  const [preset, setPreset] = useState('this_month');
  const [loading, setLoading] = useState(true);

  async function fetchReport() {
    setLoading(true);
    const { start, end, group } = PRESETS[preset]();
    try {
      const res = await api.get(`/analytics/financial?start_date=${start}&end_date=${end}&group_by=${group}`);
      setReport(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchReport(); }, [preset]);

  const chartData = report?.chart_data?.map(d => ({
    date: new Date(d.period).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    Revenue: parseFloat(d.revenue.toFixed(2)),
    Profit: parseFloat(d.profit.toFixed(2)),
  })) || [];

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700 }}>Financial Report</h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 14 }}>Revenue, costs, and profit overview</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {Object.keys(PRESETS).map(key => (
            <button
              key={key}
              onClick={() => setPreset(key)}
              style={{
                padding: '8px 14px', borderRadius: 7, fontSize: 13, fontWeight: 500,
                background: preset === key ? 'var(--color-primary)' : 'var(--color-surface)',
                color: preset === key ? '#fff' : 'var(--color-text)',
                border: '1px solid var(--color-border)',
                cursor: 'pointer',
              }}
            >
              {key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ padding: 40, color: 'var(--color-text-muted)' }}>Loading...</div>
      ) : report && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 24 }}>
            <StatCard label="Total Revenue" value={`$${report.summary.revenue.toFixed(2)}`} icon="📈" color="var(--color-success)" />
            <StatCard label="Cost of Goods Sold" value={`$${report.summary.cogs.toFixed(2)}`} icon="🥩" color="var(--color-warning)" />
            <StatCard label="Gross Profit" value={`$${report.summary.gross_profit.toFixed(2)}`} icon="💵" color="var(--color-info)" />
            <StatCard label="Operating Costs" value={`$${report.summary.operating_costs.toFixed(2)}`} icon="🏢" color="#7c3aed" />
            <StatCard
              label="Net Profit"
              value={`$${report.summary.net_profit.toFixed(2)}`}
              icon="🏆"
              color={report.summary.net_profit >= 0 ? 'var(--color-success)' : 'var(--color-danger)'}
              sub={`${report.summary.profit_margin}% margin`}
            />
          </div>

          <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius)', padding: 24, boxShadow: 'var(--shadow)', marginBottom: 20 }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Revenue vs Profit Over Time</h3>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} tickFormatter={v => `$${v}`} />
                  <Tooltip formatter={(v) => `$${v}`} />
                  <Legend />
                  <Line type="monotone" dataKey="Revenue" stroke="#16a34a" strokeWidth={2.5} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="Profit" stroke="var(--color-primary)" strokeWidth={2.5} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)' }}>
                No data for this period.
              </div>
            )}
          </div>

          <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius)', padding: 24, boxShadow: 'var(--shadow)' }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Revenue Breakdown</h3>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} tickFormatter={v => `$${v}`} />
                  <Tooltip formatter={(v) => `$${v}`} />
                  <Legend />
                  <Bar dataKey="Revenue" fill="#16a34a" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Profit" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)' }}>
                No data for this period.
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
