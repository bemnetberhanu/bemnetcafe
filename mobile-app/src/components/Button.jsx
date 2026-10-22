import React from 'react';
import {
  TouchableOpacity, Text, StyleSheet, ActivityIndicator, View,
} from 'react-native';
import { colors, spacing, radius, typography } from '../theme';

export default function Button({
  label, onPress, loading, disabled,
  variant = 'primary', // 'primary' | 'secondary' | 'danger' | 'ghost'
  size = 'md',         // 'sm' | 'md' | 'lg'
  icon, style, textStyle,
}) {
  const bg = {
    primary: colors.primary,
    secondary: colors.border,
    danger: colors.danger,
    ghost: 'transparent',
  }[variant];

  const fg = {
    primary: colors.white,
    secondary: colors.text,
    danger: colors.white,
    ghost: colors.primary,
  }[variant];

  const pad = { sm: spacing.sm, md: spacing.md, lg: spacing.lg }[size];
  const fs = { sm: 12, md: 14, lg: 16 }[size];

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.75}
      style={[
        styles.base,
        { backgroundColor: bg, paddingVertical: pad, paddingHorizontal: pad * 1.5, opacity: disabled ? 0.5 : 1 },
        variant === 'ghost' && styles.ghost,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} size="small" />
      ) : (
        <View style={styles.row}>
          {icon ? <Text style={{ fontSize: fs, marginRight: 6 }}>{icon}</Text> : null}
          <Text style={[styles.label, { color: fg, fontSize: fs }, textStyle]}>{label}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ghost: {
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  label: {
    fontWeight: '600',
  },
});
