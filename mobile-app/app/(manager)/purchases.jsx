import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, FlatList,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ingredientsApi, purchasesApi } from '../../src/api/client';
import { colors, spacing, radius, shadow, typography } from '../../src/theme';
import Button from '../../src/components/Button';
import Input from '../../src/components/Input';

const EMPTY_ROW = () => ({ id: Date.now(), ingredient_id: null, ingredient_name: '', quantity_bought: '', cost_per_unit_at_time: '' });

export default function PurchasesScreen() {
  const insets = useSafeAreaInsets();
  const [ingredients, setIngredients] = useState([]);
  const [recentPurchases, setRecentPurchases] = useState([]);
  const [rows, setRows] = useState([EMPTY_ROW()]);
  const [supplierName, setSupplierName] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [pickerRowId, setPickerRowId] = useState(null);

  useEffect(() => {
    Promise.all([ingredientsApi.getAll(), purchasesApi.getAll()])
      .then(([iRes, pRes]) => {
        setIngredients(iRes.data);
        setRecentPurchases(pRes.data.slice(0, 5));
      })
      .catch(() => Alert.alert('Error', 'Failed to load data.'))
      .finally(() => setLoading(false));
  }, []);

  function updateRow(id, field, value) {
    setRows(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
  }

  function addRow() { setRows(prev => [...prev, EMPTY_ROW()]); }
  function removeRow(id) { if (rows.length > 1) setRows(prev => prev.filter(r => r.id !== id)); }

  const totalCost = rows.reduce((s, r) => {
    const q = parseFloat(r.quantity_bought) || 0;
    const c = parseFloat(r.cost_per_unit_at_time) || 0;
    return s + q * c;
  }, 0);

  async function handleSubmit() {
    const validRows = rows.filter(r => r.ingredient_id && r.quantity_bought && r.cost_per_unit_at_time);
    if (validRows.length === 0) {
      Alert.alert('Validation', 'Add at least one ingredient with quantity and cost.');
      return;
    }
    setSubmitting(true);
    try {
      await purchasesApi.create({
        supplier_name: supplierName,
        notes,
        items: validRows.map(r => ({
          ingredient_id: r.ingredient_id,
          quantity_bought: parseFloat(r.quantity_bought),
          cost_per_unit_at_time: parseFloat(r.cost_per_unit_at_time),
        })),
      });
      Alert.alert('✅ Purchase Recorded', 'Inventory has been updated.');
      setRows([EMPTY_ROW()]);
      setSupplierName('');
      setNotes('');
      purchasesApi.getAll().then(res => setRecentPurchases(res.data.slice(0, 5)));
      ingredientsApi.getAll().then(res => setIngredients(res.data));
    } catch (err) {
      Alert.alert('Error', err.response?.data?.error || 'Failed to record purchase.');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <Text style={styles.headerTitle}>📦  Record Purchase</Text>
        <Text style={styles.headerSub}>Restock ingredients</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Input label="Supplier Name (optional)" value={supplierName} onChangeText={setSupplierName} placeholder="e.g. Merkato Market" />
        <Input label="Notes (optional)" value={notes} onChangeText={setNotes} placeholder="Any notes…" multiline />

        <Text style={[typography.label, { marginBottom: spacing.sm }]}>INGREDIENTS</Text>

        {rows.map((row, idx) => (
          <View key={row.id} style={styles.rowCard}>
            <View style={styles.rowHeader}>
              <Text style={styles.rowNum}>#{idx + 1}</Text>
              {rows.length > 1 && (
                <TouchableOpacity onPress={() => removeRow(row.id)}>
                  <Text style={{ color: colors.danger, fontWeight: '700' }}>✕ Remove</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Ingredient picker */}
            <TouchableOpacity
              style={styles.picker}
              onPress={() => setPickerRowId(row.id)}
            >
              <Text style={[styles.pickerText, !row.ingredient_id && { color: colors.muted }]}>
                {row.ingredient_name || 'Tap to choose ingredient…'}
              </Text>
              <Text style={{ fontSize: 16 }}>▾</Text>
            </TouchableOpacity>

            <View style={styles.rowInputs}>
              <Input
                label="Qty Bought"
                value={row.quantity_bought}
                onChangeText={v => updateRow(row.id, 'quantity_bought', v)}
                keyboardType="numeric"
                placeholder="0.0"
                style={{ flex: 1, marginRight: spacing.sm }}
              />
              <Input
                label="Cost/Unit (ETB)"
                value={row.cost_per_unit_at_time}
                onChangeText={v => updateRow(row.id, 'cost_per_unit_at_time', v)}
                keyboardType="numeric"
                placeholder="0.00"
                style={{ flex: 1 }}
              />
            </View>
          </View>
        ))}

        <Button label="+ Add Another Ingredient" onPress={addRow} variant="ghost" style={{ marginBottom: spacing.lg }} />

        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total Cost</Text>
          <Text style={styles.totalAmount}>ETB {totalCost.toFixed(2)}</Text>
        </View>

        <Button label="Record Purchase" onPress={handleSubmit} loading={submitting} size="lg" icon="📦" style={{ marginBottom: spacing.xxxl }} />

        {/* Recent purchases */}
        {recentPurchases.length > 0 && (
          <>
            <Text style={[typography.label, { marginBottom: spacing.sm }]}>RECENT PURCHASES</Text>
            {recentPurchases.map(p => (
              <View key={p.id} style={styles.recentCard}>
                <Text style={styles.recentDate}>{new Date(p.purchase_date).toLocaleDateString()}</Text>
                <Text style={styles.recentSupplier}>{p.supplier_name || 'No supplier'}</Text>
                <Text style={[styles.totalAmount, { fontSize: 15 }]}>ETB {parseFloat(p.total_cost || 0).toFixed(2)}</Text>
              </View>
            ))}
          </>
        )}
      </ScrollView>

      {/* Ingredient picker bottom sheet */}
      {pickerRowId !== null && (
        <View style={styles.pickerSheet}>
          <View style={styles.pickerSheetHeader}>
            <Text style={styles.pickerSheetTitle}>Choose Ingredient</Text>
            <TouchableOpacity onPress={() => setPickerRowId(null)}>
              <Text style={{ color: colors.primary, fontWeight: '700' }}>Done</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={ingredients}
            keyExtractor={i => String(i.id)}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.pickerItem}
                onPress={() => {
                  updateRow(pickerRowId, 'ingredient_id', item.id);
                  updateRow(pickerRowId, 'ingredient_name', `${item.name} (${item.unit_of_measure})`);
                  setPickerRowId(null);
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.pickerItemName}>{item.name}</Text>
                  <Text style={styles.pickerItemSub}>
                    Current: {parseFloat(item.current_quantity).toFixed(2)} {item.unit_of_measure}
                    {item.is_low_stock ? '  ⚠️ Low' : ''}
                  </Text>
                </View>
                <Text style={{ fontSize: 12, color: colors.muted }}>{item.unit_of_measure}</Text>
              </TouchableOpacity>
            )}
            style={{ maxHeight: 350 }}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { backgroundColor: colors.dark, paddingHorizontal: spacing.xl, paddingBottom: spacing.lg },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#fff' },
  headerSub: { fontSize: 12, color: colors.primaryLight, marginTop: 2 },
  content: { padding: spacing.xl },
  rowCard: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.md, ...shadow.sm },
  rowHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  rowNum: { fontSize: 12, fontWeight: '700', color: colors.muted },
  picker: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.md,
    paddingHorizontal: spacing.md, paddingVertical: spacing.md, marginBottom: spacing.md,
    backgroundColor: colors.surface,
  },
  pickerText: { fontSize: 14, color: colors.text, flex: 1 },
  rowInputs: { flexDirection: 'row' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg, padding: spacing.lg, backgroundColor: colors.surface, borderRadius: radius.lg, ...shadow.sm },
  totalLabel: { fontSize: 14, fontWeight: '600', color: colors.text },
  totalAmount: { fontSize: 20, fontWeight: '800', color: colors.primary },
  recentCard: { backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', ...shadow.sm },
  recentDate: { fontSize: 12, color: colors.muted },
  recentSupplier: { fontSize: 13, fontWeight: '600', color: colors.text, flex: 1, marginLeft: spacing.sm },
  // Picker sheet
  pickerSheet: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, ...shadow.lg },
  pickerSheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.xl, borderBottomWidth: 1, borderBottomColor: colors.border },
  pickerSheetTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  pickerItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.xl, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  pickerItemName: { fontSize: 14, fontWeight: '600', color: colors.text },
  pickerItemSub: { fontSize: 12, color: colors.muted, marginTop: 2 },
});
