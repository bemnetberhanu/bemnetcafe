import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { analyticsApi } from '../../src/api/client';
import { colors, spacing, radius, shadow, typography } from '../../src/theme';

const PRESETS = [
  { label: '7 Days', days: 7 },
  { label: '30 Days', days: 30 },
  { label: '90 Days', days: 90 },
];

const MEDALS = ['🥇', '🥈', '🥉'];
const DAYS_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// ─── Rank badge ───────────────────────────────────────────────────────────────
function RankBadge({ rank, danger }) {
  if (rank < 3) return <Text style={{ fontSize: 22, width: 36 }}>{MEDALS[rank]}</Text>;
  return (
    <View style={[styles.rankCircle, danger && styles.rankCircleDanger]}>
      <Text style={[styles.rankNum, danger && styles.rankNumDanger]}>{rank + 1}</Text>
    </View>
  );
}

// ─── Seller row ───────────────────────────────────────────────────────────────
function SellerRow({ item, rank, danger, isLast }) {
  return (
    <View style={[styles.sellerRow, !isLast && styles.sellerRowBorder]}>
      <RankBadge rank={rank} danger={danger} />
      <View style={{ flex: 1 }}>
        <Text style={styles.sellerName} numberOfLines={1}>{item.item_name}</Text>
        <Text style={styles.sellerCategory}>{item.category}</Text>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={[styles.sellerSold, danger && { color: colors.danger }]}>
          {item.total_sold} sold
        </Text>
        <Text style={styles.sellerRevenue}>
          ETB {parseFloat(item.total_revenue || 0).toFixed(0)}
        </Text>
      </View>
    </View>
  );
}

