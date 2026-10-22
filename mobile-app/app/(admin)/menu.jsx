import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Modal, ScrollView, Alert, ActivityIndicator, TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { menuApi, ingredientsApi } from '../../src/api/client';
import { colors, spacing, radius, shadow, typography } from '../../src/theme';
import Button from '../../src/components/Button';
import Input from '../../src/components/Input';
import Badge from '../../src/components/Badge';

const CATEGORIES = ['Wot', 'Tibs', 'Kitfo', 'Salad', 'Sides', 'Coffee', 'Drinks', 'Other'];

// ─── Ingredient row inside the recipe editor ──────────────────────────────────
function RecipeRow({ row, index, onPickIngredient, onChangeQty, onRemove }) {
  return (
    <View style={styles.recipeRow}>
      <TouchableOpacity
        style={styles.recipeIngredientPicker}
        onPress={() => onPickIngredient(index)}
      >
        <Text
          style={[styles.recipeIngredientText, !row.ingredient_id && { color: colors.muted }]}
          numberOfLines={1}
        >
          {row.ingredient_name || 'Tap to choose ingredient…'}
        </Text>
        {row.unit && <Text style={styles.recipeUnitBadge}>{row.unit}</Text>}
        <Text style={{ fontSize: 14, color: colors.muted }}>▾</Text>
      </TouchableOpacity>

      <TextInput
        style={styles.recipeQtyInput}
        value={row.quantity_required}
        onChangeText={v => onChangeQty(index, v)}
        placeholder="Qty"
        placeholderTextColor={colors.muted}
        keyboardType="numeric"
      />

      <TouchableOpacity onPress={() => onRemove(index)} style={styles.recipeRemoveBtn}>
        <Text style={styles.recipeRemoveText}>✕</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Main Menu Screen ─────────────────────────────────────────────────────────
export default function MenuScreen() {
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState([]);
  const [ingredients, setIngredients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);

  // Item form state
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');

  // Recipe ingredient rows: [{ ingredient_id, ingredient_name, unit, quantity_required }]
  const [recipeRows, setRecipeRows] = useState([]);

  // Ingredient picker bottom-sheet state
  const [pickerRowIndex, setPickerRowIndex] = useState(null);
  const [pickerSearch, setPickerSearch] = useState('');

  const filteredIngredients = pickerSearch.trim()
    ? ingredients.filter(i => i.name.toLowerCase().includes(pickerSearch.toLowerCase()))
    : ingredients;

  const load = () => {
    Promise.all([menuApi.getAll(), ingredientsApi.getAll()])
      .then(([mRes, iRes]) => { setItems(mRes.data); setIngredients(iRes.data); })
      .catch(() => Alert.alert('Error', 'Failed to load menu.'))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  function openCreate() {
    setEditing(null);
    setName(''); setPrice(''); setCategory(CATEGORIES[0]); setDescription('');
    setRecipeRows([]);
    setModalVisible(true);
  }

  function openEdit(item) {
    setEditing(item);
    setName(item.name);
    setPrice(String(item.selling_price));
    setCategory(item.category);
    setDescription(item.description || '');
    // Populate existing recipe
    const existing = (item.recipe_ingredients || item.ingredients || []).map(ri => ({
      ingredient_id: ri.ingredient_id,
      ingredient_name: ri.ingredient_name || ri.name || '',
      unit: ri.unit_of_measure || '',
      quantity_required: String(ri.quantity_required),
    }));
    setRecipeRows(existing);
    setModalVisible(true);
  }

  // ── Recipe row helpers ──────────────────────────────────────────────────────
  function addRecipeRow() {
    setRecipeRows(prev => [...prev, { ingredient_id: null, ingredient_name: '', unit: '', quantity_required: '' }]);
  }

  function removeRecipeRow(index) {
    setRecipeRows(prev => prev.filter((_, i) => i !== index));
  }

  function updateRecipeQty(index, value) {
    setRecipeRows(prev => prev.map((r, i) => i === index ? { ...r, quantity_required: value } : r));
  }

  function openIngredientPicker(index) {
    setPickerSearch('');
    setPickerRowIndex(index);
  }

  function selectIngredient(ingredient) {
    setRecipeRows(prev => prev.map((r, i) =>
      i === pickerRowIndex
        ? { ...r, ingredient_id: ingredient.id, ingredient_name: ingredient.name, unit: ingredient.unit_of_measure }
        : r
    ));
    setPickerRowIndex(null);
  }

  // ── Save ───────────────────────────────────────────────────────────────────
  async function handleSave() {
    if (!name.trim() || !price) {
      Alert.alert('Validation', 'Name and price are required.');
      return;
    }
    setSaving(true);
    try {
      const validIngredients = recipeRows
        .filter(r => r.ingredient_id && r.quantity_required)
        .map(r => ({ ingredient_id: r.ingredient_id, quantity_required: parseFloat(r.quantity_required) }));

      const data = {
        name: name.trim(),
        selling_price: parseFloat(price),
        category,
        description,
        ingredients: validIngredients,
      };
      if (editing) await menuApi.update(editing.id, data);
      else await menuApi.create(data);
      setModalVisible(false);
      load();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.error || 'Save failed.');
    } finally { setSaving(false); }
  }

  async function toggleAvailable(item) {
    try {
      await menuApi.update(item.id, { ...item, is_available: item.is_available ? 0 : 1 });
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, is_available: !i.is_available } : i));
    } catch { Alert.alert('Error', 'Failed to update availability.'); }
  }

  async function handleDelete(item) {
    Alert.alert('Delete Menu Item', `Delete "${item.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          try { await menuApi.remove(item.id); load(); }
          catch { Alert.alert('Error', 'Failed to delete.'); }
        }
      },
    ]);
  }

  // ── Item card ──────────────────────────────────────────────────────────────
  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.itemName}>{item.name}</Text>
          <Text style={styles.itemCategory}>{item.category}</Text>
        </View>
        <Text style={styles.itemPrice}>ETB {parseFloat(item.selling_price).toFixed(2)}</Text>
        <Badge
          label={item.is_available ? 'Available' : 'Unavailable'}
          type={item.is_available ? 'success' : 'muted'}
          style={{ marginLeft: spacing.sm }}
        />
      </View>

      {item.description ? <Text style={styles.itemDesc} numberOfLines={2}>{item.description}</Text> : null}

      {/* Recipe ingredients */}
      {(item.recipe_ingredients || item.ingredients)?.length > 0 && (
        <View style={styles.ingredientList}>
          {(item.recipe_ingredients || item.ingredients).slice(0, 4).map((ri, i) => (
            <View key={i} style={styles.ingredientTag}>
              <Text style={styles.ingredientTagText}>
                {ri.ingredient_name || ri.name} {parseFloat(ri.quantity_required).toFixed(2)} {ri.unit_of_measure || ''}
              </Text>
            </View>
          ))}
          {(item.recipe_ingredients || item.ingredients).length > 4 && (
            <View style={styles.ingredientTag}>
              <Text style={styles.ingredientTagText}>
                +{(item.recipe_ingredients || item.ingredients).length - 4} more
              </Text>
            </View>
          )}
        </View>
      )}

      <View style={styles.cardActions}>
        <TouchableOpacity onPress={() => openEdit(item)} style={styles.actionBtn}>
          <Text style={styles.actionBtnText}>✏️ Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => toggleAvailable(item)} style={styles.actionBtn}>
          <Text style={styles.actionBtnText}>{item.is_available ? '🔴 Disable' : '🟢 Enable'}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => handleDelete(item)} style={[styles.actionBtn, styles.actionDanger]}>
          <Text style={[styles.actionBtnText, { color: colors.danger }]}>🗑️ Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <Text style={styles.headerTitle}>🍽️  Menu & Recipes</Text>
        <Button label="+ Add Item" onPress={openCreate} size="sm" />
      </View>

      {loading ? (
        <View style={styles.centered}><ActivityIndicator color={colors.primary} size="large" /></View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={i => String(i.id)}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={{ fontSize: 36 }}>🍽️</Text>
              <Text style={[typography.body, { color: colors.muted, marginTop: spacing.md }]}>
                No menu items yet
              </Text>
            </View>
          }
        />
      )}

      {/* ── Create/Edit Modal ── */}
      <Modal visible={modalVisible} animationType="slide">
        <View style={[styles.modalContainer, { paddingTop: insets.top }]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{editing ? 'Edit Menu Item' : 'New Menu Item'}</Text>
            <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
            {/* ── Basic info ── */}
            <Input label="Name" value={name} onChangeText={setName} placeholder="e.g. Doro Wot" />
            <Input
              label="Price (ETB)" value={price} onChangeText={setPrice}
              placeholder="0.00" keyboardType="numeric"
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
              label="Description (optional)" value={description} onChangeText={setDescription}
              placeholder="Brief description…" multiline style={{ marginTop: spacing.md }}
            />

            {/* ── Recipe Ingredients ── */}
            <View style={styles.recipeSectionHeader}>
              <Text style={[typography.label]}>RECIPE INGREDIENTS</Text>
              <TouchableOpacity onPress={addRecipeRow} style={styles.addRowBtn}>
                <Text style={styles.addRowBtnText}>+ Add Row</Text>
              </TouchableOpacity>
            </View>

            {recipeRows.length === 0 ? (
              <TouchableOpacity onPress={addRecipeRow} style={styles.recipeEmpty}>
                <Text style={{ fontSize: 24, marginBottom: spacing.sm }}>🧪</Text>
                <Text style={styles.recipeEmptyText}>
                  No ingredients yet.{'\n'}Tap "+ Add Row" to build the recipe.
                </Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.recipeList}>
                <View style={styles.recipeListHeader}>
                  <Text style={[styles.recipeHeaderLabel, { flex: 1 }]}>Ingredient</Text>
                  <Text style={[styles.recipeHeaderLabel, { width: 60, textAlign: 'center' }]}>Qty</Text>
                  <View style={{ width: 32 }} />
                </View>
                {recipeRows.map((row, idx) => (
                  <RecipeRow
                    key={idx}
                    row={row}
                    index={idx}
                    onPickIngredient={openIngredientPicker}
                    onChangeQty={updateRecipeQty}
                    onRemove={removeRecipeRow}
                  />
                ))}
              </View>
            )}

            <Button
              label={saving ? 'Saving…' : editing ? 'Save Changes' : 'Create Item'}
              onPress={handleSave}
              loading={saving}
              size="lg"
              style={{ marginTop: spacing.xl, marginBottom: spacing.lg }}
            />
          </ScrollView>
        </View>

        {/* ── Ingredient Picker Bottom Sheet ── */}
        {pickerRowIndex !== null && (
          <View style={styles.pickerOverlay}>
            <TouchableOpacity
              style={{ flex: 1 }}
              activeOpacity={1}
              onPress={() => setPickerRowIndex(null)}
            />
            <View style={[styles.pickerSheet, { paddingBottom: insets.bottom + spacing.xl }]}>
              <View style={styles.pickerSheetHandle} />
              <View style={styles.pickerSheetHeader}>
                <Text style={styles.pickerSheetTitle}>Choose Ingredient</Text>
                <TouchableOpacity onPress={() => setPickerRowIndex(null)}>
                  <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 14 }}>Done</Text>
                </TouchableOpacity>
              </View>

              {/* Search */}
              <View style={styles.pickerSearch}>
                <TextInput
                  value={pickerSearch}
                  onChangeText={setPickerSearch}
                  placeholder="Search ingredients…"
                  placeholderTextColor={colors.muted}
                  style={styles.pickerSearchInput}
                  autoFocus
                />
              </View>

              <FlatList
                data={filteredIngredients}
                keyExtractor={i => String(i.id)}
                style={{ maxHeight: 320 }}
                keyboardShouldPersistTaps="handled"
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.pickerItem}
                    onPress={() => selectIngredient(item)}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.pickerItemName}>{item.name}</Text>
                      <Text style={styles.pickerItemSub}>
                        {item.unit_of_measure}
                        {item.is_low_stock ? '  ⚠️ Low stock' : ''}
                      </Text>
                    </View>
                    <Text style={styles.pickerItemUnit}>{item.unit_of_measure}</Text>
                  </TouchableOpacity>
                )}
                ListEmptyComponent={
                  <Text style={styles.pickerEmpty}>No ingredients found.</Text>
                }
              />
            </View>
          </View>
        )}
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
  list: { padding: spacing.md },
  empty: { alignItems: 'center', justifyContent: 'center', padding: spacing.xxxl * 2 },

  // Item card
  card: {
    backgroundColor: colors.surface, borderRadius: radius.xl,
    padding: spacing.lg, marginBottom: spacing.md, ...shadow.sm,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  itemName: { fontSize: 16, fontWeight: '700', color: colors.text },
  itemCategory: { fontSize: 12, color: colors.muted, marginTop: 2 },
  itemPrice: { fontSize: 16, fontWeight: '800', color: colors.primary },
  itemDesc: { fontSize: 12, color: colors.textSecondary, marginTop: spacing.sm },
  ingredientList: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.sm },
  ingredientTag: {
    backgroundColor: colors.bg, borderRadius: radius.sm,
    paddingHorizontal: spacing.sm, paddingVertical: 2,
    borderWidth: 1, borderColor: colors.border,
  },
  ingredientTagText: { fontSize: 10, color: colors.textSecondary },
  cardActions: {
    flexDirection: 'row', gap: spacing.sm,
    marginTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.md,
  },
  actionBtn: {
    flex: 1, backgroundColor: colors.bg,
    borderRadius: radius.sm, padding: spacing.sm, alignItems: 'center',
  },
  actionDanger: { backgroundColor: colors.dangerLight },
  actionBtnText: { fontSize: 12, fontWeight: '600', color: colors.text },

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

  // Category chips
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  catChip: {
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderRadius: radius.full, backgroundColor: colors.border,
  },
  catChipActive: { backgroundColor: colors.primary },
  catChipText: { fontSize: 12, fontWeight: '500', color: colors.text },
  catChipTextActive: { color: '#fff', fontWeight: '700' },

  // Recipe section
  recipeSectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginTop: spacing.xl, marginBottom: spacing.sm,
  },
  addRowBtn: {
    backgroundColor: colors.primary + '18', borderRadius: radius.full,
    paddingHorizontal: spacing.md, paddingVertical: spacing.xs,
    borderWidth: 1, borderColor: colors.primary + '40',
  },
  addRowBtnText: { fontSize: 12, fontWeight: '700', color: colors.primary },
  recipeEmpty: {
    backgroundColor: colors.bg, borderRadius: radius.lg,
    padding: spacing.xl, alignItems: 'center',
    borderWidth: 1, borderColor: colors.border, borderStyle: 'dashed',
  },
  recipeEmptyText: {
    fontSize: 13, color: colors.muted, textAlign: 'center', lineHeight: 20,
  },
  recipeList: {
    backgroundColor: colors.bg, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border, overflow: 'hidden',
  },
  recipeListHeader: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    backgroundColor: colors.border + '80', gap: spacing.sm,
  },
  recipeHeaderLabel: { fontSize: 10, fontWeight: '700', color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.5 },
  recipeRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderTopWidth: 1, borderTopColor: colors.border,
  },
  recipeIngredientPicker: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    backgroundColor: colors.surface, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: spacing.sm, paddingVertical: spacing.sm,
  },
  recipeIngredientText: { flex: 1, fontSize: 13, color: colors.text },
  recipeUnitBadge: {
    fontSize: 10, color: colors.muted,
    backgroundColor: colors.bg, borderRadius: radius.sm,
    paddingHorizontal: spacing.xs, paddingVertical: 1,
  },
  recipeQtyInput: {
    width: 60, backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.md,
    paddingHorizontal: spacing.sm, paddingVertical: spacing.sm,
    fontSize: 13, color: colors.text, textAlign: 'center',
  },
  recipeRemoveBtn: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: colors.dangerLight, alignItems: 'center', justifyContent: 'center',
  },
  recipeRemoveText: { color: colors.danger, fontSize: 12, fontWeight: '700' },

  // Ingredient picker bottom sheet
  pickerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  pickerSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    ...shadow.lg,
  },
  pickerSheetHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: colors.border, alignSelf: 'center', marginVertical: spacing.md,
  },
  pickerSheetHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: spacing.xl, paddingBottom: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  pickerSheetTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  pickerSearch: {
    paddingHorizontal: spacing.xl, paddingVertical: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  pickerSearchInput: {
    backgroundColor: colors.bg, borderRadius: radius.md,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    fontSize: 14, color: colors.text,
  },
  pickerItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.xl, paddingVertical: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  pickerItemName: { fontSize: 14, fontWeight: '600', color: colors.text },
  pickerItemSub: { fontSize: 12, color: colors.muted, marginTop: 2 },
  pickerItemUnit: {
    fontSize: 11, color: colors.muted,
    backgroundColor: colors.bg, borderRadius: radius.sm,
    paddingHorizontal: spacing.sm, paddingVertical: 2,
    borderWidth: 1, borderColor: colors.border,
  },
  pickerEmpty: {
    fontSize: 13, color: colors.muted,
    textAlign: 'center', padding: spacing.xl,
  },
});
