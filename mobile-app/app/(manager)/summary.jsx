import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { analyticsApi } from '../../src/api/client';
import { colors, spacing, radius, shadow, typography } from '../../src/theme';
import StatCard from '../../src/components/StatCard';

const MEDALS = ['🥇', '🥈', '🥉'];

export default function SummaryScreen() {
  const insets = useSafeAreaInsets();
  const [summary, setSummary] = useState(null);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (d) => {
    try {
      const res = await analyticsApi.daily(d || date);
      setSummary(res.data);
    } catch {
      setSummary(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [date]);

  useEffect(() => { load(date); }, [date]);

  function changeDate(delta) {
    const d = new Date(date);
    d.setDate(d.getDate() + delta);
    setDate(d.toISOString().split('T')[0]);
    setLoading(true);
  }

  const netProfit = parseFloat(summary?.net_profit || 0);

  if (loading) {
    return <View style={styles.centered}><ActivityIndicator color={colors.primary} size="large" /></View>;
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <Text style={styles.headerTitle}>📊  Daily Summary</Text>
        <Text style={styles.headerSub}>End-of-day review</Text>
      </View>

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(date); }} tintColor={colors.primary} />}
        contentContainerStyle={styles.content}
      >
        {/* Date navigation */}
        <View style={styles.dateNav}>
          <TouchableOpacity onPress={() => changeDate(-1)} style={styles.dateArrow}>
            <Text style={styles.dateArrowText}>‹ Prev</Text>
          </TouchableOpacity>
          <Text style={styles.dateLabel}>{new Date(date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</Text>
          <TouchableOpacity
            onPress={() => changeDate(1)}
            disabled={date >= new Date().toISOString().split('T')[0]}
            style={styles.dateArrow}
          >
            <Text style={[styles.dateArrowText, date >= new Date().toISOString().split('T')[0] && { color: colors.muted }]}>
              Next ›
            </Text>
          </TouchableOpacity>
        </View>

        {!summary ? (
          <View style={styles.emptyBox}>
            <Text style={{ fontSize: 40 }}>📭</Text>
            <Text style={styles.emptyText}>Summary is unavailable.</Text>
          </View>
        ) : (
          <>
            <View style={styles.statsRow}>
              <StatCard icon="📋" label="Total Orders" value={summary.order_count} style={styles.statCard} />
              <StatCard icon="💰" label="Revenue" value={`ETB ${parseFloat(summary.total_revenue).toFixed(0)}`} color={colors.success} style={styles.statCard} />
            </View>
            <View style={styles.statsRow}>
              <StatCard icon="💵" label="Cash Sales" value={`ETB ${parseFloat(summary.cash_revenue).toFixed(0)}`} style={styles.statCard} />
              <StatCard icon="💳" label="Card Sales" value={`ETB ${parseFloat(summary.card_revenue).toFixed(0)}`} style={styles.statCard} />
            </View>
            <View style={styles.statsRow}>
              <StatCard icon="🥩" label="COGS" value={`ETB ${parseFloat(summary.cogs || 0).toFixed(0)}`} color={colors.warning} style={styles.statCard} />
              <StatCard icon="🧾" label="Operating Expenses" value={`ETB ${parseFloat(summary.operating_costs || 0).toFixed(0)}`} style={styles.statCard} />
            </View>
            <View style={styles.statsRow}>
              <StatCard icon="📦" label="Purchases (separate)" value={`ETB ${parseFloat(summary.purchase_costs || 0).toFixed(0)}`} style={styles.statCard} />
              <StatCard
                icon={netProfit >= 0 ? '✅' : '❌'}
                label={netProfit >= 0 ? 'Net Profit' : 'Net Loss'}
                value={`ETB ${netProfit.toFixed(0)}`}
                color={netProfit >= 0 ? colors.success : colors.danger}
                style={styles.statCard}
              />
            </View>
            <Text style={styles.profitNote}>
              Net profit = revenue − COGS − operating expenses. Purchases are shown separately to avoid double-counting inventory.
            </Text>

            {/* Top items */}
            {summary.top_items_today?.length > 0 && (
              <View style={styles.topItemsCard}>
                <Text style={styles.sectionTitle}>🏆 Today's Top Items</Text>
                {summary.top_items_today.map((item, idx) => (
                  <View key={idx} style={styles.topRow}>
                    <Text style={styles.medalEmoji}>{MEDALS[idx] || `${idx + 1}.`}</Text>
                    <Text style={styles.topItemName}>{item.item}</Text>
                    <View style={styles.qtyBadge}>
                      <Text style={styles.qtyBadgeText}>{item.qty_sold} sold</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
            {summary.order_count === 0 && (
              <View style={styles.emptyBox}>
                <Text style={{ fontSize: 40 }}>📭</Text>
                <Text style={styles.emptyText}>No orders recorded for this day.</Text>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { backgroundColor: colors.dark, paddingHorizontal: spacing.xl, paddingBottom: spacing.lg },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#fff' },
  headerSub: { fontSize: 12, color: colors.primaryLight, marginTop: 2 },
  content: { padding: spacing.xl },
  dateNav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xl, backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, ...shadow.sm },
  dateArrow: { padding: spacing.sm },
  dateArrowText: { fontSize: 14, fontWeight: '700', color: colors.primary },
  dateLabel: { fontSize: 13, fontWeight: '600', color: colors.text, textAlign: 'center', flex: 1 },
  statsRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md },
  profitNote: { fontSize: 12, color: colors.muted, lineHeight: 18, marginBottom: spacing.md },
  statCard: { flex: 1 },
  emptyBox: { alignItems: 'center', padding: spacing.xxxl * 2 },
  emptyText: { fontSize: 15, color: colors.muted, marginTop: spacing.md, textAlign: 'center' },
  topItemsCard: { backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.xl, marginTop: spacing.md, ...shadow.md },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: spacing.lg },
  topRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  medalEmoji: { fontSize: 22, marginRight: spacing.md, minWidth: 30 },
  topItemName: { flex: 1, fontSize: 14, fontWeight: '500', color: colors.text },
  qtyBadge: { backgroundColor: colors.primary + '18', paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radius.full },
  qtyBadgeText: { fontSize: 12, fontWeight: '700', color: colors.primary },
});
