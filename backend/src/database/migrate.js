const pool = require('./db');

// MySQL migrations — run in order (foreign keys require tables to exist first)
const migrations = [
  // 1. Users
  `CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('admin', 'manager') NOT NULL,
    is_active TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  ) ENGINE=InnoDB`,

  // 2. Ingredients (Inventory)
  `CREATE TABLE IF NOT EXISTS ingredients (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    unit_of_measure VARCHAR(30) NOT NULL,
    current_quantity DECIMAL(10,3) DEFAULT 0,
    reorder_level DECIMAL(10,3) NOT NULL DEFAULT 0,
    reorder_quantity DECIMAL(10,3) NOT NULL DEFAULT 0,
    cost_per_unit DECIMAL(10,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  ) ENGINE=InnoDB`,

  // 3. Recipe Items (Menu)
  `CREATE TABLE IF NOT EXISTS recipe_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    selling_price DECIMAL(10,2) NOT NULL,
    category VARCHAR(80) NOT NULL,
    description TEXT,
    is_available TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  ) ENGINE=InnoDB`,

  // 4. Recipe Ingredients (base recipe — many-to-many)
  `CREATE TABLE IF NOT EXISTS recipe_ingredients (
    id INT AUTO_INCREMENT PRIMARY KEY,
    recipe_item_id INT NOT NULL,
    ingredient_id INT NOT NULL,
    quantity_required DECIMAL(10,4) NOT NULL,
    UNIQUE KEY uq_recipe_ingredient (recipe_item_id, ingredient_id),
    FOREIGN KEY (recipe_item_id) REFERENCES recipe_items(id) ON DELETE CASCADE,
    FOREIGN KEY (ingredient_id) REFERENCES ingredients(id) ON DELETE CASCADE
  ) ENGINE=InnoDB`,

  // 5. Variations
  `CREATE TABLE IF NOT EXISTS variations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    parent_recipe_id INT,
    price_adjustment DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (parent_recipe_id) REFERENCES recipe_items(id) ON DELETE CASCADE
  ) ENGINE=InnoDB`,

  // 6. Variation Ingredients
  `CREATE TABLE IF NOT EXISTS variation_ingredients (
    id INT AUTO_INCREMENT PRIMARY KEY,
    variation_id INT NOT NULL,
    ingredient_id INT NOT NULL,
    quantity_required DECIMAL(10,4) NOT NULL,
    override_type ENUM('override', 'add', 'remove') DEFAULT 'override',
    UNIQUE KEY uq_variation_ingredient (variation_id, ingredient_id),
    FOREIGN KEY (variation_id) REFERENCES variations(id) ON DELETE CASCADE,
    FOREIGN KEY (ingredient_id) REFERENCES ingredients(id) ON DELETE CASCADE
  ) ENGINE=InnoDB`,

  // 7. Orders
  `CREATE TABLE IF NOT EXISTS orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    total_amount DECIMAL(10,2) NOT NULL,
    payment_method ENUM('cash', 'card', 'other') DEFAULT 'cash',
    status VARCHAR(30) DEFAULT 'completed',
    created_by INT,
    notes TEXT,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
  ) ENGINE=InnoDB`,

  // 8. Order Items
  `CREATE TABLE IF NOT EXISTS order_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    recipe_item_id INT NOT NULL,
    variation_id INT,
    quantity INT NOT NULL DEFAULT 1,
    unit_price DECIMAL(10,2) NOT NULL,
    subtotal DECIMAL(10,2) NOT NULL,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (recipe_item_id) REFERENCES recipe_items(id),
    FOREIGN KEY (variation_id) REFERENCES variations(id) ON DELETE SET NULL
  ) ENGINE=InnoDB`,

  // 9. Purchases (Restocking)
  `CREATE TABLE IF NOT EXISTS purchases (
    id INT AUTO_INCREMENT PRIMARY KEY,
    purchase_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    supplier_name VARCHAR(150),
    total_cost DECIMAL(10,2),
    created_by INT,
    notes TEXT,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
  ) ENGINE=InnoDB`,

  // 10. Purchase Items
  `CREATE TABLE IF NOT EXISTS purchase_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    purchase_id INT NOT NULL,
    ingredient_id INT NOT NULL,
    quantity_bought DECIMAL(10,3) NOT NULL,
    cost_per_unit_at_time DECIMAL(10,2) NOT NULL,
    FOREIGN KEY (purchase_id) REFERENCES purchases(id) ON DELETE CASCADE,
    FOREIGN KEY (ingredient_id) REFERENCES ingredients(id)
  ) ENGINE=InnoDB`,

  // 11. Operating Expenses
  `CREATE TABLE IF NOT EXISTS operating_expenses (
    id INT AUTO_INCREMENT PRIMARY KEY,
    expense_date DATE NOT NULL DEFAULT (CURRENT_DATE),
    category VARCHAR(80) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    description TEXT,
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
  ) ENGINE=InnoDB`,

  // 12. Notifications log
  `CREATE TABLE IF NOT EXISTS notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    type VARCHAR(50) NOT NULL,
    message TEXT NOT NULL,
    ingredient_id INT,
    is_read TINYINT(1) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ingredient_id) REFERENCES ingredients(id) ON DELETE SET NULL
  ) ENGINE=InnoDB`,

  `CREATE TABLE IF NOT EXISTS offline_sync_receipts (
    operation_id VARCHAR(100) PRIMARY KEY,
    operation_type ENUM('order', 'purchase', 'expense') NOT NULL,
    result_id INT NOT NULL,
    user_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_offline_sync_user (user_id, created_at)
  ) ENGINE=InnoDB`,

  // ─── Performance indexes for 5-year data retention ───────────────────────
  // These turn full-table scans into index seeks on the two highest-volume tables.
  // Duplicate index names are ignored by the migration loop below.

  // orders.order_date — every analytics, financial, and listing query filters on this
  `CREATE INDEX idx_orders_order_date
     ON orders (order_date)`,

  // orders.order_date + total_amount covering index — financial SUM queries read
  // both columns together; this avoids touching the main row at all
  `CREATE INDEX idx_orders_date_amount
     ON orders (order_date, total_amount)`,

  // order_items.order_id — JOIN from orders → order_items (already has FK but
  // MySQL does not auto-create an index on the child FK side in all versions)
  `CREATE INDEX idx_order_items_order_id
     ON order_items (order_id)`,

  // order_items.recipe_item_id — used in every sales ranking and COGS query
  `CREATE INDEX idx_order_items_recipe_item_id
     ON order_items (recipe_item_id)`,

  // operating_expenses.expense_date — financial report sums filter on this
  `CREATE INDEX idx_expenses_date
     ON operating_expenses (expense_date)`,

  // notifications — dashboard only needs unread ones; keeps that query fast
  // even after years of read notifications pile up
  `CREATE INDEX idx_notifications_unread
     ON notifications (is_read, created_at)`,
];

async function migrate() {
  const conn = await pool.getConnection();
  try {
    console.log('🚀 Running database migrations...');
    await conn.query('SET FOREIGN_KEY_CHECKS = 0');
    for (const sql of migrations) {
      try {
        await conn.query(sql);
      } catch (err) {
        if (err.code !== 'ER_DUP_KEYNAME') throw err;
      }
    }
    await conn.query('SET FOREIGN_KEY_CHECKS = 1');
    console.log('✅ All migrations completed successfully');
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    throw err;
  } finally {
    conn.release();
    await pool.end();
  }
}

migrate().catch(console.error);
