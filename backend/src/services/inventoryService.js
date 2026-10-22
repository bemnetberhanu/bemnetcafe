const pool = require('../database/db');

async function getIngredientRequirements(conn, recipeItemId, variationId, quantity) {
  const [baseRows] = await conn.query(
    `SELECT ri.ingredient_id, ri.quantity_required, i.name, i.unit_of_measure
     FROM recipe_ingredients ri
     JOIN ingredients i ON i.id = ri.ingredient_id
     WHERE ri.recipe_item_id = ?`,
    [recipeItemId]
  );

  const requirements = {};
  for (const row of baseRows) {
    requirements[row.ingredient_id] = {
      quantity: parseFloat(row.quantity_required) * quantity,
      name: row.name,
      unit: row.unit_of_measure,
    };
  }

  if (variationId) {
    const [varRows] = await conn.query(
      `SELECT vi.ingredient_id, vi.quantity_required, vi.override_type, i.name, i.unit_of_measure
       FROM variation_ingredients vi
       JOIN ingredients i ON i.id = vi.ingredient_id
       WHERE vi.variation_id = ?`,
      [variationId]
    );

    for (const row of varRows) {
      const baseQty = requirements[row.ingredient_id]?.quantity || 0;
      const varQty = parseFloat(row.quantity_required) * quantity;

      if (row.override_type === 'override') {
        requirements[row.ingredient_id] = { quantity: varQty, name: row.name, unit: row.unit_of_measure };
      } else if (row.override_type === 'add') {
        requirements[row.ingredient_id] = {
          quantity: baseQty + varQty,
          name: row.name,
          unit: row.unit_of_measure,
        };
      } else if (row.override_type === 'remove') {
        delete requirements[row.ingredient_id];
      }
    }
  }

  return requirements;
}

async function checkStock(conn, orderItems) {
  const needed = {};

  for (const item of orderItems) {
    const reqs = await getIngredientRequirements(conn, item.recipe_item_id, item.variation_id, item.quantity);
    for (const [ingrId, req] of Object.entries(reqs)) {
      if (!needed[ingrId]) {
        needed[ingrId] = { quantity: 0, name: req.name, unit: req.unit };
      }
      needed[ingrId].quantity += req.quantity;
    }
  }

  const shortages = [];
  for (const [ingrId, req] of Object.entries(needed)) {
    const [rows] = await conn.query('SELECT current_quantity FROM ingredients WHERE id = ?', [ingrId]);
    const available = parseFloat(rows[0]?.current_quantity || 0);
    if (available < req.quantity) {
      shortages.push({
        ingredient_id: parseInt(ingrId),
        ingredient_name: req.name,
        unit: req.unit,
        required: req.quantity,
        available,
      });
    }
  }

  return shortages.length === 0
    ? { ok: true, needed }
    : { ok: false, shortages, needed };
}

async function deductInventory(conn, orderItems) {
  const needed = {};

  for (const item of orderItems) {
    const reqs = await getIngredientRequirements(conn, item.recipe_item_id, item.variation_id, item.quantity);
    for (const [ingrId, req] of Object.entries(reqs)) {
      if (!needed[ingrId]) needed[ingrId] = 0;
      needed[ingrId] += req.quantity;
    }
  }

  for (const [ingrId, quantity] of Object.entries(needed)) {
    await conn.query(
      'UPDATE ingredients SET current_quantity = current_quantity - ?, updated_at = NOW() WHERE id = ?',
      [quantity, ingrId]
    );
  }
}

async function addInventory(conn, purchaseItems) {
  for (const item of purchaseItems) {
    await conn.query(
      `UPDATE ingredients
       SET current_quantity = current_quantity + ?,
           cost_per_unit = ?,
           updated_at = NOW()
       WHERE id = ?`,
      [item.quantity_bought, item.cost_per_unit_at_time, item.ingredient_id]
    );
  }
}

async function getLowStockIngredients() {
  const [rows] = await pool.query(
    `SELECT id, name, unit_of_measure, current_quantity, reorder_level, reorder_quantity, cost_per_unit
     FROM ingredients
     WHERE current_quantity <= reorder_level
     ORDER BY (current_quantity - reorder_level) ASC`
  );
  return rows;
}

module.exports = {
  getIngredientRequirements,
  checkStock,
  deductInventory,
  addInventory,
  getLowStockIngredients,
};
