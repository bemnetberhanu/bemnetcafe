import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, radius, shadow, typography } from '../theme';

export default function StatCard({ icon, label, value, sub, color, style }) {
  const accent = color || colors.primary;
  return (
    <View style={[styles.card, style]}>
      <View style={[styles.iconWrap, { backgroundColor: accent + '18' }]}>
        <Text style={{ fontSize: 22 }}>{icon}</Text>
      </View>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, { color: accent }]}>{value}</Text>
      {sub ? <Text style={styles.sub}>{sub}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    minWidth: 140,
    ...shadow.sm,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  label: {
    ...typography.label,
    marginBottom: spacing.xs,
  },
  value: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 2,
  },
  sub: {
    ...typography.bodySmall,
    color: colors.muted,
  },
});
