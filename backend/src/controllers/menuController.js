const pool = require('../database/db');

// ─── Recipe Items ──────────────────────────────────────────────────────────────

async function getAllItems(req, res) {
  try {
    // Fetch items
    const [items] = await pool.query(
      'SELECT * FROM recipe_items ORDER BY category, name'
    );

    // For each item, fetch its ingredients and variations
    for (const item of items) {
      const [ingredients] = await pool.query(
        `SELECT ri.ingredient_id, ri.quantity_required, i.name AS ingredient_name, i.unit_of_measure
         FROM recipe_ingredients ri
         JOIN ingredients i ON i.id = ri.ingredient_id
         WHERE ri.recipe_item_id = ?`,
        [item.id]
      );
      const [variations] = await pool.query(
        'SELECT * FROM variations WHERE parent_recipe_id = ?',
        [item.id]
      );
      item.ingredients = ingredients;
      item.variations = variations;
    }

    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function getItemById(req, res) {
  try {
    const [items] = await pool.query('SELECT * FROM recipe_items WHERE id = ?', [req.params.id]);
    if (!items.length) return res.status(404).json({ error: 'Menu item not found.' });

    const [ingredients] = await pool.query(
      `SELECT ri.*, i.name AS ingredient_name, i.unit_of_measure
       FROM recipe_ingredients ri
       JOIN ingredients i ON i.id = ri.ingredient_id
       WHERE ri.recipe_item_id = ?`,
      [req.params.id]
    );

    const [variations] = await pool.query(
      'SELECT * FROM variations WHERE parent_recipe_id = ?',
      [req.params.id]
    );

    // Load variation ingredients
    for (const v of variations) {
      const [vi] = await pool.query(
        `SELECT vi.*, i.name AS ingredient_name
         FROM variation_ingredients vi
         JOIN ingredients i ON i.id = vi.ingredient_id
         WHERE vi.variation_id = ?`,
        [v.id]
      );
      v.variation_ingredients = vi;
    }

    res.json({ ...items[0], ingredients, variations });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function createItem(req, res) {
  const { name, selling_price, category, description, ingredients = [] } = req.body;
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [result] = await conn.query(
      'INSERT INTO recipe_items (name, selling_price, category, description) VALUES (?, ?, ?, ?)',
      [name, selling_price, category, description]
    );
    const itemId = result.insertId;

    for (const ing of ingredients) {
      await conn.query(
        'INSERT INTO recipe_ingredients (recipe_item_id, ingredient_id, quantity_required) VALUES (?, ?, ?)',
        [itemId, ing.ingredient_id, ing.quantity_required]
      );
    }

    await conn.commit();
    const [rows] = await pool.query('SELECT * FROM recipe_items WHERE id = ?', [itemId]);
    res.status(201).json(rows[0]);
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
}

async function updateItem(req, res) {
  const { name, selling_price, category, description, is_available, ingredients } = req.body;
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [result] = await conn.query(
      'UPDATE recipe_items SET name=?, selling_price=?, category=?, description=?, is_available=? WHERE id=?',
      [name, selling_price, category, description, is_available ? 1 : 0, req.params.id]
    );
    if (result.affectedRows === 0) {
      await conn.rollback();
      return res.status(404).json({ error: 'Menu item not found.' });
    }

    if (ingredients) {
      await conn.query('DELETE FROM recipe_ingredients WHERE recipe_item_id = ?', [req.params.id]);
      for (const ing of ingredients) {
        await conn.query(
          'INSERT INTO recipe_ingredients (recipe_item_id, ingredient_id, quantity_required) VALUES (?, ?, ?)',
          [req.params.id, ing.ingredient_id, ing.quantity_required]
        );
      }
    }

    await conn.commit();
    const [rows] = await pool.query('SELECT * FROM recipe_items WHERE id = ?', [req.params.id]);
    res.json(rows[0]);
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
}

async function removeItem(req, res) {
  try {
    const [result] = await pool.query('DELETE FROM recipe_items WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Menu item not found.' });
    res.json({ message: 'Menu item deleted.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// ─── Variations ────────────────────────────────────────────────────────────────

async function createVariation(req, res) {
  const { name, parent_recipe_id, price_adjustment, variation_ingredients = [] } = req.body;
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [result] = await conn.query(
      'INSERT INTO variations (name, parent_recipe_id, price_adjustment) VALUES (?, ?, ?)',
      [name, parent_recipe_id, price_adjustment || 0]
    );
    const varId = result.insertId;

    for (const vi of variation_ingredients) {
      await conn.query(
        'INSERT INTO variation_ingredients (variation_id, ingredient_id, quantity_required, override_type) VALUES (?, ?, ?, ?)',
        [varId, vi.ingredient_id, vi.quantity_required, vi.override_type || 'override']
      );
    }

    await conn.commit();
    const [rows] = await pool.query('SELECT * FROM variations WHERE id = ?', [varId]);
    res.status(201).json(rows[0]);
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
}

async function updateVariation(req, res) {
  const { name, price_adjustment, variation_ingredients } = req.body;
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [result] = await conn.query(
      'UPDATE variations SET name=?, price_adjustment=? WHERE id=?',
      [name, price_adjustment, req.params.id]
    );
    if (result.affectedRows === 0) {
      await conn.rollback();
      return res.status(404).json({ error: 'Variation not found.' });
    }

    if (variation_ingredients) {
      await conn.query('DELETE FROM variation_ingredients WHERE variation_id = ?', [req.params.id]);
      for (const vi of variation_ingredients) {
        await conn.query(
          'INSERT INTO variation_ingredients (variation_id, ingredient_id, quantity_required, override_type) VALUES (?, ?, ?, ?)',
          [req.params.id, vi.ingredient_id, vi.quantity_required, vi.override_type || 'override']
        );
      }
    }

    await conn.commit();
    const [rows] = await pool.query('SELECT * FROM variations WHERE id = ?', [req.params.id]);
    res.json(rows[0]);
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
}

async function removeVariation(req, res) {
  try {
    const [result] = await pool.query('DELETE FROM variations WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Variation not found.' });
    res.json({ message: 'Variation deleted.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = {
  getAllItems, getItemById, createItem, updateItem, removeItem,
  createVariation, updateVariation, removeVariation,
};
