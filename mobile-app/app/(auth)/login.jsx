import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  KeyboardAvoidingView, Platform, Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { authApi } from '../../src/api/client';
import useAuthStore from '../../src/store/authStore';
import Input from '../../src/components/Input';
import Button from '../../src/components/Button';
import { colors, spacing, radius, shadow, typography } from '../../src/theme';

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { loginAdmin, loginManager } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleLogin() {
    if (!email.trim() || !password.trim()) {
      setError('Please enter email and password.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await authApi.login(email.trim(), password);
      if (res.data.user.role === 'admin') {
        await loginAdmin(res.data.user, res.data.token);
      } else if (res.data.user.role === 'manager') {
        await loginManager(res.data.user, res.data.token);
      } else {
        setError('This account does not have app access.');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Check your credentials.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.dark }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={[styles.container, { paddingTop: insets.top + spacing.xxxl }]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Logo / branding */}
        <View style={styles.logoWrap}>
          <Text style={styles.flag}>🇪🇹</Text>
          <Text style={styles.appName}>Habesha Restaurant</Text>
          <Text style={styles.tagline}>Restaurant Management System</Text>
        </View>

        {/* Account login */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Sign In</Text>
          <Text style={styles.cardSub}>Use your admin or manager account</Text>

          <Input
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="admin@habesha.com"
            keyboardType="email-address"
          />
          <Input
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder="Your password"
            secureTextEntry
          />

          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <Button
            label="Sign In"
            onPress={handleLogin}
            loading={loading}
            size="lg"
            style={styles.btn}
            icon="🔐"
          />
        </View>

        <Text style={[styles.tagline, { marginTop: spacing.xxxl, marginBottom: insets.bottom + spacing.xl }]}>
          🔒 Secured with JWT & end-to-end encryption
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.xl,
    alignItems: 'stretch',
  },
  logoWrap: {
    alignItems: 'center',
    marginBottom: spacing.xxxl,
  },
  flag: { fontSize: 56, marginBottom: spacing.md },
  appName: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.primaryLight,
    letterSpacing: 0.5,
  },
  tagline: {
    fontSize: 13,
    color: colors.muted,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.xl,
    ...shadow.lg,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  cardSub: {
    fontSize: 13,
    color: colors.muted,
    marginBottom: spacing.xl,
  },
  errorBox: {
    backgroundColor: colors.dangerLight,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  errorText: { fontSize: 13, color: colors.danger },
  btn: { marginTop: spacing.sm },
});
