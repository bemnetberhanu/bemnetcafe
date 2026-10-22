import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Modal, ScrollView, Alert, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usersApi } from '../../src/api/client';
import { colors, spacing, radius, shadow, typography } from '../../src/theme';
import Button from '../../src/components/Button';
import Input from '../../src/components/Input';
import Badge from '../../src/components/Badge';

const ROLES = ['admin', 'manager'];

const ROLE_COLORS = {
  admin: 'danger',
  manager: 'info',
};

export default function UsersScreen() {
  const insets = useSafeAreaInsets();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [resetModalVisible, setResetModalVisible] = useState(false);
  const [editing, setEditing] = useState(null);
  const [resetTarget, setResetTarget] = useState(null);
  const [saving, setSaving] = useState(false);

  // Create/Edit form
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('manager');
  const [password, setPassword] = useState('');

  // Reset password form
  const [newPassword, setNewPassword] = useState('');

  const load = () => {
    usersApi.getAll()
      .then(res => setUsers(res.data))
      .catch(() => Alert.alert('Error', 'Failed to load users.'))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  function openCreate() {
    setEditing(null);
    setName(''); setEmail(''); setRole('manager'); setPassword('');
    setModalVisible(true);
  }

  function openEdit(user) {
    setEditing(user);
    setName(user.name); setEmail(user.email); setRole(user.role); setPassword('');
    setModalVisible(true);
  }

  function openResetPassword(user) {
    setResetTarget(user);
    setNewPassword('');
    setResetModalVisible(true);
  }

  async function handleSave() {
    if (!name.trim() || !email.trim() || (!editing && !password.trim())) {
      Alert.alert('Validation', editing
        ? 'Name and email are required.'
        : 'Name, email and password are required (min. 8 characters).');
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        const data = { name: name.trim(), email: email.trim(), role, is_active: true };
        await usersApi.update(editing.id, data);
      } else {
        const data = { name: name.trim(), email: email.trim(), role, password };
        await usersApi.create(data);
      }
      setModalVisible(false);
      load();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.error || 'Save failed.');
    } finally {
      setSaving(false);
    }
  }

  async function handleResetPassword() {
    if (!newPassword.trim() || newPassword.length < 8) {
      Alert.alert('Validation', 'Password must be at least 8 characters.');
      return;
    }
    setSaving(true);
    try {
      await usersApi.resetPassword(resetTarget.id, newPassword);
      setResetModalVisible(false);
      Alert.alert('✅ Password Reset', `Password for ${resetTarget.name} has been updated.`);
    } catch (err) {
      Alert.alert('Error', err.response?.data?.error || 'Failed to reset password.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(user) {
    Alert.alert(
      'Delete User',
      `Delete "${user.name}" (${user.role})?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive',
          onPress: async () => {
            try {
              await usersApi.remove(user.id);
              load();
            } catch (err) {
              Alert.alert('Error', err.response?.data?.error || 'Cannot delete this user.');
            }
          },
        },
      ]
    );
  }

  const renderUser = ({ item }) => (
    <View style={styles.card}>
      {/* Avatar + info */}
      <View style={styles.cardTop}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{item.name.charAt(0).toUpperCase()}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.userName}>{item.name}</Text>
          <Text style={styles.userEmail}>{item.email}</Text>
          <View style={{ marginTop: spacing.xs }}>
            <Badge
              label={item.role.toUpperCase()}
              type={ROLE_COLORS[item.role] || 'muted'}
            />
          </View>
        </View>
        <Text style={styles.joinDate}>
          {new Date(item.created_at || Date.now()).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
        </Text>
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity onPress={() => openEdit(item)} style={styles.actionBtn}>
          <Text style={styles.actionBtnText}>✏️ Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => openResetPassword(item)} style={styles.actionBtn}>
          <Text style={styles.actionBtnText}>🔑 Reset PW</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => handleDelete(item)}
          style={[styles.actionBtn, styles.actionDanger]}
        >
          <Text style={[styles.actionBtnText, { color: colors.danger }]}>🗑️</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <View>
          <Text style={styles.headerTitle}>👥  Users</Text>
          <Text style={styles.headerSub}>{users.length} account{users.length !== 1 ? 's' : ''}</Text>
        </View>
        <Button label="+ Add User" onPress={openCreate} size="sm" />
      </View>

      {loading ? (
        <View style={styles.centered}><ActivityIndicator color={colors.primary} size="large" /></View>
      ) : (
        <FlatList
          data={users}
          keyExtractor={u => String(u.id)}
          renderItem={renderUser}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={{ fontSize: 36 }}>👤</Text>
              <Text style={[typography.body, { color: colors.muted, marginTop: spacing.md }]}>
                No users found
              </Text>
            </View>
          }
        />
      )}

      {/* Create / Edit Modal */}
      <Modal visible={modalVisible} animationType="slide">
        <View style={[styles.modalContainer, { paddingTop: insets.top }]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{editing ? 'Edit User' : 'New User'}</Text>
            <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.modalContent}>
            <Input
              label="Full Name"
              value={name}
              onChangeText={setName}
              placeholder="e.g. Abebe Kebede"
            />
            <Input
              label="Email"
              value={email}
              onChangeText={setEmail}
              placeholder="user@habesha.com"
              keyboardType="email-address"
            />

            {!editing && (
              <Input
                label="Password"
                value={password}
                onChangeText={setPassword}
                placeholder="min. 8 characters"
                secureTextEntry
              />
            )}

            <Text style={[typography.label, { marginBottom: spacing.sm }]}>ROLE</Text>
            <View style={styles.roleRow}>
              {ROLES.map(r => (
                <TouchableOpacity
                  key={r}
                  onPress={() => setRole(r)}
                  style={[styles.roleChip, role === r && styles.roleChipActive]}
                >
                  <Text style={{ fontSize: 18, marginRight: spacing.sm }}>
                    {r === 'admin' ? '🔐' : '👨‍🍳'}
                  </Text>
                  <View>
                    <Text style={[styles.roleChipTitle, role === r && styles.roleChipTitleActive]}>
                      {r.charAt(0).toUpperCase() + r.slice(1)}
                    </Text>
                    <Text style={styles.roleChipSub}>
                      {r === 'admin' ? 'Full access' : 'POS & Operations'}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>

            <Button
              label={saving ? 'Saving…' : editing ? 'Save Changes' : 'Create User'}
              onPress={handleSave}
              loading={saving}
              size="lg"
              icon="👤"
              style={{ marginTop: spacing.xl }}
            />
          </ScrollView>
        </View>
      </Modal>

      {/* Reset Password Modal */}
      <Modal visible={resetModalVisible} animationType="slide" transparent>
        <View style={styles.bottomSheetOverlay}>
          <View style={[styles.bottomSheet, { paddingBottom: insets.bottom + spacing.xl }]}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>🔑 Reset Password</Text>
            <Text style={styles.sheetSub}>
              Set a new password for {resetTarget?.name}
            </Text>
            <Input
              label="New Password"
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder="min. 8 characters"
              secureTextEntry
              style={{ marginTop: spacing.lg }}
            />
            <Button
              label={saving ? 'Saving…' : 'Reset Password'}
              onPress={handleResetPassword}
              loading={saving}
              size="lg"
              style={{ marginTop: spacing.md }}
            />
            <Button
              label="Cancel"
              onPress={() => setResetModalVisible(false)}
              variant="ghost"
              size="lg"
              style={{ marginTop: spacing.sm }}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    backgroundColor: colors.dark, paddingHorizontal: spacing.xl, paddingBottom: spacing.lg,
    flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between',
  },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#fff' },
  headerSub: { fontSize: 12, color: colors.primaryLight, marginTop: 2 },
  list: { padding: spacing.md },
  card: {
    backgroundColor: colors.surface, borderRadius: radius.xl,
    padding: spacing.lg, marginBottom: spacing.md, ...shadow.sm,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  avatar: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 20, fontWeight: '700', color: '#fff' },
  userName: { fontSize: 16, fontWeight: '700', color: colors.text },
  userEmail: { fontSize: 12, color: colors.muted, marginTop: 2 },
  joinDate: { fontSize: 11, color: colors.muted },
  actions: {
    flexDirection: 'row', gap: spacing.sm,
    marginTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.md,
  },
  actionBtn: {
    flex: 1, backgroundColor: colors.bg, borderRadius: radius.sm,
    padding: spacing.sm, alignItems: 'center',
  },
  actionDanger: { flex: 0, paddingHorizontal: spacing.lg, backgroundColor: colors.dangerLight },
  actionBtnText: { fontSize: 12, fontWeight: '600', color: colors.text },
  empty: { alignItems: 'center', justifyContent: 'center', padding: spacing.xxxl * 2 },
  // Create/Edit Modal
  modalContainer: { flex: 1, backgroundColor: colors.surface },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: spacing.xl, borderBottomWidth: 1, borderBottomColor: colors.border,
    backgroundColor: colors.dark,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },
  closeBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center',
  },
  closeBtnText: { color: '#fff', fontSize: 14 },
  modalContent: { padding: spacing.xl },
  roleRow: { gap: spacing.md },
  roleChip: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: radius.lg, borderWidth: 2, borderColor: colors.border,
    padding: spacing.md, backgroundColor: colors.surface,
  },
  roleChipActive: { borderColor: colors.primary, backgroundColor: colors.primary + '12' },
  roleChipTitle: { fontSize: 14, fontWeight: '700', color: colors.text },
  roleChipTitleActive: { color: colors.primary },
  roleChipSub: { fontSize: 11, color: colors.muted, marginTop: 2 },
  // Reset PW bottom sheet
  bottomSheetOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end',
  },
  bottomSheet: {
    backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: spacing.xl, ...shadow.lg,
  },
  sheetHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: colors.border, alignSelf: 'center', marginBottom: spacing.xl,
  },
  sheetTitle: { fontSize: 20, fontWeight: '700', color: colors.text },
  sheetSub: { fontSize: 13, color: colors.muted, marginTop: spacing.xs },
});
