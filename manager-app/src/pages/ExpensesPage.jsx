import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import api from '../api/client';
import { expenseCategoryLabel } from '../amharic';

const EXPENSE_CATEGORIES = ['Rent', 'Electricity', 'Water', 'Gas', 'Staff Salary', 'Cleaning', 'Marketing', 'Maintenance', 'Other'];

export default function ExpensesPage() {
  const [form, setForm] = useState({ expense_date: new Date().toISOString().split('T')[0], category: EXPENSE_CATEGORIES[0], amount: '', description: '' });
  const [submitting, setSubmitting] = useState(false);
  const [recent, setRecent] = useState([]);

  useEffect(() => {
    api.get('/expenses').then(res => setRecent(res.data.slice(0, 10))).catch(() => {});
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/expenses', form);
      toast.success('✅ ወጪው ተመዝግቧል።');
      setForm({ expense_date: new Date().toISOString().split('T')[0], category: EXPENSE_CATEGORIES[0], amount: '', description: '' });
      const res = await api.get('/expenses');
      setRecent(res.data.slice(0, 10));
    } catch (err) {
      toast.error(err.response?.data?.error || 'ወጪውን መመዝገብ አልተሳካም።');
    } finally {
      setSubmitting(false);
    }
  }

  const iStyle = { width: '100%', padding: '11px 13px', border: '1px solid var(--border)', borderRadius: 10, fontSize: 14, background: '#fff', outline: 'none' };

  return (
    <div className="page-content">
      <h2 style={{ fontSize: 17, fontWeight: 700, marginBottom: 4 }}>ወጪ ጨምር</h2>
      <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 16 }}>እንደ ኪራይ፣ መብራት፣ ደመወዝ ያሉ የሥራ ማስኬጃ ወጪዎችን ይመዝግቡ።</p>

      <form onSubmit={handleSubmit}>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 16, marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="expense-date-amount">
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 500, marginBottom: 4, color: 'var(--muted)' }}>ቀን</label>
              <input type="date" required style={iStyle} value={form.expense_date} onChange={e => setForm({ ...form, expense_date: e.target.value })} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 500, marginBottom: 4, color: 'var(--muted)' }}>መጠን ($)</label>
              <input type="number" step="0.01" min="0.01" required placeholder="50.00" style={iStyle} value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} />
            </div>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 500, marginBottom: 4, color: 'var(--muted)' }}>ምድብ</label>
            <select required style={iStyle} value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
              {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{expenseCategoryLabel(c)}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 500, marginBottom: 4, color: 'var(--muted)' }}>መግለጫ</label>
            <input placeholder="ለምሳሌ፡ የወር የመብራት ክፍያ" style={iStyle} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting}
          style={{ width: '100%', padding: 14, background: submitting ? '#ccc' : 'var(--primary)', color: '#fff', border: 'none', borderRadius: 11, fontSize: 16, fontWeight: 700, cursor: submitting ? 'not-allowed' : 'pointer' }}
        >
          {submitting ? 'በመመዝገብ ላይ...' : '🧾 ወጪ መዝግብ'}
        </button>
      </form>

      {recent.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 10 }}>የቅርብ ጊዜ ወጪዎች</h3>
          {recent.map(item => (
            <div key={item.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 14px', marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{expenseCategoryLabel(item.category)}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>{item.description || '—'} · {new Date(item.expense_date).toLocaleDateString('am-ET')}</div>
              </div>
              <div style={{ fontWeight: 700, color: 'var(--danger)' }}>${parseFloat(item.amount).toFixed(2)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
