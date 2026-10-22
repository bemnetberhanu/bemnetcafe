import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { expensesApi } from '../../src/api/client';
import { colors, spacing, radius, shadow, typography } from '../../src/theme';
import Button from '../../src/components/Button';
import Input from '../../src/components/Input';

const CATEGORIES = [
  'Rent', 'Electricity', 'Water', 'Gas', 'Staff Salary',
  'Cleaning', 'Marketing', 'Maintenance', 'Other',
];

export default function ExpensesScreen() {
  const insets = useSafeAreaInsets();
  const [recentExpenses, setRecentExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');

  const loadExpenses = () => {
    expensesApi.getAll()
      .then(res => setRecentExpenses(res.data.slice(0, 10)))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadExpenses(); }, []);

  async function handleSubmit() {
    if (!amount || !category) {
      Alert.alert('Validation', 'Amount and category are required.');
      return;
    }
    setSubmitting(true);
    try {
      await expensesApi.create({ expense_date: date, amount: parseFloat(amount), category, description });
      Alert.alert('✅ Expense Recorded');
      setAmount('');
      setCategory('');
      setDescription('');
      loadExpenses();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.error || 'Failed to record expense.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <Text style={styles.headerTitle}>🧾  Add Expense</Text>
        <Text style={styles.headerSub}>Record operating costs</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Input
            label="Date"
            value={date}
            onChangeText={setDate}
            placeholder="YYYY-MM-DD"
            keyboardType="default"
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
            placeholder="Any notes…"
            multiline
            style={{ marginTop: spacing.md }}
          />

          <Button
            label="Record Expense"
            onPress={handleSubmit}
            loading={submitting}
            size="lg"
            icon="🧾"
            style={{ marginTop: spacing.md }}
          />
        </View>

        {/* Recent expenses */}
        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xl }} />
        ) : recentExpenses.length > 0 ? (
          <>
            <Text style={[typography.label, { marginBottom: spacing.sm, marginTop: spacing.xl }]}>RECENT EXPENSES</Text>
            {recentExpenses.map(exp => (
              <View key={exp.id} style={styles.expenseRow}>
                <View style={styles.expenseLeft}>
                  <Text style={styles.expenseCategory}>{exp.category}</Text>
                  <Text style={styles.expenseDate}>{new Date(exp.expense_date).toLocaleDateString()}</Text>
                  {exp.description ? <Text style={styles.expenseDesc} numberOfLines={1}>{exp.description}</Text> : null}
                </View>
                <Text style={styles.expenseAmount}>ETB {parseFloat(exp.amount).toFixed(2)}</Text>
              </View>
            ))}
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { backgroundColor: colors.dark, paddingHorizontal: spacing.xl, paddingBottom: spacing.lg },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#fff' },
  headerSub: { fontSize: 12, color: colors.primaryLight, marginTop: 2 },
  content: { padding: spacing.xl },
  card: { backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.xl, ...shadow.md, marginBottom: spacing.xl },
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  catChip: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.full, backgroundColor: colors.border },
  catChipActive: { backgroundColor: colors.primary },
  catChipText: { fontSize: 12, fontWeight: '500', color: colors.text },
  catChipTextActive: { color: '#fff', fontWeight: '700' },
  expenseRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: colors.surface, borderRadius: radius.md,
    padding: spacing.md, marginBottom: spacing.sm, ...shadow.sm,
  },
  expenseLeft: { flex: 1 },
  expenseCategory: { fontSize: 14, fontWeight: '600', color: colors.text },
  expenseDate: { fontSize: 11, color: colors.muted, marginTop: 2 },
  expenseDesc: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  expenseAmount: { fontSize: 16, fontWeight: '700', color: colors.primary },
});
