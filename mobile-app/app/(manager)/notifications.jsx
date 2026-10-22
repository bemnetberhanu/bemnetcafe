import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, FlatList,
  TouchableOpacity, RefreshControl, ActivityIndicator, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { notificationsApi, ingredientsApi } from '../../src/api/client';
import { colors, spacing, radius, shadow, typography } from '../../src/theme';

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const [lowStock, setLowStock] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [ingRes, notRes] = await Promise.all([
        ingredientsApi.getAll(),
        notificationsApi.getAll(30),
      ]);
      setLowStock(ingRes.data.filter(i => i.is_low_stock));
      setNotifications(notRes.data.notifications || notRes.data || []);
    } catch {
      Alert.alert('Error', 'Failed to load alerts.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, []);

  const onRefresh = () => { setRefreshing(true); load(); };

  async function markRead(id) {
    try {
      await notificationsApi.markRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: 1 } : n));
    } catch {}
  }

  async function markAllRead() {
    try {
      await notificationsApi.markAllRead();
      setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })));
    } catch {}
  }

  const unreadCount = notifications.filter(n => !n.is_read).length;

  if (loading) {
    return <View style={styles.centered}><ActivityIndicator color={colors.primary} /></View>;
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <Text style={styles.headerTitle}>🔔  Alerts & Stock</Text>
        <Text style={styles.headerSub}>Low stock warnings and system notifications</Text>
      </View>

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        contentContainerStyle={styles.content}
      >
        {/* Low stock section */}
        <Text style={[typography.label, { marginBottom: spacing.sm }]}>
          LIVE LOW STOCK {lowStock.length > 0 ? `(${lowStock.length})` : ''}
        </Text>

        {lowStock.length === 0 ? (
          <View style={styles.allGoodBox}>
            <Text style={{ fontSize: 36 }}>✅</Text>
            <Text style={styles.allGoodText}>All ingredients are well stocked!</Text>
          </View>
        ) : (
          lowStock.map(ing => (
            <View key={ing.id} style={styles.lowStockCard}>
              <View style={styles.lowStockLeft}>
                <Text style={styles.lowStockName}>{ing.name}</Text>
                <Text style={styles.lowStockUnit}>{ing.unit_of_measure}</Text>
              </View>
              <View style={styles.lowStockRight}>
                <Text style={styles.lowStockQty}>
                  {parseFloat(ing.current_quantity).toFixed(2)}
                </Text>
                <Text style={styles.lowStockThreshold}>
                  /{parseFloat(ing.reorder_level).toFixed(2)} min
                </Text>
              </View>
              <View style={styles.reorderTag}>
                <Text style={styles.reorderTagText}>
                  Order {parseFloat(ing.reorder_quantity).toFixed(2)}
                </Text>
              </View>
            </View>
          ))
        )}

        {/* Notification log */}
        <View style={styles.notifHeader}>
          <Text style={[typography.label]}>NOTIFICATION LOG</Text>
          {unreadCount > 0 && (
            <TouchableOpacity onPress={markAllRead} style={styles.markAllBtn}>
              <Text style={styles.markAllText}>Mark all read</Text>
            </TouchableOpacity>
          )}
        </View>

        {notifications.length === 0 ? (
          <Text style={[typography.body, { color: colors.muted, textAlign: 'center', padding: spacing.xl }]}>
            No notifications yet.
          </Text>
        ) : (
          notifications.map(n => (
            <TouchableOpacity
              key={n.id}
              onPress={() => !n.is_read && markRead(n.id)}
              style={[styles.notifCard, !n.is_read && styles.notifUnread]}
              activeOpacity={n.is_read ? 1 : 0.7}
            >
              <View style={styles.notifRow}>
                <Text style={styles.notifType}>
                  {n.type === 'low_stock' ? '⚠️' : '📋'} {n.type.replace(/_/g, ' ')}
                </Text>
                {!n.is_read && <View style={styles.unreadDot} />}
              </View>
              <Text style={styles.notifMsg}>{n.message}</Text>
              <Text style={styles.notifTime}>{new Date(n.created_at).toLocaleString()}</Text>
            </TouchableOpacity>
          ))
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
  allGoodBox: {
    alignItems: 'center', padding: spacing.xxxl,
    backgroundColor: colors.successLight, borderRadius: radius.xl, marginBottom: spacing.xl,
  },
  allGoodText: { fontSize: 15, fontWeight: '600', color: colors.success, marginTop: spacing.sm },
  lowStockCard: {
    backgroundColor: colors.dangerLight, borderRadius: radius.md,
    padding: spacing.md, marginBottom: spacing.sm,
    borderLeftWidth: 4, borderLeftColor: colors.danger,
    flexDirection: 'row', alignItems: 'center',
  },
  lowStockLeft: { flex: 1 },
  lowStockName: { fontSize: 14, fontWeight: '700', color: colors.danger },
  lowStockUnit: { fontSize: 11, color: colors.muted },
  lowStockRight: { alignItems: 'flex-end', marginRight: spacing.md },
  lowStockQty: { fontSize: 18, fontWeight: '800', color: colors.danger },
  lowStockThreshold: { fontSize: 11, color: colors.muted },
  reorderTag: { backgroundColor: colors.danger, borderRadius: radius.sm, paddingHorizontal: spacing.sm, paddingVertical: 2 },
  reorderTagText: { fontSize: 11, color: '#fff', fontWeight: '700' },
  notifHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginTop: spacing.xl, marginBottom: spacing.sm,
  },
  markAllBtn: { backgroundColor: colors.primary + '20', paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radius.full },
  markAllText: { fontSize: 12, color: colors.primary, fontWeight: '700' },
  notifCard: {
    backgroundColor: colors.surface, borderRadius: radius.md,
    padding: spacing.md, marginBottom: spacing.sm, ...shadow.sm,
  },
  notifUnread: { backgroundColor: colors.warningLight, borderLeftWidth: 3, borderLeftColor: colors.warning },
  notifRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  notifType: { fontSize: 12, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.warning },
  notifMsg: { fontSize: 13, color: colors.text, marginTop: spacing.xs, lineHeight: 18 },
  notifTime: { fontSize: 11, color: colors.muted, marginTop: spacing.xs },
});
