import React from 'react';

export default function StatCard({ label, value, icon, color = 'var(--color-primary)', sub }) {
  return (
    <div style={{
      background: 'var(--color-surface)',
      border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius)',
      padding: '20px 24px',
      boxShadow: 'var(--shadow)',
      display: 'flex',
      alignItems: 'flex-start',
      gap: 16,
    }}>
      <div style={{
        width: 48,
        height: 48,
        borderRadius: 12,
        background: `${color}18`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 22,
        flexShrink: 0,
      }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 4 }}>{label}</div>
        <div style={{ fontSize: 24, fontWeight: 700, color }}>{value}</div>
        {sub && <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 4 }}>{sub}</div>}
      </div>
    </div>
  );
}
