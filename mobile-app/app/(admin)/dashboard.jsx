import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { analyticsApi, ingredientsApi } from '../../src/api/client';
import { colors, spacing, radius, shadow, typography } from '../../src/theme';
import StatCard from '../../src/components/StatCard';
import useAuthStore from '../../src/store/authStore';

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const user = useAuthStore(s => s.user);
  const [daily, setDaily] = useState(null);
  const [monthly, setMonthly] = useState(null);
  const [lowStock, setLowStock] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const monthStart = today.slice(0, 8) + '01';
      const nextMonth = new Date(today);
      nextMonth.setMonth(nextMonth.getMonth() + 1, 1);
      const monthEnd = nextMonth.toISOString().split('T')[0];

      const [dRes, mRes, iRes] = await Promise.all([
        analyticsApi.daily(today),
        analyticsApi.financial(monthStart, monthEnd, 'day'),
        ingredientsApi.getAll(),
      ]);
      setDaily(dRes.data);
      setMonthly(mRes.data);
      setLowStock(iRes.data.filter(i => i.is_low_stock));
    } catch {}
    finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, []);

  if (loading) {
    return <View style={styles.centered}><ActivityIndicator color={colors.primary} size="large" /></View>;
  }

  const profit = monthly?.summary?.net_profit || 0;
  const profitMargin = monthly?.summary?.profit_margin || '0.00';

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <View>
          <Text style={styles.headerGreet}>👋 Welcome back,</Text>
          <Text style={styles.headerName}>{user?.name}</Text>
        </View>
        <Text style={styles.headerDate}>
          {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
        </Text>
      </View>

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} />}
        contentContainerStyle={styles.content}
      >
        {/* Today */}
        <Text style={[typography.label, { marginBottom: spacing.sm }]}>TODAY</Text>
        <View style={styles.statsGrid}>
          <StatCard icon="📋" label="Orders" value={daily?.order_count ?? 0} style={styles.statCard} />
          <StatCard icon="💰" label="Revenue" value={`ETB ${parseFloat(daily?.total_revenue || 0).toFixed(0)}`} color={colors.success} style={styles.statCard} />
          <StatCard icon="💵" label="Cash" value={`ETB ${parseFloat(daily?.cash_revenue || 0).toFixed(0)}`} style={styles.statCard} />
          <StatCard icon="🥩" label="COGS" value={`ETB ${parseFloat(daily?.cogs || 0).toFixed(0)}`} color={colors.warning} style={styles.statCard} />
          <StatCard icon="🧾" label="Operating" value={`ETB ${parseFloat(daily?.operating_costs || 0).toFixed(0)}`} style={styles.statCard} />
          <StatCard
            icon={(daily?.net_profit || 0) >= 0 ? '✅' : '❌'}
            label={(daily?.net_profit || 0) >= 0 ? 'Net Profit' : 'Net Loss'}
            value={`ETB ${parseFloat(daily?.net_profit || 0).toFixed(0)}`}
            color={(daily?.net_profit || 0) >= 0 ? colors.success : colors.danger}
            style={styles.statCard}
          />
          <StatCard icon="📦" label="Purchases (separate)" value={`ETB ${parseFloat(daily?.purchase_costs || 0).toFixed(0)}`} style={styles.statCard} />
          <StatCard icon="⚠️" label="Low Stock" value={lowStock.length} color={lowStock.length > 0 ? colors.danger : colors.success} style={styles.statCard} />
        </View>

        {/* This month */}
        <Text style={[typography.label, { marginTop: spacing.xl, marginBottom: spacing.sm }]}>THIS MONTH</Text>
        <View style={styles.statsGrid}>
          <StatCard icon="📈" label="Revenue" value={`ETB ${parseFloat(monthly?.summary?.revenue || 0).toFixed(0)}`} color={colors.success} style={styles.statCard} />
          <StatCard icon="📉" label="COGS" value={`ETB ${parseFloat(monthly?.summary?.cogs || 0).toFixed(0)}`} color={colors.warning} style={styles.statCard} />
          <StatCard icon="🧾" label="Operating" value={`ETB ${parseFloat(monthly?.summary?.operating_costs || 0).toFixed(0)}`} style={styles.statCard} />
          <StatCard icon="📦" label="Purchases (separate)" value={`ETB ${parseFloat(monthly?.summary?.purchase_costs || 0).toFixed(0)}`} style={styles.statCard} />
          <StatCard
            icon={profit >= 0 ? '✅' : '❌'}
            label={profit >= 0 ? 'Net Profit' : 'Net Loss'}
            value={`ETB ${parseFloat(profit).toFixed(0)}`}
            sub={`${profitMargin}% margin`}
            color={profit >= 0 ? colors.success : colors.danger}
            style={styles.statCard}
          />
        </View>

        {/* Low stock */}
        {lowStock.length > 0 && (
          <>
            <Text style={[typography.label, { marginTop: spacing.xl, marginBottom: spacing.sm }]}>
              ⚠️ LOW STOCK ALERTS ({lowStock.length})
            </Text>
            {lowStock.slice(0, 5).map(ing => (
              <View key={ing.id} style={styles.lowStockRow}>
                <Text style={styles.lowStockName}>{ing.name}</Text>
                <Text style={styles.lowStockQty}>
                  {parseFloat(ing.current_quantity).toFixed(2)} {ing.unit_of_measure} left
                </Text>
              </View>
            ))}
          </>
        )}

        {/* Today's top items */}
        {daily?.top_items_today?.length > 0 && (
          <>
            <Text style={[typography.label, { marginTop: spacing.xl, marginBottom: spacing.sm }]}>🏆 TODAY'S TOP ITEMS</Text>
            <View style={styles.topItemsCard}>
              {daily.top_items_today.map((item, idx) => (
                <View key={idx} style={styles.topRow}>
                  <Text style={{ fontSize: 18, marginRight: spacing.sm }}>
                    {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}.`}
                  </Text>
                  <Text style={styles.topItemName}>{item.item}</Text>
                  <Text style={styles.topItemQty}>{item.qty_sold} sold</Text>
                </View>
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    backgroundColor: colors.dark, paddingHorizontal: spacing.xl, paddingBottom: spacing.lg,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end',
  },
  headerGreet: { fontSize: 13, color: colors.primaryLight },
  headerName: { fontSize: 22, fontWeight: '800', color: '#fff' },
  headerDate: { fontSize: 12, color: colors.muted },
  content: { padding: spacing.xl },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  statCard: { minWidth: '45%', flex: 1 },
  lowStockRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: colors.dangerLight, borderRadius: radius.md, padding: spacing.md,
    marginBottom: spacing.sm, borderLeftWidth: 3, borderLeftColor: colors.danger,
  },
  lowStockName: { fontSize: 13, fontWeight: '700', color: colors.danger },
  lowStockQty: { fontSize: 12, color: colors.danger },
  topItemsCard: { backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.xl, ...shadow.md },
  topRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  topItemName: { flex: 1, fontSize: 14, color: colors.text, fontWeight: '500' },
  topItemQty: { fontSize: 12, fontWeight: '700', color: colors.primary },
});
