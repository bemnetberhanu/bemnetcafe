import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { analyticsApi } from '../../src/api/client';
import { colors, spacing, radius, shadow, typography } from '../../src/theme';
import StatCard from '../../src/components/StatCard';

const PRESETS = [
  { label: 'Today', days: 0, groupBy: 'day' },
  { label: 'This Week', days: 7, groupBy: 'day' },
  { label: 'This Month', days: 30, groupBy: 'day' },
  { label: '3 Months', days: 90, groupBy: 'week' },
  { label: 'This Year', days: 365, groupBy: 'month' },
];

function getDateRange(days) {
  const end = new Date();
  end.setDate(end.getDate() + 1);
  const start = new Date();
  if (days === 0) {
    start.setHours(0, 0, 0, 0);
  } else {
    start.setDate(start.getDate() - days);
  }
  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0],
  };
}

export default function FinancialScreen() {
  const insets = useSafeAreaInsets();
  const [activePreset, setActivePreset] = useState(2); // This Month
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const preset = PRESETS[activePreset];
    const { start, end } = getDateRange(preset.days);
    setLoading(true);
    analyticsApi.financial(start, end, preset.groupBy)
      .then(res => setReport(res.data))
      .catch(() => setReport(null))
      .finally(() => setLoading(false));
  }, [activePreset]);

  const s = report?.summary;
  const profit = parseFloat(s?.net_profit || 0);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <Text style={styles.headerTitle}>💰  Financial Report</Text>
        <Text style={styles.headerSub}>Revenue, costs & profit</Text>
      </View>

      {/* Presets */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.presets}>
        {PRESETS.map((p, idx) => (
          <TouchableOpacity
            key={idx}
            onPress={() => setActivePreset(idx)}
            style={[styles.preset, idx === activePreset && styles.presetActive]}
          >
            <Text style={[styles.presetText, idx === activePreset && styles.presetTextActive]}>
              {p.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? (
        <View style={styles.centered}><ActivityIndicator color={colors.primary} /></View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          {/* Summary cards */}
          <View style={styles.statsGrid}>
            <StatCard icon="📈" label="Revenue" value={`ETB ${parseFloat(s?.revenue || 0).toFixed(0)}`} color={colors.success} style={styles.statCard} />
            <StatCard icon="🥩" label="COGS" value={`ETB ${parseFloat(s?.cogs || 0).toFixed(0)}`} color={colors.warning} style={styles.statCard} />
            <StatCard icon="🧾" label="Operating" value={`ETB ${parseFloat(s?.operating_costs || 0).toFixed(0)}`} style={styles.statCard} />
            <StatCard icon="📦" label="Purchases (separate)" value={`ETB ${parseFloat(s?.purchase_costs || 0).toFixed(0)}`} style={styles.statCard} />
            <StatCard
              icon={profit >= 0 ? '✅' : '❌'}
              label={profit >= 0 ? 'Net Profit' : 'Net Loss'}
              value={`ETB ${profit.toFixed(0)}`}
              sub={`${s?.profit_margin || '0.00'}% margin`}
              color={profit >= 0 ? colors.success : colors.danger}
              style={styles.statCard}
            />
          </View>

          {/* Gross profit */}
          <View style={styles.grossCard}>
            <Text style={styles.grossLabel}>Gross Profit (Revenue − COGS)</Text>
            <Text style={[styles.grossValue, { color: parseFloat(s?.gross_profit || 0) >= 0 ? colors.success : colors.danger }]}>
              ETB {parseFloat(s?.gross_profit || 0).toFixed(2)}
            </Text>
          </View>
          <Text style={styles.profitNote}>
            Net profit = revenue − COGS − operating expenses. Purchases are shown separately to avoid double-counting inventory.
          </Text>

          {/* Chart data table */}
          {report?.chart_data?.length > 0 && (
            <>
              <Text style={[typography.label, { marginBottom: spacing.sm, marginTop: spacing.lg }]}>
                BREAKDOWN BY {PRESETS[activePreset].groupBy.toUpperCase()}
              </Text>
              {report.chart_data.map((row, i) => (
                <View key={i} style={styles.chartRow}>
                  <Text style={styles.chartPeriod}>{row.period}</Text>
                  <View style={styles.chartBars}>
                    <Text style={styles.chartRevenue}>↑ ETB {parseFloat(row.revenue).toFixed(0)}</Text>
                    <Text style={[styles.chartProfit, { color: row.profit >= 0 ? colors.success : colors.danger }]}>
                      {row.profit >= 0 ? '↑' : '↓'} ETB {parseFloat(row.profit).toFixed(0)}
                    </Text>
                  </View>
                </View>
              ))}
            </>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { backgroundColor: colors.dark, paddingHorizontal: spacing.xl, paddingBottom: spacing.lg },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#fff' },
  headerSub: { fontSize: 12, color: colors.primaryLight, marginTop: 2 },
  presets: { paddingHorizontal: spacing.md, paddingVertical: spacing.md, gap: spacing.sm },
  preset: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: radius.full, backgroundColor: colors.border, marginRight: spacing.sm },
  presetActive: { backgroundColor: colors.primary },
  presetText: { fontSize: 13, fontWeight: '500', color: colors.text },
  presetTextActive: { color: '#fff', fontWeight: '700' },
  content: { padding: spacing.xl },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  statCard: { minWidth: '45%', flex: 1 },
  grossCard: { marginTop: spacing.md, backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.xl, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', ...shadow.sm },
  grossLabel: { fontSize: 13, color: colors.textSecondary, flex: 1 },
  grossValue: { fontSize: 18, fontWeight: '800' },
  profitNote: { fontSize: 12, color: colors.muted, lineHeight: 18, marginTop: spacing.md },
  chartRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  chartPeriod: { fontSize: 12, color: colors.muted, fontWeight: '600', minWidth: 80 },
  chartBars: { alignItems: 'flex-end' },
  chartRevenue: { fontSize: 13, fontWeight: '600', color: colors.success },
  chartProfit: { fontSize: 12, fontWeight: '600', marginTop: 2 },
});
