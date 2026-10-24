import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  FlatList, ActivityIndicator, Modal, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { menuApi } from '../../src/api/client';
import { colors, spacing, radius, shadow, typography } from '../../src/theme';
import Button from '../../src/components/Button';
import useAuthStore from '../../src/store/authStore';
import { cacheData, getCachedData } from '../../src/offline/database';
import { recordManagerOperation } from '../../src/offline/sync';

// ─── Menu item card ────────────────────────────────────────────────────────────
function MenuCard({ item, onAdd }) {
  const [showVars, setShowVars] = useState(false);
  const hasVars = item.variations?.length > 0;

  return (
    <TouchableOpacity
      style={styles.menuCard}
      onPress={() => hasVars ? setShowVars(true) : onAdd(item)}
      activeOpacity={0.8}
    >
      <View style={styles.menuCardInner}>
        <Text style={styles.menuEmoji}>🍽️</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.menuName} numberOfLines={2}>{item.name}</Text>
          <Text style={styles.menuCategory}>{item.category}</Text>
          <Text style={styles.menuPrice}>ETB {parseFloat(item.selling_price).toFixed(2)}</Text>
        </View>
        <View style={styles.addBtn}>
          <Text style={styles.addBtnText}>+</Text>
        </View>
      </View>

      {/* Variation picker modal */}
      <Modal visible={showVars} transparent animationType="slide">
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowVars(false)}
        >
          <View style={styles.varSheet}>
            <Text style={styles.varTitle}>{item.name}</Text>
            <Text style={styles.varSub}>Choose a variation</Text>
            <TouchableOpacity
              style={styles.varRow}
              onPress={() => { onAdd(item, null); setShowVars(false); }}
            >
              <Text style={styles.varName}>Standard</Text>
              <Text style={styles.varPrice}>ETB {parseFloat(item.selling_price).toFixed(2)}</Text>
            </TouchableOpacity>
            {item.variations.map(v => (
              <TouchableOpacity
                key={v.id}
                style={styles.varRow}
                onPress={() => { onAdd(item, v); setShowVars(false); }}
              >
                <Text style={styles.varName}>{v.name}</Text>
                <Text style={styles.varPrice}>
                  ETB {(parseFloat(item.selling_price) + parseFloat(v.price_adjustment)).toFixed(2)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </TouchableOpacity>
  );
}

// ─── Main POS screen ──────────────────────────────────────────────────────────
export default function POSScreen() {
  const insets = useSafeAreaInsets();
  const userId = useAuthStore((state) => state.user?.id);
  const [menuItems, setMenuItems] = useState([]);
  const [menuError, setMenuError] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [cart, setCart] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [submitting, setSubmitting] = useState(false);
  const [shortage, setShortage] = useState(null);
  const [cartVisible, setCartVisible] = useState(false);

  useEffect(() => {
    async function loadMenu() {
      try {
        const res = await menuApi.getAll();
        if (!Array.isArray(res.data)) {
          throw new Error('The server returned an unexpected menu response.');
        }
        setMenuItems(res.data.filter(item => item.is_available));
        try {
          await cacheData('manager-menu', res.data);
        } catch (cacheError) {
          console.error('Could not cache menu for offline use:', cacheError);
          setMenuError('Menu loaded, but this device could not save an offline copy.');
        }
      } catch (error) {
        try {
          const cachedMenu = await getCachedData('manager-menu');
          if (Array.isArray(cachedMenu)) {
            setMenuItems(cachedMenu.filter(item => item.is_available));
            setMenuError('Offline: showing the last downloaded menu. Stock and availability may have changed.');
          } else {
            setMenuItems([]);
            setMenuError(error.response?.data?.error || error.message || 'Could not load menu.');
          }
        } catch (cacheError) {
          setMenuItems([]);
          setMenuError(`Could not load the menu or local cache: ${cacheError.message}`);
        }
      } finally {
        setLoading(false);
      }
    }

    loadMenu();
  }, []);

  const categories = ['All', ...new Set(menuItems.map(i => i.category))];
  const filtered = selectedCategory === 'All'
    ? menuItems
    : menuItems.filter(i => i.category === selectedCategory);

  function addToCart(item, variation = null) {
    const key = `${item.id}-${variation?.id || 'base'}`;
    setCart(prev => {
      const existing = prev.find(c => c.key === key);
      if (existing) return prev.map(c => c.key === key ? { ...c, qty: c.qty + 1 } : c);
      return [...prev, {
        key,
        recipe_item_id: item.id,
        variation_id: variation?.id || null,
        name: variation ? `${item.name} (${variation.name})` : item.name,
        unit_price: parseFloat(item.selling_price) + (variation ? parseFloat(variation.price_adjustment) : 0),
        qty: 1,
      }];
    });
    setCartVisible(true);
  }

  function updateQty(key, delta) {
    setCart(prev => prev
      .map(c => c.key === key ? { ...c, qty: c.qty + delta } : c)
      .filter(c => c.qty > 0)
    );
  }

  const cartTotal = cart.reduce((s, c) => s + c.unit_price * c.qty, 0);
  const cartCount = cart.reduce((s, c) => s + c.qty, 0);

  async function placeOrder() {
    if (cart.length === 0) return;
    setSubmitting(true);
    setShortage(null);
    try {
      const result = await recordManagerOperation('order', {
        items: cart.map(c => ({
          recipe_item_id: c.recipe_item_id,
          variation_id: c.variation_id,
          quantity: c.qty,
        })),
        payment_method: paymentMethod,
      }, userId);
      setCart([]);
      setCartVisible(false);
      Alert.alert(
        result.queued ? 'Order Saved Offline' : '✅ Order Placed',
        result.queued
          ? 'The order is saved on this device and will sync when internet returns. Stock will be checked then; review any conflicts in the sync banner.'
          : 'The order has been submitted successfully!'
      );
    } catch (err) {
      if (err.response?.data?.shortages) {
        setShortage(err.response.data.shortages);
        setCartVisible(false);
        Alert.alert('⚠️ Stock Issue', 'Some ingredients are out of stock. See the highlighted items below.');
      } else {
        Alert.alert('Error', err.response?.data?.error || 'Failed to place order.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.primary} size="large" />
        <Text style={[typography.body, { marginTop: spacing.md, color: colors.muted }]}>Loading menu...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <View>
          <Text style={styles.headerTitle}>🛒  New Order</Text>
          <Text style={styles.headerSub}>Tap items to add to cart</Text>
        </View>
        <TouchableOpacity style={styles.cartBadge} onPress={() => setCartVisible(true)}>
          <Text style={styles.cartEmoji}>🛒</Text>
          {cartCount > 0 && (
            <View style={styles.countBadge}>
              <Text style={styles.countText}>{cartCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {!!menuError && menuItems.length > 0 && (
        <View style={styles.offlineNotice}>
          <Text style={styles.offlineNoticeText}>{menuError}</Text>
        </View>
      )}

      {/* Stock shortage alert */}
      {shortage && (
        <View style={styles.shortageBox}>
          <Text style={styles.shortageTitle}>⚠️ Insufficient Stock</Text>
          {shortage.map((s, i) => (
            <Text key={i} style={styles.shortageItem}>
              • {s.ingredient_name}: need {s.required.toFixed(2)} {s.unit}, only {s.available.toFixed(2)} available
            </Text>
          ))}
        </View>
      )}

      {/* Category tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.catScroll}
      >
        {categories.map(cat => (
          <TouchableOpacity
            key={cat}
            onPress={() => setSelectedCategory(cat)}
            style={[styles.catTab, selectedCategory === cat && styles.catTabActive]}
          >
            <Text style={[styles.catTabText, selectedCategory === cat && styles.catTabTextActive]}>
              {cat}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Menu grid */}
      <FlatList
        data={filtered}
        keyExtractor={i => String(i.id)}
        numColumns={2}
        contentContainerStyle={styles.grid}
        columnWrapperStyle={{ gap: spacing.md }}
        ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
        ListEmptyComponent={
          <View style={styles.emptyMenu}>
            <Text style={styles.emptyMenuMessage}>
              {menuError || 'No available menu items.'}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={{ flex: 1 }}>
            <MenuCard item={item} onAdd={addToCart} />
          </View>
        )}
      />

      {/* Cart sheet modal */}
      <Modal visible={cartVisible} transparent animationType="slide">
        <View style={styles.cartOverlay}>
          <View style={[styles.cartSheet, { paddingBottom: insets.bottom + spacing.md }]}>
            {/* Cart header */}
            <View style={styles.cartHeader}>
              <Text style={styles.cartTitle}>🛒 Order Summary</Text>
              <TouchableOpacity onPress={() => setCartVisible(false)} style={styles.closeBtn}>
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            {cart.length === 0 ? (
              <View style={styles.emptyCart}>
                <Text style={{ fontSize: 40 }}>🍽️</Text>
                <Text style={[typography.body, { color: colors.muted, marginTop: spacing.md }]}>
                  Cart is empty
                </Text>
              </View>
            ) : (
              <ScrollView style={styles.cartItems}>
                {cart.map(item => (
                  <View key={item.key} style={styles.cartRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.cartItemName}>{item.name}</Text>
                      <Text style={styles.cartItemPrice}>
                        ETB {item.unit_price.toFixed(2)} each
                      </Text>
                    </View>
                    <View style={styles.qtyRow}>
                      <TouchableOpacity
                        style={styles.qtyBtn}
                        onPress={() => updateQty(item.key, -1)}
                      >
                        <Text style={styles.qtyBtnText}>−</Text>
                      </TouchableOpacity>
                      <Text style={styles.qtyNum}>{item.qty}</Text>
                      <TouchableOpacity
                        style={[styles.qtyBtn, { backgroundColor: colors.primary }]}
                        onPress={() => updateQty(item.key, 1)}
                      >
                        <Text style={[styles.qtyBtnText, { color: '#fff' }]}>+</Text>
                      </TouchableOpacity>
                    </View>
                    <Text style={styles.cartItemTotal}>
                      ETB {(item.unit_price * item.qty).toFixed(2)}
                    </Text>
                  </View>
                ))}
              </ScrollView>
            )}

            {/* Payment method */}
            <View style={styles.payRow}>
              <Text style={styles.payLabel}>Payment:</Text>
              {['cash', 'card', 'other'].map(m => (
                <TouchableOpacity
                  key={m}
                  onPress={() => setPaymentMethod(m)}
                  style={[styles.payMethod, paymentMethod === m && styles.payMethodActive]}
                >
                  <Text style={[styles.payMethodText, paymentMethod === m && styles.payMethodTextActive]}>
                    {m === 'cash' ? '💵 Cash' : m === 'card' ? '💳 Card' : '🔄 Other'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Total & place order */}
            <View style={styles.cartFooter}>
              <View>
                <Text style={styles.totalLabel}>Total</Text>
                <Text style={styles.totalAmount}>ETB {cartTotal.toFixed(2)}</Text>
              </View>
              <Button
                label="Place Order"
                onPress={placeOrder}
                loading={submitting}
                disabled={cart.length === 0}
                icon="✅"
                size="lg"
                style={{ flex: 1, marginLeft: spacing.md }}
              />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
  header: {
    backgroundColor: colors.dark,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#fff' },
  headerSub: { fontSize: 12, color: colors.primaryLight, marginTop: 2 },
  cartBadge: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center',
  },
  cartEmoji: { fontSize: 22 },
  countBadge: {
    position: 'absolute', top: -4, right: -4,
    backgroundColor: colors.danger, borderRadius: 999,
    minWidth: 18, height: 18, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 3,
  },
  countText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  shortageBox: {
    margin: spacing.md, padding: spacing.md,
    backgroundColor: colors.dangerLight, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.danger + '40',
  },
  shortageTitle: { fontWeight: '700', color: colors.danger, marginBottom: spacing.xs },
  shortageItem: { fontSize: 12, color: colors.danger, marginTop: 2 },
  offlineNotice: { backgroundColor: '#fff3cd', paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  offlineNoticeText: { color: '#664d03', fontSize: 12 },
  emptyMenu: { alignItems: 'center', paddingHorizontal: spacing.xl, paddingVertical: spacing.xxxl * 2 },
  emptyMenuMessage: { fontSize: 13, color: colors.muted, textAlign: 'center' },
  catScroll: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  catTab: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.border,
    marginRight: spacing.sm,
  },
  catTabActive: { backgroundColor: colors.primary },
  catTabText: { fontSize: 13, fontWeight: '500', color: colors.text },
  catTabTextActive: { color: '#fff', fontWeight: '600' },
  grid: { paddingHorizontal: spacing.md, paddingBottom: spacing.xxxl },
  menuCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    ...shadow.sm,
  },
  menuCardInner: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  menuEmoji: { fontSize: 32 },
  menuName: { fontSize: 13, fontWeight: '600', color: colors.text, flex: 1 },
  menuCategory: { fontSize: 11, color: colors.muted, marginTop: 2 },
  menuPrice: { fontSize: 13, fontWeight: '700', color: colors.primary, marginTop: 4 },
  addBtn: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center',
  },
  addBtnText: { color: '#fff', fontSize: 20, fontWeight: '700', lineHeight: 28 },
  // Variation picker
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  varSheet: {
    backgroundColor: colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: spacing.xl, paddingBottom: spacing.xxxl,
  },
  varTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  varSub: { fontSize: 13, color: colors.muted, marginBottom: spacing.lg },
  varRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  varName: { fontSize: 15, color: colors.text },
  varPrice: { fontSize: 15, fontWeight: '700', color: colors.primary },
  // Cart
  cartOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  cartSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    maxHeight: '85%',
  },
  cartHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: spacing.xl, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  cartTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  closeBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: colors.border, alignItems: 'center', justifyContent: 'center',
  },
  closeBtnText: { fontSize: 14, color: colors.text },
  emptyCart: {
    alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.xxxl * 2,
  },
  cartItems: { maxHeight: 320, paddingHorizontal: spacing.xl },
  cartRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  cartItemName: { fontSize: 13, fontWeight: '600', color: colors.text },
  cartItemPrice: { fontSize: 11, color: colors.muted, marginTop: 2 },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  qtyBtn: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: colors.border, alignItems: 'center', justifyContent: 'center',
  },
  qtyBtnText: { fontSize: 16, fontWeight: '700', color: colors.text },
  qtyNum: { fontSize: 15, fontWeight: '700', color: colors.text, minWidth: 24, textAlign: 'center' },
  cartItemTotal: { fontSize: 14, fontWeight: '700', color: colors.primary, minWidth: 70, textAlign: 'right' },
  payRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingHorizontal: spacing.xl, paddingTop: spacing.lg,
  },
  payLabel: { fontSize: 13, fontWeight: '600', color: colors.text },
  payMethod: {
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderRadius: radius.full, backgroundColor: colors.border,
  },
  payMethodActive: { backgroundColor: colors.primary },
  payMethodText: { fontSize: 12, fontWeight: '600', color: colors.text },
  payMethodTextActive: { color: '#fff' },
  cartFooter: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.xl, paddingTop: spacing.lg,
  },
  totalLabel: { fontSize: 12, color: colors.muted, fontWeight: '600' },
  totalAmount: { fontSize: 22, fontWeight: '800', color: colors.primary },
});
