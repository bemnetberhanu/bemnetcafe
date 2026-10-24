import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import api from '../api/client';
import { itemLabel, unitLabel } from '../amharic';

export default function PurchasesPage() {
  const [ingredients, setIngredients] = useState([]);
  const [supplierName, setSupplierName] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState([{ ingredient_id: '', quantity_bought: '', cost_per_unit_at_time: '' }]);
  const [submitting, setSubmitting] = useState(false);
  const [recentPurchases, setRecentPurchases] = useState([]);

  useEffect(() => {
    api.get('/ingredients').then(res => setIngredients(res.data)).catch(() => {});
    api.get('/purchases?limit=5').then(res => setRecentPurchases(res.data)).catch(() => {});
  }, []);

  function addRow() {
    setItems(prev => [...prev, { ingredient_id: '', quantity_bought: '', cost_per_unit_at_time: '' }]);
  }

  function removeRow(i) {
    setItems(prev => prev.filter((_, idx) => idx !== i));
  }

  function updateRow(i, field, value) {
    setItems(prev => prev.map((row, idx) => idx === i ? { ...row, [field]: value } : row));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const validItems = items.filter(i => i.ingredient_id && i.quantity_bought && i.cost_per_unit_at_time);
    if (validItems.length === 0) return toast.error('ቢያንስ አንድ ዕቃ ያክሉ።');
    setSubmitting(true);
    try {
      await api.post('/purchases', { supplier_name: supplierName, notes, items: validItems });
      toast.success('✅ ግዥው ተመዝግቧል! ክምችቱ ተዘምኗል።');
      setSupplierName('');
      setNotes('');
      setItems([{ ingredient_id: '', quantity_bought: '', cost_per_unit_at_time: '' }]);
      const res = await api.get('/purchases?limit=5');
      setRecentPurchases(res.data);
    } catch (err) {
      toast.error(err.response?.data?.error || 'ግዥውን መመዝገብ አልተሳካም።');
    } finally {
      setSubmitting(false);
    }
  }

  const totalCost = items.reduce((s, i) => s + (parseFloat(i.quantity_bought) || 0) * (parseFloat(i.cost_per_unit_at_time) || 0), 0);

  const iStyle = { width: '100%', padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 9, fontSize: 14, background: '#fff', outline: 'none' };

  return (
    <div className="page-content">
      <h2 style={{ fontSize: 17, fontWeight: 700, marginBottom: 4 }}>ግዥ መዝግብ</h2>
      <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 16 }}>ጥሬ ዕቃዎችን መሙላት ዝቅተኛ የክምችት ማሳወቂያዎችን በራስ-ሰር ያጠፋል።</p>

      <form onSubmit={handleSubmit}>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 16, marginBottom: 16 }}>
          <input
            placeholder="የአቅራቢ ስም (አማራጭ)"
            value={supplierName}
            onChange={e => setSupplierName(e.target.value)}
            style={{ ...iStyle, marginBottom: 10 }}
          />
          <input
            placeholder="ማስታወሻ (አማራጭ)"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            style={iStyle}
          />
        </div>

        <div style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <span style={{ fontSize: 14, fontWeight: 600 }}>ዕቃዎች</span>
            <button type="button" onClick={addRow} style={{ padding: '6px 12px', background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 7, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>+ ረድፍ ጨምር</button>
          </div>

          {items.map((row, i) => (
            <div key={i} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: 12, marginBottom: 10 }}>
              <select
                value={row.ingredient_id}
                onChange={e => updateRow(i, 'ingredient_id', e.target.value)}
                style={{ ...iStyle, marginBottom: 8 }}
              >
                <option value="">ጥሬ ዕቃ ይምረጡ...</option>
                {ingredients.map(ing => (
                  <option key={ing.id} value={ing.id}>
                    {itemLabel(ing.name)} ({unitLabel(ing.unit_of_measure)}) — ክምችት: {parseFloat(ing.current_quantity)} {ing.is_low_stock ? '⚠️' : '✅'}
                  </option>
                ))}
              </select>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type="number" step="0.001" min="0.001"
                  placeholder="የተገዛው መጠን"
                  value={row.quantity_bought}
                  onChange={e => updateRow(i, 'quantity_bought', e.target.value)}
                  style={{ ...iStyle, flex: 1 }}
                />
                <input
                  type="number" step="0.01" min="0"
                  placeholder="የአንዱ ዋጋ $"
                  value={row.cost_per_unit_at_time}
                  onChange={e => updateRow(i, 'cost_per_unit_at_time', e.target.value)}
                  style={{ ...iStyle, flex: 1 }}
                />
                {items.length > 1 && (
                  <button type="button" onClick={() => removeRow(i)} style={{ padding: '10px 12px', background: '#fee2e2', border: '1px solid #fecaca', color: 'var(--danger)', borderRadius: 9, fontSize: 16, cursor: 'pointer' }}>×</button>
                )}
              </div>
              {row.quantity_bought && row.cost_per_unit_at_time && (
                <div style={{ marginTop: 6, fontSize: 12, color: 'var(--muted)', textAlign: 'right' }}>
                  ንዑስ ድምር: ${(parseFloat(row.quantity_bought) * parseFloat(row.cost_per_unit_at_time)).toFixed(2)}
                </div>
              )}
            </div>
          ))}
        </div>

        <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 10, padding: 14, marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: 600, fontSize: 14 }}>ጠቅላላ የግዥ ወጪ</span>
          <span style={{ fontWeight: 800, fontSize: 18, color: 'var(--success)' }}>${totalCost.toFixed(2)}</span>
        </div>

        <button
          type="submit"
          disabled={submitting}
          style={{ width: '100%', padding: 14, background: submitting ? '#ccc' : 'var(--success)', color: '#fff', border: 'none', borderRadius: 11, fontSize: 16, fontWeight: 700, cursor: submitting ? 'not-allowed' : 'pointer' }}
        >
          {submitting ? 'በመመዝገብ ላይ...' : '📦 ግዥ መዝግብ'}
        </button>
      </form>

      {recentPurchases.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 10 }}>የቅርብ ጊዜ ግዥዎች</h3>
          {recentPurchases.map(p => (
            <div key={p.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 14px', marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{p.supplier_name || 'ግዥ #' + p.id}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>{new Date(p.purchase_date).toLocaleDateString('am-ET')}</div>
              </div>
              <div style={{ fontWeight: 700, color: 'var(--primary)' }}>${parseFloat(p.total_cost).toFixed(2)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
