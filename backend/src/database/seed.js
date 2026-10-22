const pool = require('./db');
const bcrypt = require('bcryptjs');

async function seed() {
  const isProduction = process.env.NODE_ENV === 'production';
  const adminPassword = process.env.INITIAL_ADMIN_PASSWORD || (isProduction ? '' : 'Admin@Habesha1');
  const managerPassword = process.env.INITIAL_MANAGER_PASSWORD || (isProduction ? '' : 'Manager@Habesha1');

  if (isProduction
    && (adminPassword.length < 12 || managerPassword.length < 12)) {
    throw new Error('Production seed requires INITIAL_ADMIN_PASSWORD and INITIAL_MANAGER_PASSWORD of at least 12 characters.');
  }

  const conn = await pool.getConnection();
  try {
    console.log('🌱 Seeding database...');
    await conn.beginTransaction();

    // Seed users
    // Passwords use bcrypt cost 12. Change these credentials immediately after first login.
    // Default credentials are intentionally NOT printed to stdout.
    const adminHash = await bcrypt.hash(adminPassword, 12);
    const managerHash = await bcrypt.hash(managerPassword, 12);

    await conn.query(`
      INSERT IGNORE INTO users (name, email, password_hash, role) VALUES
        ('Restaurant Owner', 'admin@habesha.com', ?, 'admin'),
        ('Manager Uncle', 'manager@habesha.com', ?, 'manager')
    `, [adminHash, managerHash]);

    // Seed ingredients
    await conn.query(`
      INSERT IGNORE INTO ingredients (name, unit_of_measure, current_quantity, reorder_level, reorder_quantity, cost_per_unit) VALUES
        ('Beef', 'kg', 20.0, 5.0, 15.0, 8.50),
        ('Chicken', 'kg', 15.0, 4.0, 10.0, 6.00),
        ('Berbere Spice', 'kg', 5.0, 1.0, 3.0, 12.00),
        ('Niter Kibbeh (Spiced Butter)', 'kg', 8.0, 2.0, 5.0, 10.00),
        ('Onion', 'kg', 10.0, 3.0, 8.0, 1.50),
        ('Injera', 'pieces', 100, 30, 80, 0.50),
        ('Coffee Beans', 'kg', 3.0, 0.5, 2.0, 15.00),
        ('Milk', 'liters', 10.0, 2.0, 5.0, 1.20),
        ('Lamb', 'kg', 10.0, 3.0, 8.0, 10.00),
        ('Lentils', 'kg', 8.0, 2.0, 5.0, 2.00),
        ('Tomato', 'kg', 5.0, 1.0, 4.0, 1.80),
        ('Garlic', 'kg', 2.0, 0.5, 1.5, 3.00)
    `);

    // Seed menu items
    await conn.query(`
      INSERT IGNORE INTO recipe_items (name, selling_price, category, description) VALUES
        ('Doro Wot', 12.00, 'Wot', 'Ethiopian chicken stew with hard-boiled eggs'),
        ('Tibs', 11.00, 'Tibs', 'Sautéed meat with vegetables'),
        ('Kitfo', 13.00, 'Kitfo', 'Ethiopian steak tartare with spiced butter'),
        ('Misir Wot', 8.00, 'Wot', 'Red lentil stew'),
        ('Ethiopian Coffee', 3.00, 'Coffee', 'Traditional Ethiopian coffee ceremony'),
        ('Lamb Tibs', 13.00, 'Tibs', 'Sautéed lamb with herbs and vegetables')
    `);

    console.log('✅ Menu items seeded');

    // Fetch IDs for relation setup
    const [itemRows] = await conn.query('SELECT id, name FROM recipe_items');
    const items = Object.fromEntries(itemRows.map(r => [r.name, r.id]));

    const [ingrRows] = await conn.query('SELECT id, name FROM ingredients');
    const ingrs = Object.fromEntries(ingrRows.map(r => [r.name, r.id]));

    // Seed recipe ingredients
    const recipeIngredients = [
      // Doro Wot
      [items['Doro Wot'], ingrs['Chicken'], 0.350],
      [items['Doro Wot'], ingrs['Berbere Spice'], 0.050],
      [items['Doro Wot'], ingrs['Niter Kibbeh (Spiced Butter)'], 0.030],
      [items['Doro Wot'], ingrs['Onion'], 0.100],
      [items['Doro Wot'], ingrs['Injera'], 2],
      // Tibs
      [items['Tibs'], ingrs['Beef'], 0.250],
      [items['Tibs'], ingrs['Onion'], 0.080],
      [items['Tibs'], ingrs['Tomato'], 0.100],
      [items['Tibs'], ingrs['Niter Kibbeh (Spiced Butter)'], 0.020],
      [items['Tibs'], ingrs['Injera'], 2],
      // Kitfo
      [items['Kitfo'], ingrs['Beef'], 0.300],
      [items['Kitfo'], ingrs['Niter Kibbeh (Spiced Butter)'], 0.050],
      [items['Kitfo'], ingrs['Berbere Spice'], 0.020],
      [items['Kitfo'], ingrs['Injera'], 2],
      // Misir Wot
      [items['Misir Wot'], ingrs['Lentils'], 0.150],
      [items['Misir Wot'], ingrs['Berbere Spice'], 0.030],
      [items['Misir Wot'], ingrs['Onion'], 0.080],
      [items['Misir Wot'], ingrs['Injera'], 2],
      // Ethiopian Coffee
      [items['Ethiopian Coffee'], ingrs['Coffee Beans'], 0.020],
      // Lamb Tibs
      [items['Lamb Tibs'], ingrs['Lamb'], 0.280],
      [items['Lamb Tibs'], ingrs['Onion'], 0.080],
      [items['Lamb Tibs'], ingrs['Garlic'], 0.010],
      [items['Lamb Tibs'], ingrs['Niter Kibbeh (Spiced Butter)'], 0.025],
      [items['Lamb Tibs'], ingrs['Injera'], 2],
    ];

    for (const [itemId, ingrId, qty] of recipeIngredients) {
      if (itemId && ingrId) {
        await conn.query(
          'INSERT IGNORE INTO recipe_ingredients (recipe_item_id, ingredient_id, quantity_required) VALUES (?, ?, ?)',
          [itemId, ingrId, qty]
        );
      }
    }

    // Seed variations
    await conn.query(`
      INSERT IGNORE INTO variations (name, parent_recipe_id, price_adjustment) VALUES
        ('Special Kitfo', ?, 2.00),
        ('Regular Kitfo', ?, 0.00),
        ('Spicy Tibs', ?, 1.00),
        ('Mild Tibs', ?, 0.00)
    `, [items['Kitfo'], items['Kitfo'], items['Tibs'], items['Tibs']]);

    const [varRows] = await conn.query('SELECT id, name FROM variations');
    const vars = Object.fromEntries(varRows.map(r => [r.name, r.id]));

    // Variation overrides
    if (vars['Spicy Tibs']) {
      await conn.query(
        'INSERT IGNORE INTO variation_ingredients (variation_id, ingredient_id, quantity_required, override_type) VALUES (?, ?, ?, ?)',
        [vars['Spicy Tibs'], ingrs['Berbere Spice'], 0.030, 'add']
      );
    }
    if (vars['Special Kitfo']) {
      await conn.query(
        'INSERT IGNORE INTO variation_ingredients (variation_id, ingredient_id, quantity_required, override_type) VALUES (?, ?, ?, ?)',
        [vars['Special Kitfo'], ingrs['Niter Kibbeh (Spiced Butter)'], 0.080, 'override']
      );
    }

    await conn.commit();
    console.log('✅ Database seeded successfully');
    console.log('');
    console.log('👤 Admin login:   admin@habesha.com');
    console.log('👤 Manager login: manager@habesha.com');
    console.log('⚠️  Change default passwords immediately after first login!');
  } catch (err) {
    await conn.rollback();
    console.error('❌ Seeding failed:', err.message);
    throw err;
  } finally {
    conn.release();
    await pool.end();
  }
}

seed().catch(console.error);
