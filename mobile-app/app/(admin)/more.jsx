import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { authApi } from '../../src/api/client';
import useAuthStore from '../../src/store/authStore';
import { colors, spacing, radius, shadow, typography } from '../../src/theme';
import Button from '../../src/components/Button';
import Input from '../../src/components/Input';

function SectionHeader({ title }) {
  return (
    <Text style={styles.sectionHeader}>{title}</Text>
  );
}

function SettingRow({ icon, label, sub, onPress, rightElement, danger }) {
  return (
    <TouchableOpacity
      style={styles.settingRow}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <Text style={styles.settingIcon}>{icon}</Text>
      <View style={{ flex: 1 }}>
        <Text style={[styles.settingLabel, danger && { color: colors.danger }]}>{label}</Text>
        {sub ? <Text style={styles.settingSub}>{sub}</Text> : null}
      </View>
      {rightElement || (onPress ? <Text style={styles.settingChevron}>›</Text> : null)}
    </TouchableOpacity>
  );
}

export default function MoreScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [changingPw, setChangingPw] = useState(false);
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [savingPw, setSavingPw] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleChangePassword() {
    if (!currentPw || !newPw || !confirmPw) {
      Alert.alert('Validation', 'All fields are required.');
      return;
    }
    if (newPw !== confirmPw) {
      Alert.alert('Validation', 'New passwords do not match.');
      return;
    }
    if (newPw.length < 8) {
      Alert.alert('Validation', 'Password must be at least 8 characters.');
      return;
    }
    setSavingPw(true);
    try {
      await authApi.changePassword(currentPw, newPw);
      Alert.alert('✅ Success', 'Your password has been changed.');
      setCurrentPw(''); setNewPw(''); setConfirmPw('');
      setChangingPw(false);
    } catch (err) {
      Alert.alert('Error', err.response?.data?.error || 'Failed to change password.');
    } finally {
      setSavingPw(false);
    }
  }

  async function handleLogout() {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out', style: 'destructive',
          onPress: async () => {
            setLoggingOut(true);
            await logout();
            setLoggingOut(false);
          },
        },
      ]
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <Text style={styles.headerTitle}>⚙️  Settings</Text>
        <Text style={styles.headerSub}>Account & preferences</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>

        {/* Profile card */}
        <View style={styles.profileCard}>
          <View style={styles.profileAvatar}>
            <Text style={styles.profileAvatarText}>
              {user?.name?.charAt(0)?.toUpperCase() || 'A'}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.profileName}>{user?.name || 'Admin'}</Text>
            <Text style={styles.profileEmail}>{user?.email || ''}</Text>
            <View style={styles.adminBadge}>
              <Text style={styles.adminBadgeText}>🔐 ADMINISTRATOR</Text>
            </View>
          </View>
        </View>

        <SectionHeader title="MANAGEMENT" />
        <View style={styles.card}>
          <SettingRow
            icon="💰"
            label="Financial Report"
            sub="Revenue, expenses and profit"
            onPress={() => router.push('/(admin)/financial')}
          />
          <View style={styles.divider} />
          <SettingRow
            icon="🏆"
            label="Sales Ranking"
            sub="Top sellers and sales patterns"
            onPress={() => router.push('/(admin)/ranking')}
          />
          <View style={styles.divider} />
          <SettingRow
            icon="🧾"
            label="Expenses"
            sub="View and manage operating costs"
            onPress={() => router.push('/(admin)/expenses')}
          />
          <View style={styles.divider} />
          <SettingRow
            icon="👥"
            label="User Management"
            sub="Manage admin and manager accounts"
            onPress={() => router.push('/(admin)/users')}
          />
        </View>

        {/* Account section */}
        <SectionHeader title="ACCOUNT" />
        <View style={styles.card}>
          <SettingRow
            icon="🔑"
            label="Change Password"
            sub="Update your login password"
            onPress={() => setChangingPw(v => !v)}
          />
          {changingPw && (
            <View style={styles.changePwForm}>
              <Input
                label="Current Password"
                value={currentPw}
                onChangeText={setCurrentPw}
                placeholder="Your current password"
                secureTextEntry
              />
              <Input
                label="New Password"
                value={newPw}
                onChangeText={setNewPw}
                placeholder="min. 8 characters"
                secureTextEntry
              />
              <Input
                label="Confirm New Password"
                value={confirmPw}
                onChangeText={setConfirmPw}
                placeholder="Repeat new password"
                secureTextEntry
              />
              <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                <Button
                  label="Cancel"
                  onPress={() => { setChangingPw(false); setCurrentPw(''); setNewPw(''); setConfirmPw(''); }}
                  variant="ghost"
                  style={{ flex: 1 }}
                />
                <Button
                  label={savingPw ? 'Saving…' : 'Update'}
                  onPress={handleChangePassword}
                  loading={savingPw}
                  style={{ flex: 1 }}
                />
              </View>
            </View>
          )}
        </View>

        {/* App info section */}
        <SectionHeader title="APPLICATION" />
        <View style={styles.card}>
          <SettingRow
            icon="🏠"
            label="Restaurant Name"
            sub="Habesha Restaurant"
          />
          <View style={styles.divider} />
          <SettingRow
            icon="🌍"
            label="Timezone"
            sub="Africa/Addis_Ababa (EAT +3)"
          />
          <View style={styles.divider} />
          <SettingRow
            icon="💱"
            label="Currency"
            sub="Ethiopian Birr (ETB)"
          />
          <View style={styles.divider} />
          <SettingRow
            icon="📅"
            label="Low-Stock Check"
            sub="Runs daily at 9:00 AM"
          />
        </View>

        {/* System info section */}
        <SectionHeader title="SYSTEM" />
        <View style={styles.card}>
          <SettingRow
            icon="📱"
            label="App Version"
            sub="Habesha Restaurant v1.0.0"
          />
          <View style={styles.divider} />
          <SettingRow
            icon="🔌"
            label="API"
            sub="Connected to backend"
          />
          <View style={styles.divider} />
          <SettingRow
            icon="📊"
            label="Analytics"
            sub="Financial, ranking & pattern reports"
          />
        </View>

        {/* About section */}
        <SectionHeader title="ABOUT" />
        <View style={styles.card}>
          <SettingRow
            icon="🇪🇹"
            label="Habesha Restaurant System"
            sub="Built for Ethiopian restaurant management"
          />
        </View>

        {/* Logout */}
        <View style={styles.logoutSection}>
          <Button
            label={loggingOut ? 'Signing out…' : 'Sign Out'}
            onPress={handleLogout}
            loading={loggingOut}
            variant="danger"
            size="lg"
            icon="🚪"
          />
          <Text style={styles.logoutNote}>
            You will be returned to the login screen
          </Text>
        </View>

        {/* Footer */}
        <Text style={styles.footer}>
          🇪🇹 Habesha Restaurant Management System{'\n'}
          All rights reserved © {new Date().getFullYear()}
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: colors.dark,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg,
  },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#fff' },
  headerSub: { fontSize: 12, color: colors.primaryLight, marginTop: 2 },
  content: {
    padding: spacing.xl,
    paddingBottom: spacing.xxxl * 2,
  },
  profileCard: {
    backgroundColor: colors.dark,
    borderRadius: radius.xl,
    padding: spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    marginBottom: spacing.xl,
    ...shadow.md,
  },
  profileAvatar: {
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  profileAvatarText: {
    fontSize: 26, fontWeight: '800', color: '#fff',
  },
  profileName: {
    fontSize: 18, fontWeight: '700', color: '#fff',
  },
  profileEmail: {
    fontSize: 12, color: colors.muted, marginTop: 2,
  },
  adminBadge: {
    marginTop: spacing.sm, alignSelf: 'flex-start',
    backgroundColor: colors.primary + '30',
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: colors.primary + '60',
  },
  adminBadgeText: {
    fontSize: 10, fontWeight: '700', color: colors.primaryLight, letterSpacing: 0.5,
  },
  sectionHeader: {
    ...typography.label,
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    marginBottom: spacing.md,
    overflow: 'hidden',
    ...shadow.sm,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    gap: spacing.md,
    minHeight: 56,
  },
  settingIcon: { fontSize: 20, width: 28, textAlign: 'center' },
  settingLabel: { fontSize: 14, fontWeight: '600', color: colors.text },
  settingSub: { fontSize: 12, color: colors.muted, marginTop: 2 },
  settingChevron: { fontSize: 20, color: colors.muted },
  divider: {
    height: 1, backgroundColor: colors.border,
    marginLeft: spacing.xl + 28 + spacing.md,
  },
  changePwForm: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.bg,
  },
  logoutSection: {
    marginTop: spacing.xl,
    gap: spacing.sm,
  },
  logoutNote: {
    fontSize: 12, color: colors.muted, textAlign: 'center',
  },
  footer: {
    fontSize: 11, color: colors.muted, textAlign: 'center',
    marginTop: spacing.xxxl, lineHeight: 18,
  },
});
