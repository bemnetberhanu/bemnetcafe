import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import api from '../api/client';
import Modal from '../components/Modal';
import FormField, { inputStyle } from '../components/FormField';

const EXPENSE_CATEGORIES = ['Rent', 'Electricity', 'Water', 'Gas', 'Staff Salary', 'Cleaning', 'Marketing', 'Maintenance', 'Other'];

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ expense_date: new Date().toISOString().split('T')[0], category: EXPENSE_CATEGORIES[0], amount: '', description: '' });
  const [saving, setSaving] = useState(false);

  const fetchExpenses = useCallback(async () => {
    try {
      const res = await api.get('/expenses');
      setExpenses(res.data);
    } catch (err) {
      toast.error('Failed to load expenses.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchExpenses(); }, [fetchExpenses]);

  function openCreate() {
    setEditing(null);
    setForm({ expense_date: new Date().toISOString().split('T')[0], category: EXPENSE_CATEGORIES[0], amount: '', description: '' });
    setShowModal(true);
  }

  function openEdit(item) {
    setEditing(item);
    setForm({ expense_date: item.expense_date?.split('T')[0], category: item.category, amount: item.amount, description: item.description || '' });
    setShowModal(true);
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) {
        await api.put(`/expenses/${editing.id}`, form);
        toast.success('Expense updated.');
      } else {
        await api.post('/expenses', form);
        toast.success('Expense recorded.');
      }
      setShowModal(false);
      fetchExpenses();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this expense?')) return;
    try {
      await api.delete(`/expenses/${id}`);
      toast.success('Expense deleted.');
      fetchExpenses();
    } catch (err) {
      toast.error('Failed to delete.');
    }
  }

  const totalThisMonth = expenses
    .filter(e => new Date(e.expense_date).getMonth() === new Date().getMonth())
    .reduce((s, e) => s + parseFloat(e.amount), 0);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700 }}>Operating Expenses</h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 14 }}>
            Track all business costs · This month: <strong style={{ color: 'var(--color-danger)' }}>${totalThisMonth.toFixed(2)}</strong>
          </p>
        </div>
        <button onClick={openCreate} style={{ padding: '10px 18px', background: 'var(--color-primary)', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
          + Add Expense
        </button>
      </div>

      {loading ? (
        <div style={{ padding: 40, color: 'var(--color-text-muted)' }}>Loading...</div>
      ) : (
        <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ background: 'var(--color-bg)' }}>
                {['Date', 'Category', 'Amount', 'Description', 'Recorded By', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid var(--color-border)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {expenses.map(item => (
                <tr key={item.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <td style={{ padding: '12px 16px' }}>{new Date(item.expense_date).toLocaleDateString()}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ padding: '3px 10px', borderRadius: 20, background: '#f3f4f6', fontSize: 12, fontWeight: 500 }}>
                      {item.category}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--color-danger)' }}>${parseFloat(item.amount).toFixed(2)}</td>
                  <td style={{ padding: '12px 16px', color: 'var(--color-text-muted)' }}>{item.description || '—'}</td>
                  <td style={{ padding: '12px 16px', color: 'var(--color-text-muted)' }}>{item.created_by_name || '—'}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <button onClick={() => openEdit(item)} style={{ marginRight: 8, padding: '5px 12px', background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: 6, fontSize: 13, cursor: 'pointer' }}>Edit</button>
                    <button onClick={() => handleDelete(item.id)} style={{ padding: '5px 12px', background: '#fee2e2', border: '1px solid #fecaca', color: 'var(--color-danger)', borderRadius: 6, fontSize: 13, cursor: 'pointer' }}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {expenses.length === 0 && (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--color-text-muted)' }}>No expenses recorded yet.</div>
          )}
        </div>
      )}

      {showModal && (
        <Modal title={editing ? 'Edit Expense' : 'Add Expense'} onClose={() => setShowModal(false)}>
          <form onSubmit={handleSave}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <FormField label="Date" required>
                <input required type="date" style={inputStyle} value={form.expense_date} onChange={e => setForm({ ...form, expense_date: e.target.value })} />
              </FormField>
              <FormField label="Amount ($)" required>
                <input required type="number" step="0.01" min="0.01" style={inputStyle} value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} placeholder="50.00" />
              </FormField>
            </div>
            <FormField label="Category" required>
              <select required style={inputStyle} value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </FormField>
            <FormField label="Description">
              <input style={inputStyle} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="e.g., Monthly electricity bill" />
            </FormField>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
              <button type="button" onClick={() => setShowModal(false)} style={{ padding: '9px 18px', background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: 7, fontSize: 14, cursor: 'pointer' }}>Cancel</button>
              <button type="submit" disabled={saving} style={{ padding: '9px 18px', background: 'var(--color-primary)', color: '#fff', border: 'none', borderRadius: 7, fontSize: 14, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer' }}>
                {saving ? 'Saving...' : (editing ? 'Update' : 'Record')}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
