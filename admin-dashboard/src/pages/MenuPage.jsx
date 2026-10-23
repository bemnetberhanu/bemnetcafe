import React, { useState, useEffect, useCallback, useRef } from 'react';
import toast from 'react-hot-toast';
import api from '../api/client';
import Modal from '../components/Modal';
import FormField, { inputStyle } from '../components/FormField';

const CATEGORIES = ['Wot', 'Tibs', 'Kitfo', 'Salad', 'Sides', 'Coffee', 'Drinks', 'Other'];

// Common units shown as quick-pick chips
const COMMON_UNITS = ['kg', 'g', 'liters', 'ml', 'pieces', 'cups', 'tbsp', 'tsp', 'bunches', 'cans'];

// ─── Inline "create new ingredient" mini-form ──────────────────────────────────
function NewIngredientForm({ onCreated, onCancel }) {
  const [form, setForm] = useState({
    name: '', unit_of_measure: '', reorder_level: '', reorder_quantity: '', cost_per_unit: '', current_quantity: '0',
  });
  const [saving, setSaving] = useState(false);

  async function handleCreate(e) {
    e.preventDefault();
    if (!form.name.trim() || !form.unit_of_measure.trim()) {
      toast.error('Name and unit are required.');
      return;
    }
    setSaving(true);
    try {
      const res = await api.post('/ingredients', {
        ...form,
        reorder_level: form.reorder_level || 0,
        reorder_quantity: form.reorder_quantity || 0,
        cost_per_unit: form.cost_per_unit || 0,
        current_quantity: form.current_quantity || 0,
      });
      toast.success(`"${res.data.name}" created!`);
      onCreated(res.data);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create ingredient.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{
      background: '#f0fdf4', border: '1px solid #86efac',
      borderRadius: 10, padding: 14, marginBottom: 10,
    }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: '#166534', marginBottom: 10 }}>
        ✨ Create New Ingredient
      </div>

      <form onSubmit={handleCreate}>
        {/* Name + Unit */}
        <div className="new-ingredient-main" style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <input
            required
            placeholder="Ingredient name *"
            value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })}
            style={{ ...inputStyle, flex: 2 }}
          />
          <div style={{ flex: 1 }}>
            <input
              required
              placeholder="Unit *"
              value={form.unit_of_measure}
              onChange={e => setForm({ ...form, unit_of_measure: e.target.value })}
              style={{ ...inputStyle, width: '100%' }}
            />
            {/* Quick-pick unit chips */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 5 }}>
              {COMMON_UNITS.map(u => (
                <button
                  key={u} type="button"
                  onClick={() => setForm({ ...form, unit_of_measure: u })}
                  style={{
                    padding: '2px 8px', fontSize: 11, borderRadius: 20, cursor: 'pointer',
                    background: form.unit_of_measure === u ? 'var(--color-primary)' : '#e5e7eb',
                    color: form.unit_of_measure === u ? '#fff' : 'var(--color-text)',
                    border: 'none', fontWeight: 500,
                  }}
                >
                  {u}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Optional stock details */}
        <div className="new-ingredient-fields" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 6, marginBottom: 10 }}>
          <input type="number" step="0.001" min="0" placeholder="Current qty" value={form.current_quantity}
            onChange={e => setForm({ ...form, current_quantity: e.target.value })}
            style={{ ...inputStyle, fontSize: 12, padding: '7px 9px' }} />
          <input type="number" step="0.001" min="0" placeholder="Reorder level" value={form.reorder_level}
            onChange={e => setForm({ ...form, reorder_level: e.target.value })}
            style={{ ...inputStyle, fontSize: 12, padding: '7px 9px' }} />
          <input type="number" step="0.001" min="0" placeholder="Reorder qty" value={form.reorder_quantity}
            onChange={e => setForm({ ...form, reorder_quantity: e.target.value })}
            style={{ ...inputStyle, fontSize: 12, padding: '7px 9px' }} />
          <input type="number" step="0.01" min="0" placeholder="Cost/unit $" value={form.cost_per_unit}
            onChange={e => setForm({ ...form, cost_per_unit: e.target.value })}
            style={{ ...inputStyle, fontSize: 12, padding: '7px 9px' }} />
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button type="submit" disabled={saving} style={{
            padding: '7px 16px', background: '#16a34a', color: '#fff', border: 'none',
            borderRadius: 7, fontSize: 13, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer',
          }}>
            {saving ? 'Creating...' : '✓ Create & Add'}
          </button>
          <button type="button" onClick={onCancel} style={{
            padding: '7px 14px', background: '#fff', border: '1px solid #d1d5db',
            borderRadius: 7, fontSize: 13, cursor: 'pointer',
          }}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

