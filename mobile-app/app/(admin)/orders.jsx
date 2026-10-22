import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ordersApi } from '../../src/api/client';
import { colors, spacing, radius, shadow, typography } from '../../src/theme';
import Badge from '../../src/components/Badge';

export default function OrdersScreen() {
  const insets = useSafeAreaInsets();
  const [orders, setOrders] = useState([]);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [orderDetails, setOrderDetails] = useState({});

  const load = useCallback(async (d) => {
    try {
      const res = await ordersApi.getAll({ date: d || date, limit: 100 });
      setOrders(res.data);
    } catch {}
    finally { setLoading(false); setRefreshing(false); }
  }, [date]);

  useEffect(() => { load(date); }, [date]);

  async function toggleExpand(orderId) {
    if (expandedId === orderId) { setExpandedId(null); return; }
    setExpandedId(orderId);
    if (!orderDetails[orderId]) {
      try {
        const res = await ordersApi.getById(orderId);
        setOrderDetails(prev => ({ ...prev, [orderId]: res.data }));
      } catch {}
    }
  }

  function changeDate(delta) {
    const d = new Date(date);
    d.setDate(d.getDate() + delta);
    const newDate = d.toISOString().split('T')[0];
    setDate(newDate);
    setOrders([]);
    setLoading(true);
  }

  const totalRevenue = orders.reduce((s, o) => s + parseFloat(o.total_amount || 0), 0);

  const renderOrder = ({ item: order }) => {
    const expanded = expandedId === order.id;
    const detail = orderDetails[order.id];
    return (
      <TouchableOpacity style={styles.orderCard} onPress={() => toggleExpand(order.id)} activeOpacity={0.8}>
        <View style={styles.orderRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.orderId}>Order #{order.id}</Text>
            <Text style={styles.orderTime}>
              {new Date(order.order_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              {order.created_by_name ? `  •  ${order.created_by_name}` : ''}
            </Text>
          </View>
          <View style={{ alignItems: 'flex-end', gap: spacing.xs }}>
            <Text style={styles.orderAmount}>ETB {parseFloat(order.total_amount).toFixed(2)}</Text>
            <Badge label={order.payment_method} type={order.payment_method === 'cash' ? 'success' : 'info'} />
          </View>
          <Text style={[styles.chevron, expanded && styles.chevronOpen]}>›</Text>
        </View>

        {expanded && (
          <View style={styles.orderDetail}>
            {!detail ? (
              <ActivityIndicator color={colors.primary} size="small" />
            ) : (
              detail.items?.map((item, i) => (
                <View key={i} style={styles.detailRow}>
                  <Text style={styles.detailName}>
                    {item.item_name}{item.variation_name ? ` (${item.variation_name})` : ''}
                  </Text>
                  <Text style={styles.detailQty}>{item.quantity}×</Text>
                  <Text style={styles.detailSubtotal}>ETB {parseFloat(item.subtotal).toFixed(2)}</Text>
                </View>
              ))
            )}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <Text style={styles.headerTitle}>📋  Orders</Text>
        <Text style={styles.headerSub}>{orders.length} orders · ETB {totalRevenue.toFixed(2)}</Text>
      </View>

      {/* Date navigation */}
      <View style={styles.dateNav}>
        <TouchableOpacity onPress={() => changeDate(-1)} style={styles.dateArrow}>
          <Text style={styles.dateArrowText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.dateLabel}>
          {new Date(date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
        </Text>
        <TouchableOpacity
          onPress={() => changeDate(1)}
          disabled={date >= new Date().toISOString().split('T')[0]}
          style={styles.dateArrow}
        >
          <Text style={[styles.dateArrowText, date >= new Date().toISOString().split('T')[0] && { color: colors.muted }]}>›</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centered}><ActivityIndicator color={colors.primary} /></View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={o => String(o.id)}
          renderItem={renderOrder}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(date); }} tintColor={colors.primary} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={{ fontSize: 36 }}>📭</Text>
              <Text style={[typography.body, { color: colors.muted, marginTop: spacing.md }]}>No orders for this day</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { backgroundColor: colors.dark, paddingHorizontal: spacing.xl, paddingBottom: spacing.lg },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#fff' },
  headerSub: { fontSize: 12, color: colors.primaryLight, marginTop: 2 },
  dateNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.xl, paddingVertical: spacing.md, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  dateArrow: { padding: spacing.sm, minWidth: 40, alignItems: 'center' },
  dateArrowText: { fontSize: 22, fontWeight: '700', color: colors.primary },
  dateLabel: { fontSize: 14, fontWeight: '600', color: colors.text },
  list: { padding: spacing.xl },
  orderCard: { backgroundColor: colors.surface, borderRadius: radius.lg, marginBottom: spacing.md, overflow: 'hidden', ...shadow.sm },
  orderRow: { flexDirection: 'row', alignItems: 'center', padding: spacing.lg, gap: spacing.sm },
  orderId: { fontSize: 14, fontWeight: '700', color: colors.text },
  orderTime: { fontSize: 12, color: colors.muted, marginTop: 2 },
  orderAmount: { fontSize: 16, fontWeight: '800', color: colors.primary },
  chevron: { fontSize: 20, color: colors.muted, transform: [{ rotate: '0deg' }] },
  chevronOpen: { transform: [{ rotate: '90deg' }] },
  orderDetail: { backgroundColor: colors.bg, padding: spacing.lg, borderTopWidth: 1, borderTopColor: colors.border },
  detailRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.xs, gap: spacing.sm },
  detailName: { flex: 1, fontSize: 13, color: colors.text },
  detailQty: { fontSize: 13, fontWeight: '600', color: colors.muted, minWidth: 25, textAlign: 'right' },
  detailSubtotal: { fontSize: 13, fontWeight: '700', color: colors.primary, minWidth: 80, textAlign: 'right' },
  empty: { alignItems: 'center', justifyContent: 'center', padding: spacing.xxxl * 2 },
});
