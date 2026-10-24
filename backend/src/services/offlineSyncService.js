const pool = require('../database/db');

const createTableSql = `
  CREATE TABLE IF NOT EXISTS offline_sync_receipts (
    operation_id VARCHAR(100) PRIMARY KEY,
    operation_type ENUM('order', 'purchase', 'expense') NOT NULL,
    result_id INT NOT NULL,
    user_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_offline_sync_user (user_id, created_at)
  ) ENGINE=InnoDB
`;

async function initializeOfflineSync() {
  await pool.query(createTableSql);
}

async function findReceipt(connection, operationId, userId) {
  const [rows] = await connection.query(
    'SELECT operation_type, result_id FROM offline_sync_receipts WHERE operation_id = ? AND user_id = ?',
    [operationId, userId]
  );
  return rows[0] || null;
}

async function saveReceipt(connection, operationId, operationType, resultId, userId) {
  await connection.query(
    'INSERT INTO offline_sync_receipts (operation_id, operation_type, result_id, user_id) VALUES (?, ?, ?, ?)',
    [operationId, operationType, resultId, userId]
  );
}

module.exports = { initializeOfflineSync, findReceipt, saveReceipt };
