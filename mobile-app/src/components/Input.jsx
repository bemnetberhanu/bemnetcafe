import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, spacing, radius, typography } from '../theme';

export default function Input({
  label, value, onChangeText, placeholder,
  secureTextEntry, keyboardType, multiline, numberOfLines,
  error, editable = true, style, inputStyle,
}) {
  const [show, setShow] = useState(false);

  return (
    <View style={[styles.container, style]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={[
        styles.inputWrap,
        !!error && styles.inputError,
        !editable && styles.inputDisabled,
      ]}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.muted}
          secureTextEntry={secureTextEntry && !show}
          keyboardType={keyboardType}
          multiline={multiline}
          numberOfLines={numberOfLines}
          editable={editable}
          style={[styles.input, multiline && styles.multiline, inputStyle]}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {secureTextEntry && (
          <TouchableOpacity onPress={() => setShow(s => !s)} style={styles.eyeBtn}>
            <Text style={{ fontSize: 18 }}>{show ? '🙈' : '👁️'}</Text>
          </TouchableOpacity>
        )}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: spacing.md },
  label: { ...typography.label, marginBottom: spacing.xs },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
  },
  input: {
    flex: 1,
    paddingVertical: spacing.md,
    fontSize: 14,
    color: colors.text,
  },
  multiline: {
    height: 80,
    textAlignVertical: 'top',
    paddingTop: spacing.md,
  },
  inputError: { borderColor: colors.danger },
  inputDisabled: { backgroundColor: colors.bg, opacity: 0.7 },
  eyeBtn: { padding: spacing.sm },
  error: { fontSize: 12, color: colors.danger, marginTop: 4 },
});
