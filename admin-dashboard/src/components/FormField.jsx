import React from 'react';

export default function FormField({ label, error, children, required }) {
  return (
    <div style={{ marginBottom: 16 }}>
      {label && (
        <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6, color: 'var(--color-text)' }}>
          {label} {required && <span style={{ color: 'var(--color-danger)' }}>*</span>}
        </label>
      )}
      {children}
      {error && <div style={{ fontSize: 12, color: 'var(--color-danger)', marginTop: 4 }}>{error}</div>}
    </div>
  );
}

export const inputStyle = {
  width: '100%',
  padding: '9px 12px',
  border: '1px solid var(--color-border)',
  borderRadius: 7,
  fontSize: 14,
  background: 'var(--color-surface)',
  outline: 'none',
  color: 'var(--color-text)',
  transition: 'border-color 0.15s',
};
