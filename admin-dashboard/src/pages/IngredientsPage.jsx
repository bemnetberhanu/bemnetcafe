import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import api from '../api/client';
import Modal from '../components/Modal';
import FormField, { inputStyle } from '../components/FormField';

const EMPTY_FORM = { name: '', unit_of_measure: '', current_quantity: '', reorder_level: '', reorder_quantity: '', cost_per_unit: '' };

export default function IngredientsPage() {
  const [ingredients, setIngredients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

  const fetchIngredients = useCallback(async () => {
    try {
      const res = await api.get('/ingredients');
      setIngredients(res.data);
    } catch (err) {
      toast.error('Failed to load ingredients.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchIngredients(); }, [fetchIngredients]);

  function openCreate() { setEditing(null); setForm(EMPTY_FORM); setShowModal(true); }
  function openEdit(item) { setEditing(item); setForm({ name: item.name, unit_of_measure: item.unit_of_measure, current_quantity: item.current_quantity, reorder_level: item.reorder_level, reorder_quantity: item.reorder_quantity, cost_per_unit: item.cost_per_unit }); setShowModal(true); }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) {
        await api.put(`/ingredients/${editing.id}`, form);
        toast.success('Ingredient updated.');
      } else {
        await api.post('/ingredients', form);
        toast.success('Ingredient created.');
      }
      setShowModal(false);
      fetchIngredients();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this ingredient? This cannot be undone.')) return;
    try {
      await api.delete(`/ingredients/${id}`);
      toast.success('Ingredient deleted.');
      fetchIngredients();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to delete.');
    }
  }

  const filtered = ingredients.filter(i => i.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <div className="admin-page-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700 }}>Ingredients</h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 14 }}>Manage your inventory stock levels and reorder points</p>
        </div>
        <button onClick={openCreate} style={{ padding: '10px 18px', background: 'var(--color-primary)', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
          + Add Ingredient
        </button>
      </div>

      <input
        placeholder="Search ingredients..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        style={{ ...inputStyle, maxWidth: 320, marginBottom: 16 }}
      />

      {loading ? (
        <div style={{ padding: 40, color: 'var(--color-text-muted)' }}>Loading...</div>
      ) : (
        <div className="admin-table-scroll" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ background: 'var(--color-bg)' }}>
                {['Name', 'Unit', 'Current Stock', 'Reorder Level', 'Reorder Qty', 'Cost/Unit', 'Status', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid var(--color-border)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(item => (
                <tr key={item.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <td style={{ padding: '12px 16px', fontWeight: 500 }}>{item.name}</td>
                  <td style={{ padding: '12px 16px', color: 'var(--color-text-muted)' }}>{item.unit_of_measure}</td>
                  <td style={{ padding: '12px 16px', fontWeight: 600, color: item.is_low_stock ? 'var(--color-danger)' : 'var(--color-success)' }}>
                    {parseFloat(item.current_quantity)}
                  </td>
                  <td style={{ padding: '12px 16px' }}>{parseFloat(item.reorder_level)}</td>
                  <td style={{ padding: '12px 16px' }}>{parseFloat(item.reorder_quantity)}</td>
                  <td style={{ padding: '12px 16px' }}>${parseFloat(item.cost_per_unit).toFixed(2)}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{
                      padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                      background: item.is_low_stock ? '#fee2e2' : '#dcfce7',
                      color: item.is_low_stock ? 'var(--color-danger)' : 'var(--color-success)',
                    }}>
                      {item.is_low_stock ? '⚠️ Low' : '✅ OK'}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <button onClick={() => openEdit(item)} style={{ marginRight: 8, padding: '5px 12px', background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: 6, fontSize: 13, cursor: 'pointer' }}>Edit</button>
                    <button onClick={() => handleDelete(item.id)} style={{ padding: '5px 12px', background: '#fee2e2', border: '1px solid #fecaca', color: 'var(--color-danger)', borderRadius: 6, fontSize: 13, cursor: 'pointer' }}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--color-text-muted)' }}>No ingredients found.</div>
          )}
        </div>
      )}

      {showModal && (
        <Modal title={editing ? 'Edit Ingredient' : 'Add Ingredient'} onClose={() => setShowModal(false)}>
          <form onSubmit={handleSave}>
            <FormField label="Name" required>
              <input required style={inputStyle} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g., Beef" />
            </FormField>
            <FormField label="Unit of Measure" required>
              <input required style={inputStyle} value={form.unit_of_measure} onChange={e => setForm({ ...form, unit_of_measure: e.target.value })} placeholder="kg, liters, pieces..." />
            </FormField>
            <div className="admin-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <FormField label="Current Quantity">
                <input type="number" step="0.001" min="0" style={inputStyle} value={form.current_quantity} onChange={e => setForm({ ...form, current_quantity: e.target.value })} placeholder="0" />
              </FormField>
              <FormField label="Reorder Level" required>
                <input required type="number" step="0.001" min="0" style={inputStyle} value={form.reorder_level} onChange={e => setForm({ ...form, reorder_level: e.target.value })} placeholder="5" />
              </FormField>
              <FormField label="Reorder Quantity" required>
                <input required type="number" step="0.001" min="0" style={inputStyle} value={form.reorder_quantity} onChange={e => setForm({ ...form, reorder_quantity: e.target.value })} placeholder="10" />
              </FormField>
              <FormField label="Cost per Unit ($)" required>
                <input required type="number" step="0.01" min="0" style={inputStyle} value={form.cost_per_unit} onChange={e => setForm({ ...form, cost_per_unit: e.target.value })} placeholder="8.50" />
              </FormField>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
              <button type="button" onClick={() => setShowModal(false)} style={{ padding: '9px 18px', background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: 7, fontSize: 14, cursor: 'pointer' }}>Cancel</button>
              <button type="submit" disabled={saving} style={{ padding: '9px 18px', background: 'var(--color-primary)', color: '#fff', border: 'none', borderRadius: 7, fontSize: 14, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer' }}>
                {saving ? 'Saving...' : (editing ? 'Update' : 'Create')}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
