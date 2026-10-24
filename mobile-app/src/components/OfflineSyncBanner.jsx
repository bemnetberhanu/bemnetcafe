import React, { useEffect, useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import useAuthStore from '../store/authStore';
import { colors, radius, spacing } from '../theme';
import { retryConflicts, syncPendingRecords, useOfflineSyncStore } from '../offline/sync';

const labels = { order: 'Order', purchase: 'Purchase', expense: 'Expense' };

export default function OfflineSyncBanner() {
  const userId = useAuthStore((state) => state.user?.id);
  const role = useAuthStore((state) => state.role);
  const { online, syncing, pending, conflicts, conflictRecords, refresh } = useOfflineSyncStore();
  const [reviewVisible, setReviewVisible] = useState(false);
  const visible = online === false || pending > 0 || conflicts > 0;

  useEffect(() => {
    if (role === 'manager' && userId) refresh(userId);
  }, [role, userId, refresh]);

  if (role !== 'manager' || !userId || !visible) return null;

  return (
    <>
      <View style={styles.banner}>
        <Text style={styles.message}>
          {online === false
            ? `Offline${pending ? ` · ${pending} waiting to sync` : ''}`
            : conflicts
              ? `${conflicts} record${conflicts === 1 ? '' : 's'} need review`
              : syncing
                ? 'Syncing saved records…'
                : `${pending} record${pending === 1 ? '' : 's'} waiting to sync`}
        </Text>
        {conflicts > 0 ? (
          <TouchableOpacity onPress={() => setReviewVisible(true)} accessibilityRole="button">
            <Text style={styles.action}>Review</Text>
          </TouchableOpacity>
        ) : online === true && pending > 0 ? (
          <TouchableOpacity onPress={() => syncPendingRecords(userId)} accessibilityRole="button">
            <Text style={styles.action}>{syncing ? 'Syncing' : 'Sync now'}</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <Modal visible={reviewVisible} transparent animationType="fade" onRequestClose={() => setReviewVisible(false)}>
        <View style={styles.overlay}>
          <View style={styles.dialog}>
            <Text style={styles.title}>Records needing review</Text>
            <Text style={styles.description}>
              These records are saved on this device but could not be accepted by the server. Stock can change while offline; resolve the issue before retrying.
            </Text>
            <ScrollView style={styles.records}>
              {conflictRecords.map((record) => (
                <View key={record.id} style={styles.record}>
                  <Text style={styles.recordTitle}>{labels[record.type] || 'Record'}</Text>
                  <Text style={styles.recordError}>{record.error || 'The server rejected this record.'}</Text>
                  <Text style={styles.recordDate}>{new Date(record.created_at).toLocaleString()}</Text>
                </View>
              ))}
            </ScrollView>
            <View style={styles.actions}>
              <TouchableOpacity onPress={() => setReviewVisible(false)} style={styles.cancel}>
                <Text style={styles.cancelText}>Close</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={async () => {
                  await retryConflicts(userId);
                  setReviewVisible(false);
                }}
                disabled={online !== true || syncing}
                style={[styles.retry, (online !== true || syncing) && styles.disabled]}
              >
                <Text style={styles.retryText}>Retry all</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  banner: {
    minHeight: 36,
    backgroundColor: '#fff3cd',
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  message: { color: '#664d03', fontSize: 12, fontWeight: '600', flex: 1 },
  action: { color: colors.primary, fontSize: 12, fontWeight: '700', marginLeft: spacing.md },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: spacing.xl },
  dialog: { maxHeight: '80%', backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.xl },
  title: { fontSize: 18, fontWeight: '700', color: colors.text },
  description: { fontSize: 13, color: colors.textSecondary, marginTop: spacing.sm, lineHeight: 19 },
  records: { marginTop: spacing.md },
  record: { borderTopWidth: 1, borderTopColor: colors.border, paddingVertical: spacing.md },
  recordTitle: { color: colors.text, fontWeight: '700' },
  recordError: { color: colors.danger, fontSize: 12, marginTop: 3 },
  recordDate: { color: colors.muted, fontSize: 11, marginTop: 3 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: spacing.md },
  cancel: { padding: spacing.md },
  cancelText: { color: colors.muted, fontWeight: '600' },
  retry: { backgroundColor: colors.primary, borderRadius: radius.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  retryText: { color: '#fff', fontWeight: '700' },
  disabled: { opacity: 0.5 },
});
