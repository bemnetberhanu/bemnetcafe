import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Modal, ScrollView, Alert, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { expensesApi } from '../../src/api/client';
import { colors, spacing, radius, shadow, typography } from '../../src/theme';
import Button from '../../src/components/Button';
import Input from '../../src/components/Input';
import Badge from '../../src/components/Badge';

const CATEGORIES = [
  'Rent', 'Electricity', 'Water', 'Gas', 'Staff Salary',
  'Cleaning', 'Marketing', 'Maintenance', 'Other',
];

const CATEGORY_ICONS = {
  Rent: '🏠', Electricity: '⚡', Water: '💧', Gas: '🔥',
  'Staff Salary': '👨‍💼', Cleaning: '🧹', Marketing: '📢',
  Maintenance: '🔧', Other: '📦',
};

export default function AdminExpensesScreen() {
  const insets = useSafeAreaInsets();
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);

  // Form state
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');

  const load = () => {
    expensesApi.getAll()
      .then(res => setExpenses(res.data))
      .catch(() => Alert.alert('Error', 'Failed to load expenses.'))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  function openCreate() {
    setEditing(null);
    setDate(new Date().toISOString().split('T')[0]);
    setAmount(''); setCategory(''); setDescription('');
    setModalVisible(true);
  }

  function openEdit(expense) {
    setEditing(expense);
    setDate(expense.expense_date?.split('T')[0] || expense.expense_date || '');
    setAmount(String(expense.amount));
    setCategory(expense.category);
    setDescription(expense.description || '');
    setModalVisible(true);
  }

  async function handleSave() {
    if (!amount || !category) {
      Alert.alert('Validation', 'Amount and category are required.');
      return;
    }
    setSaving(true);
    try {
      const data = {
        expense_date: date,
        amount: parseFloat(amount),
        category,
        description,
      };
      if (editing) await expensesApi.update(editing.id, data);
      else await expensesApi.create(data);
      setModalVisible(false);
      load();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.error || 'Save failed.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(expense) {
    Alert.alert(
      'Delete Expense',
      `Delete ${expense.category} — ETB ${parseFloat(expense.amount).toFixed(2)}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive',
          onPress: async () => {
            setDeleting(expense.id);
            try {
              await expensesApi.remove(expense.id);
              load();
            } catch (err) {
              Alert.alert('Error', err.response?.data?.error || 'Failed to delete.');
            } finally {
              setDeleting(null);
            }
          },
        },
      ]
    );
  }

  // Group by month for display
  const totalExpenses = expenses.reduce((s, e) => s + parseFloat(e.amount || 0), 0);

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardRow}>
        <Text style={styles.catIcon}>{CATEGORY_ICONS[item.category] || '📦'}</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.catName}>{item.category}</Text>
          <Text style={styles.expDate}>
            {new Date(item.expense_date).toLocaleDateString('en-US', {
              weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
            })}
          </Text>
          {item.description ? (
            <Text style={styles.expDesc} numberOfLines={2}>{item.description}</Text>
          ) : null}
        </View>
        <Text style={styles.expAmount}>ETB {parseFloat(item.amount).toFixed(2)}</Text>
      </View>
      <View style={styles.actions}>
        <TouchableOpacity onPress={() => openEdit(item)} style={styles.actionBtn}>
          <Text style={styles.actionBtnText}>✏️ Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => handleDelete(item)}
          style={[styles.actionBtn, styles.actionDanger]}
          disabled={deleting === item.id}
        >
          {deleting === item.id
            ? <ActivityIndicator color={colors.danger} size="small" />
            : <Text style={[styles.actionBtnText, { color: colors.danger }]}>🗑️ Delete</Text>
          }
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <View>
          <Text style={styles.headerTitle}>🧾  Expenses</Text>
          <Text style={styles.headerSub}>Total: ETB {totalExpenses.toFixed(2)}</Text>
        </View>
        <Button label="+ Add" onPress={openCreate} size="sm" />
      </View>

      {loading ? (
        <View style={styles.centered}><ActivityIndicator color={colors.primary} size="large" /></View>
      ) : (
        <FlatList
          data={expenses}
          keyExtractor={e => String(e.id)}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={{ fontSize: 36 }}>🧾</Text>
              <Text style={[typography.body, { color: colors.muted, marginTop: spacing.md }]}>
                No expenses recorded yet
              </Text>
            </View>
          }
        />
      )}

      {/* Create / Edit Modal */}
      <Modal visible={modalVisible} animationType="slide">
        <View style={[styles.modalContainer, { paddingTop: insets.top }]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{editing ? 'Edit Expense' : 'New Expense'}</Text>
            <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.modalContent}>
            <Input
              label="Date"
              value={date}
              onChangeText={setDate}
              placeholder="YYYY-MM-DD"
            />
            <Input
              label="Amount (ETB)"
              value={amount}
              onChangeText={setAmount}
              placeholder="0.00"
              keyboardType="numeric"
            />

            <Text style={[typography.label, { marginBottom: spacing.sm }]}>CATEGORY</Text>
            <View style={styles.catGrid}>
              {CATEGORIES.map(cat => (
                <TouchableOpacity
                  key={cat}
                  onPress={() => setCategory(cat)}
                  style={[styles.catChip, category === cat && styles.catChipActive]}
                >
                  <Text style={{ fontSize: 14, marginRight: 4 }}>{CATEGORY_ICONS[cat] || '📦'}</Text>
                  <Text style={[styles.catChipText, category === cat && styles.catChipTextActive]}>
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Input
              label="Description (optional)"
              value={description}
              onChangeText={setDescription}
              placeholder="Notes…"
              multiline
              style={{ marginTop: spacing.md }}
            />

            <Button
              label={saving ? 'Saving…' : editing ? 'Save Changes' : 'Record Expense'}
              onPress={handleSave}
              loading={saving}
              size="lg"
              icon="🧾"
              style={{ marginTop: spacing.xl }}
            />
          </ScrollView>
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
  cardRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  catIcon: { fontSize: 28, marginTop: 2 },
  catName: { fontSize: 15, fontWeight: '700', color: colors.text },
  expDate: { fontSize: 12, color: colors.muted, marginTop: 2 },
  expDesc: { fontSize: 12, color: colors.textSecondary, marginTop: 4 },
  expAmount: { fontSize: 18, fontWeight: '800', color: colors.primary, marginTop: 2 },
  actions: {
    flexDirection: 'row', gap: spacing.sm,
    marginTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.md,
  },
  actionBtn: {
    flex: 1, backgroundColor: colors.bg, borderRadius: radius.sm,
    padding: spacing.sm, alignItems: 'center',
  },
  actionDanger: { backgroundColor: colors.dangerLight },
  actionBtnText: { fontSize: 12, fontWeight: '600', color: colors.text },
  empty: { alignItems: 'center', justifyContent: 'center', padding: spacing.xxxl * 2 },
  // Modal
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
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg },
  catChip: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderRadius: radius.full, backgroundColor: colors.border,
  },
  catChipActive: { backgroundColor: colors.primary },
  catChipText: { fontSize: 12, fontWeight: '500', color: colors.text },
  catChipTextActive: { color: '#fff', fontWeight: '700' },
});
