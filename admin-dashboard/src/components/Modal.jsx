import React, { useEffect } from 'react';

export default function Modal({ title, onClose, children, width = 560 }) {
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      className="admin-modal-overlay"
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24,
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="admin-modal" style={{
        background: 'var(--color-surface)',
        borderRadius: 12,
        boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
        width: '100%',
        maxWidth: width,
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
      }}>
        <div className="admin-modal-heading" style={{
          padding: '16px 24px',
          borderBottom: '1px solid var(--color-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <h3 style={{ fontSize: 17, fontWeight: 600 }}>{title}</h3>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', fontSize: 20, color: 'var(--color-text-muted)', lineHeight: 1 }}
            aria-label="Close modal"
          >
            ×
          </button>
        </div>
        <div className="admin-modal-body" style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
          {children}
        </div>
      </div>
    </div>
  );
}
