import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import api from '../api/client';

export default function POSPage() {
  const [menuItems, setMenuItems] = useState([]);
  const [cart, setCart] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [shortage, setShortage] = useState(null);

  useEffect(() => {
    api.get('/menu').then(res => {
      setMenuItems(res.data.filter(i => i.is_available));
    }).catch(() => toast.error('Failed to load menu.')).finally(() => setLoading(false));
  }, []);

  const categories = ['All', ...new Set(menuItems.map(i => i.category))];
  const filteredItems = selectedCategory === 'All' ? menuItems : menuItems.filter(i => i.category === selectedCategory);

  function addToCart(item, variation = null) {
    const key = `${item.id}-${variation?.id || 'base'}`;
    setCart(prev => {
      const existing = prev.find(c => c.key === key);
      if (existing) {
        return prev.map(c => c.key === key ? { ...c, quantity: c.quantity + 1 } : c);
      }
      return [...prev, {
        key,
        recipe_item_id: item.id,
        variation_id: variation?.id || null,
        name: item.name,
        variation_name: variation?.name || null,
        unit_price: parseFloat(item.selling_price) + (variation ? parseFloat(variation.price_adjustment) : 0),
        quantity: 1,
      }];
    });
  }

  function updateQty(key, delta) {
    setCart(prev => prev.map(c => c.key === key ? { ...c, quantity: Math.max(1, c.quantity + delta) } : c));
  }

  function removeFromCart(key) {
    setCart(prev => prev.filter(c => c.key !== key));
  }

  const cartTotal = cart.reduce((s, c) => s + c.unit_price * c.quantity, 0);

  async function placeOrder() {
    if (cart.length === 0) return toast.error('Cart is empty.');
    setSubmitting(true);
    setShortage(null);
    try {
      await api.post('/orders', {
        items: cart.map(c => ({ recipe_item_id: c.recipe_item_id, variation_id: c.variation_id, quantity: c.quantity })),
        payment_method: paymentMethod,
      });
      toast.success('✅ Order placed successfully!');
      setCart([]);
    } catch (err) {
      if (err.response?.data?.shortages) {
        setShortage(err.response.data.shortages);
        toast.error('⚠️ Insufficient stock — see details below.');
      } else {
        toast.error(err.response?.data?.error || 'Failed to place order.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <div className="page-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)' }}>Loading menu...</div>;

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Category tabs */}
      <div style={{ display: 'flex', gap: 8, padding: '10px 16px', overflowX: 'auto', background: 'var(--surface)', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            style={{
              padding: '6px 14px', borderRadius: 20, fontSize: 13, fontWeight: 500, border: 'none', whiteSpace: 'nowrap',
              background: selectedCategory === cat ? 'var(--primary)' : '#f3f4f6',
              color: selectedCategory === cat ? '#fff' : 'var(--text)',
              cursor: 'pointer',
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Menu grid */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 12 }}>
          {shortage && (
            <div style={{ marginBottom: 12, padding: 12, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10 }}>
              <div style={{ fontWeight: 700, color: 'var(--danger)', marginBottom: 6, fontSize: 13 }}>⚠️ Insufficient Stock:</div>
              {shortage.map((s, i) => (
                <div key={i} style={{ fontSize: 12, color: '#7f1d1d' }}>
                  • {s.ingredient_name}: need {s.required} {s.unit}, only {s.available} available
                </div>
              ))}
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
            {filteredItems.map(item => (
              <MenuCard key={item.id} item={item} onAdd={addToCart} />
            ))}
          </div>
        </div>

        {/* Cart sidebar */}
        <div style={{ width: 240, background: 'var(--surface)', borderLeft: '1px solid var(--border)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', fontWeight: 700, fontSize: 14 }}>
            🛒 Order ({cart.length} item{cart.length !== 1 ? 's' : ''})
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '8px 10px' }}>
            {cart.length === 0 ? (
              <div style={{ padding: '24px 12px', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
                Tap menu items to add them here
              </div>
            ) : (
              cart.map(item => (
                <div key={item.key} style={{ marginBottom: 8, padding: '8px 10px', background: 'var(--bg)', borderRadius: 8, border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                    {item.name}
                    {item.variation_name && <span style={{ color: 'var(--muted)', fontWeight: 400 }}> ({item.variation_name})</span>}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <button onClick={() => updateQty(item.key, -1)} style={{ width: 24, height: 24, border: '1px solid var(--border)', borderRadius: 4, background: '#fff', fontSize: 16, lineHeight: 1, cursor: 'pointer' }}>-</button>
                      <span style={{ fontSize: 14, fontWeight: 700, minWidth: 20, textAlign: 'center' }}>{item.quantity}</span>
                      <button onClick={() => updateQty(item.key, 1)} style={{ width: 24, height: 24, border: '1px solid var(--primary)', borderRadius: 4, background: 'var(--primary)', color: '#fff', fontSize: 16, lineHeight: 1, cursor: 'pointer' }}>+</button>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--primary)' }}>${(item.unit_price * item.quantity).toFixed(2)}</span>
                      <button onClick={() => removeFromCart(item.key)} style={{ background: 'none', border: 'none', color: 'var(--muted)', fontSize: 16, lineHeight: 1, cursor: 'pointer' }}>×</button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div style={{ padding: '12px 14px', borderTop: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, fontSize: 16, fontWeight: 700 }}>
              <span>Total</span>
              <span style={{ color: 'var(--primary)' }}>${cartTotal.toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
              {['cash', 'card'].map(m => (
                <button
                  key={m}
                  onClick={() => setPaymentMethod(m)}
                  style={{
                    flex: 1, padding: '7px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                    background: paymentMethod === m ? 'var(--primary)' : '#f3f4f6',
                    color: paymentMethod === m ? '#fff' : 'var(--text)',
                    border: 'none', cursor: 'pointer', textTransform: 'capitalize',
                  }}
                >
                  {m === 'cash' ? '💵' : '💳'} {m}
                </button>
              ))}
            </div>
            <button
              onClick={placeOrder}
              disabled={submitting || cart.length === 0}
              style={{
                width: '100%', padding: '13px', background: cart.length === 0 ? '#ccc' : 'var(--success)',
                color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700,
                cursor: cart.length === 0 || submitting ? 'not-allowed' : 'pointer',
              }}
            >
              {submitting ? 'Placing...' : '✅ Place Order'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function MenuCard({ item, onAdd }) {
  const [showVariations, setShowVariations] = useState(false);

  function handleTap() {
    if (item.variations?.length > 0) {
      setShowVariations(!showVariations);
    } else {
      onAdd(item);
    }
  }

  return (
    <div>
      <button
        onClick={handleTap}
        style={{
          width: '100%', padding: '12px', background: 'var(--surface)',
          border: '1px solid var(--border)', borderRadius: 10,
          textAlign: 'left', cursor: 'pointer',
          boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
        }}
      >
        <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>{item.name}</div>
        <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}>{item.category}</div>
        <div style={{ fontWeight: 700, color: 'var(--primary)', fontSize: 15 }}>
          ${parseFloat(item.selling_price).toFixed(2)}
        </div>
        {item.variations?.length > 0 && (
          <div style={{ fontSize: 11, color: 'var(--info)', marginTop: 4 }}>
            {item.variations.length} variation(s) ▾
          </div>
        )}
      </button>

      {showVariations && item.variations?.length > 0 && (
        <div style={{ marginTop: 4, padding: '8px', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8 }}>
          {item.variations.map(v => (
            <button
              key={v.id}
              onClick={() => { onAdd(item, v); setShowVariations(false); }}
              style={{
                display: 'block', width: '100%', textAlign: 'left',
                padding: '7px 10px', marginBottom: 4, background: '#fff',
                border: '1px solid var(--border)', borderRadius: 7, fontSize: 12, cursor: 'pointer',
              }}
            >
              {v.name} · <span style={{ color: 'var(--primary)', fontWeight: 600 }}>
                ${(parseFloat(item.selling_price) + parseFloat(v.price_adjustment)).toFixed(2)}
              </span>
            </button>
          ))}
          <button
            onClick={() => { onAdd(item); setShowVariations(false); }}
            style={{ display: 'block', width: '100%', textAlign: 'left', padding: '7px 10px', background: '#fff', border: '1px solid var(--border)', borderRadius: 7, fontSize: 12, cursor: 'pointer' }}
          >
            Regular · <span style={{ color: 'var(--primary)', fontWeight: 600 }}>${parseFloat(item.selling_price).toFixed(2)}</span>
          </button>
        </div>
      )}
    </div>
  );
}
