import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Modal, ScrollView, Alert, ActivityIndicator, TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ingredientsApi } from '../../src/api/client';
import { colors, spacing, radius, shadow, typography } from '../../src/theme';
import Button from '../../src/components/Button';
import Input from '../../src/components/Input';
import Badge from '../../src/components/Badge';

const UNITS = ['kg', 'g', 'liters', 'ml', 'pieces', 'cups', 'tbsp', 'tsp', 'bunches', 'cans'];

export default function IngredientsScreen() {
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [unit, setUnit] = useState('kg');
  const [currentQty, setCurrentQty] = useState('');
  const [reorderLevel, setReorderLevel] = useState('');
  const [reorderQty, setReorderQty] = useState('');
  const [costPerUnit, setCostPerUnit] = useState('');

  const load = () => {
    ingredientsApi.getAll()
      .then(res => { setItems(res.data); setFiltered(res.data); })
      .catch(() => Alert.alert('Error', 'Failed to load ingredients.'))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (!search.trim()) { setFiltered(items); return; }
    setFiltered(items.filter(i => i.name.toLowerCase().includes(search.toLowerCase())));
  }, [search, items]);

  function openCreate() {
    setEditing(null);
    setName(''); setUnit('kg'); setCurrentQty('0'); setReorderLevel('');
    setReorderQty(''); setCostPerUnit('');
    setModalVisible(true);
  }

  function openEdit(item) {
    setEditing(item);
    setName(item.name); setUnit(item.unit_of_measure);
    setCurrentQty(String(item.current_quantity));
    setReorderLevel(String(item.reorder_level));
    setReorderQty(String(item.reorder_quantity));
    setCostPerUnit(String(item.cost_per_unit));
    setModalVisible(true);
  }

  async function handleSave() {
    if (!name.trim() || !reorderLevel || !costPerUnit) {
      Alert.alert('Validation', 'Name, reorder level and cost are required.');
      return;
    }
    setSaving(true);
    try {
      const data = {
        name: name.trim(), unit_of_measure: unit,
        current_quantity: parseFloat(currentQty) || 0,
        reorder_level: parseFloat(reorderLevel),
        reorder_quantity: parseFloat(reorderQty) || 0,
        cost_per_unit: parseFloat(costPerUnit),
      };
      if (editing) await ingredientsApi.update(editing.id, data);
      else await ingredientsApi.create(data);
      setModalVisible(false);
      load();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.error || 'Save failed.');
    } finally { setSaving(false); }
  }

  async function handleDelete(item) {
    Alert.alert('Delete Ingredient', `Delete "${item.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try { await ingredientsApi.remove(item.id); load(); }
        catch (err) { Alert.alert('Error', err.response?.data?.error || 'Cannot delete — may be used in a recipe.'); }
      }},
    ]);
  }

  const renderItem = ({ item }) => (
    <View style={[styles.card, item.is_low_stock && styles.cardLow]}>
      <View style={styles.cardRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.itemName}>{item.name}</Text>
          <Text style={styles.itemUnit}>{item.unit_of_measure} · ETB {parseFloat(item.cost_per_unit).toFixed(2)}/unit</Text>
        </View>
        <View style={{ alignItems: 'flex-end', gap: spacing.xs }}>
          <Text style={[styles.qty, item.is_low_stock && { color: colors.danger }]}>
            {parseFloat(item.current_quantity).toFixed(2)}
          </Text>
          <Badge label={item.is_low_stock ? '⚠️ Low' : '✅ OK'} type={item.is_low_stock ? 'danger' : 'success'} />
        </View>
      </View>
      <View style={styles.reorderRow}>
        <Text style={styles.reorderText}>Reorder at: {parseFloat(item.reorder_level).toFixed(2)} · Order: {parseFloat(item.reorder_quantity).toFixed(2)}</Text>
      </View>
      <View style={styles.actions}>
        <TouchableOpacity onPress={() => openEdit(item)} style={styles.editBtn}>
          <Text style={styles.editBtnText}>✏️ Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => handleDelete(item)} style={[styles.editBtn, styles.deleteBtn]}>
          <Text style={[styles.editBtnText, { color: colors.danger }]}>🗑️</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <Text style={styles.headerTitle}>🥩  Ingredients</Text>
        <Button label="+ Add" onPress={openCreate} size="sm" />
      </View>

      {/* Search bar */}
      <View style={styles.searchBar}>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search ingredients…"
          placeholderTextColor={colors.muted}
          style={styles.searchInput}
        />
      </View>

      {loading ? (
        <View style={styles.centered}><ActivityIndicator color={colors.primary} /></View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={i => String(i.id)}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
        />
      )}

      {/* Create/Edit modal */}
      <Modal visible={modalVisible} animationType="slide">
        <View style={[styles.modalContainer, { paddingTop: insets.top }]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{editing ? 'Edit Ingredient' : 'New Ingredient'}</Text>
            <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.modalContent}>
            <Input label="Name" value={name} onChangeText={setName} placeholder="e.g. Berbere Spice" />

            <Text style={[typography.label, { marginBottom: spacing.sm }]}>UNIT OF MEASURE</Text>
            <View style={styles.unitGrid}>
              {UNITS.map(u => (
                <TouchableOpacity key={u} onPress={() => setUnit(u)} style={[styles.unitChip, unit === u && styles.unitChipActive]}>
                  <Text style={[styles.unitChipText, unit === u && styles.unitChipTextActive]}>{u}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.twoCol}>
              <Input label="Current Qty" value={currentQty} onChangeText={setCurrentQty} keyboardType="numeric" placeholder="0" style={{ flex: 1, marginRight: spacing.sm }} />
              <Input label="Cost/Unit (ETB)" value={costPerUnit} onChangeText={setCostPerUnit} keyboardType="numeric" placeholder="0.00" style={{ flex: 1 }} />
            </View>
            <View style={styles.twoCol}>
              <Input label="Reorder Level" value={reorderLevel} onChangeText={setReorderLevel} keyboardType="numeric" placeholder="min qty" style={{ flex: 1, marginRight: spacing.sm }} />
              <Input label="Reorder Qty" value={reorderQty} onChangeText={setReorderQty} keyboardType="numeric" placeholder="order qty" style={{ flex: 1 }} />
            </View>

            <Button label={editing ? 'Save Changes' : 'Create Ingredient'} onPress={handleSave} loading={saving} size="lg" style={{ marginTop: spacing.xl }} />
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
  searchBar: { paddingHorizontal: spacing.xl, paddingVertical: spacing.md, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  searchInput: { backgroundColor: colors.bg, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, fontSize: 14, color: colors.text },
  list: { padding: spacing.md },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.sm, ...shadow.sm },
  cardLow: { borderLeftWidth: 3, borderLeftColor: colors.danger },
  cardRow: { flexDirection: 'row', alignItems: 'flex-start' },
  itemName: { fontSize: 14, fontWeight: '700', color: colors.text },
  itemUnit: { fontSize: 12, color: colors.muted, marginTop: 2 },
  qty: { fontSize: 18, fontWeight: '800', color: colors.text },
  reorderRow: { marginTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.sm },
  reorderText: { fontSize: 11, color: colors.muted },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  editBtn: { flex: 1, backgroundColor: colors.bg, borderRadius: radius.sm, padding: spacing.sm, alignItems: 'center' },
  deleteBtn: { flex: 0, paddingHorizontal: spacing.lg, backgroundColor: colors.dangerLight },
  editBtnText: { fontSize: 12, fontWeight: '600', color: colors.text },
  // Modal
  modalContainer: { flex: 1, backgroundColor: colors.surface },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.xl, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.dark },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },
  closeBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  closeBtnText: { color: '#fff', fontSize: 14 },
  modalContent: { padding: spacing.xl },
  twoCol: { flexDirection: 'row' },
  unitGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg },
  unitChip: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.full, backgroundColor: colors.border },
  unitChipActive: { backgroundColor: colors.primary },
  unitChipText: { fontSize: 12, fontWeight: '500', color: colors.text },
  unitChipTextActive: { color: '#fff', fontWeight: '700' },
});