// ─── Day pattern card ─────────────────────────────────────────────────────────
function DayCard({ day }) {
  // Determine bar width based on avg_sales relative to something
  return (
    <View style={styles.dayCard}>
      <Text style={styles.dayName}>{day.day_of_week}</Text>
      <View style={styles.dayTopItem}>
        <Text style={styles.dayTopEmoji}>🏆</Text>
        <Text style={styles.dayTopName} numberOfLines={1}>{day.top_seller}</Text>
      </View>
      <Text style={styles.dayAvg}>avg {day.avg_sales} units/day</Text>
      {day.all_items?.slice(1, 3).map((it, j) => (
        <Text key={j} style={styles.dayOtherItem} numberOfLines={1}>
          • {it.item} ({it.avg_per_day})
        </Text>
      ))}
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function RankingScreen() {
  const insets = useSafeAreaInsets();
  const [activePreset, setActivePreset] = useState(1); // 30 days default
  const [ranking, setRanking] = useState(null);
  const [patterns, setPatterns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const days = PRESETS[activePreset].days;
      const [rankRes, patRes] = await Promise.all([
        analyticsApi.ranking(days),
        analyticsApi.patterns(days),
      ]);
      setRanking(rankRes.data);
      setPatterns(patRes.data || []);
    } catch (_) {
      setRanking(null);
      setPatterns([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activePreset]);

  useEffect(() => { load(); }, [activePreset]);

  const onRefresh = () => { setRefreshing(true); load(); };

  const topSellers = ranking?.top_sellers || [];
  const worstSellers = ranking?.worst_sellers || [];

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <Text style={styles.headerTitle}>🏆  Rankings & Patterns</Text>
        <Text style={styles.headerSub}>Best sellers, slow movers & weekly trends</Text>
      </View>

      {/* Period selector */}
      <View style={styles.presetRow}>
        {PRESETS.map((p, idx) => (
          <TouchableOpacity
            key={idx}
            onPress={() => { setLoading(true); setActivePreset(idx); }}
            style={[styles.preset, idx === activePreset && styles.presetActive]}
          >
            <Text style={[styles.presetText, idx === activePreset && styles.presetTextActive]}>
              {p.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : (
        <ScrollView
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
          contentContainerStyle={styles.content}
        >
          {/* ── Top Sellers ── */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>🏆 Top Sellers</Text>
              <Text style={styles.sectionSub}>Last {PRESETS[activePreset].days} days</Text>
            </View>

            {topSellers.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={{ fontSize: 32 }}>📊</Text>
                <Text style={styles.emptyText}>No sales data yet.</Text>
              </View>
            ) : (
              <View style={styles.card}>
                {topSellers.map((item, i) => (
                  <SellerRow
                    key={i}
                    item={item}
                    rank={i}
                    danger={false}
                    isLast={i === topSellers.length - 1}
                  />
                ))}
              </View>
            )}
          </View>

          {/* ── Worst Sellers / Needs Attention ── */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>📉 Needs Attention</Text>
              <Text style={styles.sectionSub}>Lowest performing items</Text>
            </View>

            {worstSellers.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={{ fontSize: 32 }}>✅</Text>
                <Text style={styles.emptyText}>No underperformers found.</Text>
              </View>
            ) : (
              <View style={[styles.card, styles.cardDanger]}>
                {worstSellers.map((item, i) => (
                  <SellerRow
                    key={i}
                    item={item}
                    rank={i}
                    danger={true}
                    isLast={i === worstSellers.length - 1}
                  />
                ))}
              </View>
            )}
          </View>

          {/* ── Day-of-week Patterns ── */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>📅 Day-of-Week Patterns</Text>
              <Text style={styles.sectionSub}>Best sellers per weekday</Text>
            </View>

            {patterns.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={{ fontSize: 32 }}>📅</Text>
                <Text style={styles.emptyText}>
                  Not enough data yet.{'\n'}Patterns appear after orders across multiple days.
                </Text>
              </View>
            ) : (
              <View style={styles.daysGrid}>
                {patterns.map((day, i) => (
                  <DayCard key={i} day={day} />
                ))}
              </View>
            )}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    backgroundColor: colors.dark,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg,
  },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#fff' },
  headerSub: { fontSize: 12, color: colors.primaryLight, marginTop: 2 },

  presetRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.sm,
  },
  preset: {
    flex: 1, alignItems: 'center',
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.border,
  },
  presetActive: { backgroundColor: colors.primary },
  presetText: { fontSize: 13, fontWeight: '600', color: colors.text },
  presetTextActive: { color: '#fff' },

  content: { padding: spacing.xl, paddingBottom: spacing.xxxl * 2 },

  section: { marginBottom: spacing.xl },
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: spacing.md,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  sectionSub: { fontSize: 12, color: colors.muted },

  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    overflow: 'hidden',
    ...shadow.md,
  },
  cardDanger: {
    borderWidth: 1,
    borderColor: colors.danger + '30',
  },

  sellerRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    gap: spacing.md,
  },
  sellerRowBorder: {
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  rankCircle: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: colors.border,
  },
  rankCircleDanger: { backgroundColor: colors.dangerLight, borderColor: colors.danger + '40' },
  rankNum: { fontSize: 13, fontWeight: '700', color: colors.text },
  rankNumDanger: { color: colors.danger },
  sellerName: { fontSize: 14, fontWeight: '600', color: colors.text },
  sellerCategory: { fontSize: 11, color: colors.muted, marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.3 },
  sellerSold: { fontSize: 14, fontWeight: '700', color: colors.success },
  sellerRevenue: { fontSize: 11, color: colors.muted, marginTop: 2 },

  daysGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  dayCard: {
    width: '47%',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    ...shadow.sm,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  dayName: { fontSize: 14, fontWeight: '800', color: colors.primary, marginBottom: spacing.sm },
  dayTopItem: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2 },
  dayTopEmoji: { fontSize: 12 },
  dayTopName: { fontSize: 12, fontWeight: '600', color: colors.text, flex: 1 },
  dayAvg: { fontSize: 11, color: colors.muted, marginBottom: spacing.xs },
  dayOtherItem: { fontSize: 11, color: colors.muted },

  emptyCard: {
    backgroundColor: colors.surface, borderRadius: radius.xl,
    padding: spacing.xxxl, alignItems: 'center', ...shadow.sm,
  },
  emptyText: {
    fontSize: 13, color: colors.muted,
    marginTop: spacing.md, textAlign: 'center', lineHeight: 20,
  },
});
