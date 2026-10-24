import * as SQLite from 'expo-sqlite';

let databasePromise;

export function getOfflineDatabase() {
  if (!databasePromise) {
    databasePromise = SQLite.openDatabaseAsync('habesha-manager.db').then(async (database) => {
      await database.execAsync(`
        PRAGMA journal_mode = WAL;
        CREATE TABLE IF NOT EXISTS offline_records (
          id TEXT PRIMARY KEY NOT NULL,
          user_id TEXT NOT NULL,
          type TEXT NOT NULL,
          payload TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'pending',
          error TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_offline_records_user_status
          ON offline_records (user_id, status, created_at);
        CREATE TABLE IF NOT EXISTS cached_data (
          cache_key TEXT PRIMARY KEY NOT NULL,
          json_data TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
        DELETE FROM offline_records
          WHERE status = 'synced' AND created_at < datetime('now', '-30 days');
      `);
      return database;
    }).catch((error) => {
      databasePromise = null;
      throw error;
    });
  }
  return databasePromise;
}

export async function cacheData(key, value) {
  const database = await getOfflineDatabase();
  await database.runAsync(
    `INSERT INTO cached_data (cache_key, json_data, updated_at)
     VALUES (?, ?, ?)
     ON CONFLICT(cache_key) DO UPDATE SET json_data = excluded.json_data, updated_at = excluded.updated_at`,
    key,
    JSON.stringify(value),
    new Date().toISOString()
  );
}

export async function getCachedData(key) {
  const database = await getOfflineDatabase();
  const row = await database.getFirstAsync(
    'SELECT json_data FROM cached_data WHERE cache_key = ?',
    key
  );
  return row ? JSON.parse(row.json_data) : null;
}

export async function enqueueRecord({ id, userId, type, payload }) {
  const database = await getOfflineDatabase();
  const now = new Date().toISOString();
  await database.runAsync(
    `INSERT INTO offline_records (id, user_id, type, payload, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, 'pending', ?, ?)`,
    id,
    String(userId),
    type,
    JSON.stringify(payload),
    now,
    now
  );
}

export async function getPendingRecords(userId) {
  const database = await getOfflineDatabase();
  return database.getAllAsync(
    `SELECT id, user_id, type, payload, status, error, created_at
     FROM offline_records
     WHERE user_id = ? AND status = 'pending'
     ORDER BY created_at, rowid`,
    String(userId)
  );
}

export async function getConflictRecords(userId) {
  const database = await getOfflineDatabase();
  return database.getAllAsync(
    `SELECT id, type, payload, error, created_at
     FROM offline_records
     WHERE user_id = ? AND status = 'conflict'
     ORDER BY created_at, rowid`,
    String(userId)
  );
}

export async function getRecordCounts(userId) {
  const database = await getOfflineDatabase();
  const row = await database.getFirstAsync(
    `SELECT
       SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pending,
       SUM(CASE WHEN status = 'conflict' THEN 1 ELSE 0 END) AS conflicts
     FROM offline_records
     WHERE user_id = ?`,
    String(userId)
  );
  return { pending: row?.pending || 0, conflicts: row?.conflicts || 0 };
}

export async function updateRecord(id, status, error = null) {
  const database = await getOfflineDatabase();
  await database.runAsync(
    'UPDATE offline_records SET status = ?, error = ?, updated_at = ? WHERE id = ?',
    status,
    error,
    new Date().toISOString(),
    id
  );
}

export async function retryConflictRecords(userId) {
  const database = await getOfflineDatabase();
  await database.runAsync(
    `UPDATE offline_records
     SET status = 'pending', error = NULL, updated_at = ?
     WHERE user_id = ? AND status = 'conflict'`,
    new Date().toISOString(),
    String(userId)
  );
}