// ─── Single ingredient row ─────────────────────────────────────────────────────
function IngredientRow({ row, index, ingredients, onChange, onRemove, onNewIngredientCreated }) {
  const [showNewForm, setShowNewForm] = useState(false);
  const [search, setSearch] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const wrapperRef = useRef(null);

  // Find the selected ingredient for display
  const selected = ingredients.find(i => String(i.id) === String(row.ingredient_id));

  // Filter by search
  const filtered = search
    ? ingredients.filter(i => i.name.toLowerCase().includes(search.toLowerCase()))
    : ingredients;

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function handleSelect(ingr) {
    onChange(index, 'ingredient_id', ingr.id);
    setSearch('');
    setShowDropdown(false);
  }

  function handleNewCreated(newIngr) {
    onNewIngredientCreated(newIngr);
    onChange(index, 'ingredient_id', newIngr.id);
    setShowNewForm(false);
    setShowDropdown(false);
    setSearch('');
  }

  return (
    <div style={{ marginBottom: 8 }}>
      {showNewForm ? (
        <NewIngredientForm
          onCreated={handleNewCreated}
          onCancel={() => setShowNewForm(false)}
        />
      ) : (
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
          {/* Searchable ingredient picker */}
          <div ref={wrapperRef} style={{ flex: 2, position: 'relative' }}>
            <div
              onClick={() => setShowDropdown(true)}
              style={{
                ...inputStyle, cursor: 'pointer', display: 'flex',
                alignItems: 'center', justifyContent: 'space-between',
                color: selected ? 'var(--color-text)' : 'var(--color-text-muted)',
              }}
            >
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {selected ? `${selected.name} (${selected.unit_of_measure})` : 'Select or create ingredient...'}
              </span>
              <span style={{ fontSize: 10, marginLeft: 6, flexShrink: 0 }}>▾</span>
            </div>

            {showDropdown && (
              <div style={{
                position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
                background: '#fff', border: '1px solid var(--color-border)',
                borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
                maxHeight: 260, overflow: 'hidden', display: 'flex', flexDirection: 'column',
              }}>
                {/* Search box inside dropdown */}
                <div style={{ padding: '8px 10px', borderBottom: '1px solid var(--color-border)' }}>
                  <input
                    autoFocus
                    placeholder="Search ingredients..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    style={{ ...inputStyle, padding: '6px 10px', fontSize: 13 }}
                    onClick={e => e.stopPropagation()}
                  />
                </div>

                {/* Create new option — always at top */}
                <button
                  type="button"
                  onClick={() => { setShowDropdown(false); setShowNewForm(true); }}
                  style={{
                    padding: '10px 12px', textAlign: 'left', background: '#f0fdf4',
                    border: 'none', borderBottom: '1px solid #d1fae5',
                    fontSize: 13, fontWeight: 600, color: '#166534', cursor: 'pointer',
                  }}
                >
                  ✨ Create new ingredient...
                </button>

                {/* Ingredient list */}
                <div style={{ overflowY: 'auto', flex: 1 }}>
                  {filtered.length === 0 ? (
                    <div style={{ padding: '12px', fontSize: 13, color: 'var(--color-text-muted)', textAlign: 'center' }}>
                      No results. Use "Create new ingredient" above.
                    </div>
                  ) : (
                    filtered.map(ingr => (
                      <button
                        key={ingr.id}
                        type="button"
                        onClick={() => handleSelect(ingr)}
                        style={{
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          width: '100%', padding: '9px 12px', border: 'none', textAlign: 'left',
                          background: String(row.ingredient_id) === String(ingr.id) ? 'var(--color-primary-light)' : '#fff',
                          fontSize: 13, cursor: 'pointer', borderBottom: '1px solid #f3f4f6',
                        }}
                      >
                        <span>{ingr.name}</span>
                        <span style={{
                          fontSize: 11, background: '#f3f4f6', padding: '2px 7px',
                          borderRadius: 20, color: 'var(--color-text-muted)', flexShrink: 0, marginLeft: 8,
                        }}>
                          {ingr.unit_of_measure}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Quantity + unit label */}
          <div style={{ flex: 1, display: 'flex', gap: 4, alignItems: 'center' }}>
            <input
              type="number" step="0.001" min="0"
              placeholder="Qty"
              value={row.quantity_required}
              onChange={e => onChange(index, 'quantity_required', e.target.value)}
              style={{ ...inputStyle, flex: 1 }}
            />
            {selected && (
              <span style={{
                fontSize: 12, color: 'var(--color-text-muted)', whiteSpace: 'nowrap',
                padding: '0 4px', flexShrink: 0,
              }}>
                {selected.unit_of_measure}
              </span>
            )}
          </div>

          {/* Remove row */}
          <button
            type="button"
            onClick={() => onRemove(index)}
            style={{
              padding: '9px 11px', background: '#fee2e2', border: '1px solid #fecaca',
              color: 'var(--color-danger)', borderRadius: 7, fontSize: 15,
              cursor: 'pointer', flexShrink: 0, lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Main MenuPage ─────────────────────────────────────────────────────────────
export default function MenuPage() {
  const [items, setItems] = useState([]);
  const [ingredients, setIngredients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    name: '', selling_price: '', category: CATEGORIES[0],
    description: '', is_available: true, ingredients: [],
  });
  const [saving, setSaving] = useState(false);const fetchData = useCallback(async () => {
    try {
      const [menuRes, ingrRes] = await Promise.all([api.get('/menu'), api.get('/ingredients')]);
      setItems(menuRes.data);
      setIngredients(ingrRes.data);
    } catch (err) {
      toast.error('Failed to load menu.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  function openCreate() {
    setEditing(null);
    setForm({ name: '', selling_price: '', category: CATEGORIES[0], description: '', is_available: true, ingredients: [] });
    setShowModal(true);
  }

  function openEdit(item) {
    setEditing(item);
    setForm({
      name: item.name,
      selling_price: item.selling_price,
      category: item.category,
      description: item.description || '',
      is_available: item.is_available,
      ingredients: (item.ingredients || []).map(i => ({
        ingredient_id: i.ingredient_id,
        quantity_required: i.quantity_required,
      })),
    });
    setShowModal(true);
  }

  function addIngredientRow() {
    setForm(f => ({ ...f, ingredients: [...f.ingredients, { ingredient_id: '', quantity_required: '' }] }));
  }

  function updateIngredientRow(i, field, value) {
    setForm(f => {
      const updated = [...f.ingredients];
      updated[i] = { ...updated[i], [field]: value };
      return { ...f, ingredients: updated };
    });
  }

  function removeIngredientRow(i) {
    setForm(f => ({ ...f, ingredients: f.ingredients.filter((_, idx) => idx !== i) }));
  }

  // Called when a new ingredient is created inline — add it to the local list
  function handleNewIngredientCreated(newIngr) {
    setIngredients(prev => [...prev, newIngr].sort((a, b) => a.name.localeCompare(b.name)));
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        ingredients: form.ingredients.filter(i => i.ingredient_id && i.quantity_required),
      };
      if (editing) {
        await api.put(`/menu/${editing.id}`, payload);
        toast.success('Menu item updated.');
      } else {
        await api.post('/menu', payload);
        toast.success('Menu item created.');
      }
      setShowModal(false);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(item) {
    if (!confirm('Delete this menu item?')) return;
    try {
      await api.delete(`/menu/${item.id}`);
      toast.success('Item deleted.');
      fetchData();
    } catch (err) {
      const errorMessage = err.response?.data?.error || '';
      const isOrderHistoryConflict =
        err.response?.status === 409 ||
        err.response?.data?.code === 'ER_ROW_IS_REFERENCED_2' ||
        /foreign key|referenced row/i.test(errorMessage);

      if (isOrderHistoryConflict) {
        const shouldDisable = confirm(
          `"${item.name}" is used in past orders and cannot be permanently deleted without changing sales history. Mark it unavailable instead?`
        );
        if (!shouldDisable) return;

        try {
          await api.put(`/menu/${item.id}`, { ...item, is_available: false });
          toast.success(`"${item.name}" is now unavailable for new orders.`);
          fetchData();
        } catch (updateError) {
          toast.error(updateError.response?.data?.error || 'Failed to mark the item unavailable.');
        }
        return;
      }

      toast.error(err.response?.data?.error || 'Failed to delete.');
    }
  }

  async function toggleAvailability(item) {
    try {
      await api.put(`/menu/${item.id}`, { ...item, is_available: !item.is_available });
      toast.success(`${item.name} ${!item.is_available ? 'enabled' : 'disabled'}.`);
      fetchData();
    } catch (err) {
      toast.error('Failed to update.');
    }
  }

  const grouped = CATEGORIES.reduce((acc, cat) => {
    const catItems = items.filter(i => i.category === cat);
    if (catItems.length) acc[cat] = catItems;
    return acc;
  }, {});

  return (
    <div>
      <div className="admin-page-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700 }}>Menu & Recipes</h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 14 }}>
            Manage all menu items and their ingredient requirements
          </p>
        </div>
        <button
          onClick={openCreate}
          style={{ padding: '10px 18px', background: 'var(--color-primary)', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, fontSize: 14, cursor: 'pointer' }}
        >
          + Add Menu Item
        </button>
      </div>

      {loading ? (
        <div style={{ padding: 40, color: 'var(--color-text-muted)' }}>Loading...</div>
      ) : (
        Object.entries(grouped).map(([cat, catItems]) => (
          <div key={cat} style={{ marginBottom: 24 }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {cat}
            </h3>
            <div className="menu-items-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
              {catItems.map(item => (
                <div key={item.id} style={{
                  background: 'var(--color-surface)', border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)',
                  opacity: item.is_available ? 1 : 0.6, overflow: 'hidden',
                }}>
                  <div style={{ padding: '16px 18px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                      <div style={{ fontWeight: 600, fontSize: 15 }}>{item.name}</div>
                      <div style={{ fontWeight: 700, color: 'var(--color-primary)', fontSize: 16 }}>
                        ${parseFloat(item.selling_price).toFixed(2)}
                      </div>
                    </div>
                    {item.description && (
                      <div style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 8 }}>{item.description}</div>
                    )}
            {/* Show ingredient list */}
            {item.ingredients?.length > 0 && (
                      <div style={{ marginBottom: 10 }}>
                        {item.ingredients.map((ing, i) => (
                          <div key={i} style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'flex', gap: 4 }}>
                            <span>•</span>
                            <span>{ing.ingredient_name}: {parseFloat(ing.quantity_required)} {ing.unit_of_measure}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <button onClick={() => openEdit(item)} style={{ padding: '5px 12px', background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}>Edit</button>
                      <button onClick={() => toggleAvailability(item)} style={{ padding: '5px 12px', background: item.is_available ? '#fef3c7' : '#dcfce7', border: '1px solid ' + (item.is_available ? '#fde68a' : '#86efac'), borderRadius: 6, fontSize: 12, cursor: 'pointer' }}>
                        {item.is_available ? 'Disable' : 'Enable'}
                      </button>
                      <button onClick={() => handleDelete(item)} style={{ padding: '5px 12px', background: '#fee2e2', border: '1px solid #fecaca', color: 'var(--color-danger)', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}>Delete</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}

      {showModal && (
        <Modal title={editing ? 'Edit Menu Item' : 'Add Menu Item'} onClose={() => setShowModal(false)} width={680}>
          <form onSubmit={handleSave}>
            <div className="admin-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <FormField label="Name" required>
                <input required style={inputStyle} value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g., Doro Wot" />
              </FormField>
              <FormField label="Selling Price ($)" required>
                <input required type="number" step="0.01" min="0" style={inputStyle}
                  value={form.selling_price} onChange={e => setForm({ ...form, selling_price: e.target.value })} placeholder="12.00" />
              </FormField>
            </div>
            <FormField label="Category" required>
              <select required style={inputStyle} value={form.category}
                onChange={e => setForm({ ...form, category: e.target.value })}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </FormField>
            <FormField label="Description">
              <textarea style={{ ...inputStyle, minHeight: 60, resize: 'vertical' }}
                value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                placeholder="Brief description..." />
            </FormField>

            {/* ── Recipe Ingredients ── */}
            <div style={{ marginBottom: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <label style={{ fontSize: 13, fontWeight: 600 }}>
                  Recipe Ingredients
                  <span style={{ fontSize: 11, color: 'var(--color-text-muted)', fontWeight: 400, marginLeft: 8 }}>
                    Select existing or create new inline
                  </span>
                </label>
                <button type="button" onClick={addIngredientRow} style={{
                  padding: '5px 14px', background: 'var(--color-primary)', color: '#fff',
                  border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                }}>
                  + Add Row
                </button>
              </div>

              {form.ingredients.length === 0 && (
                <div style={{ fontSize: 13, color: 'var(--color-text-muted)', padding: '10px 0' }}>
                  No ingredients yet. Click "+ Add Row" to start building the recipe.
                </div>
              )}

              {form.ingredients.map((row, i) => (
                <IngredientRow
                  key={i}
                  row={row}
                  index={i}
                  ingredients={ingredients}
                  onChange={updateIngredientRow}
                  onRemove={removeIngredientRow}
                  onNewIngredientCreated={handleNewIngredientCreated}
                />
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16, paddingTop: 12, borderTop: '1px solid var(--color-border)' }}>
              <button type="button" onClick={() => setShowModal(false)} style={{ padding: '9px 18px', background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: 7, fontSize: 14, cursor: 'pointer' }}>
                Cancel
              </button>
              <button type="submit" disabled={saving} style={{ padding: '9px 18px', background: 'var(--color-primary)', color: '#fff', border: 'none', borderRadius: 7, fontSize: 14, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer' }}>
                {saving ? 'Saving...' : (editing ? 'Update Menu Item' : 'Create Menu Item')}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
