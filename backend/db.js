import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.resolve(process.cwd(), 'database.sqlite');
const db = new Database(dbPath);

export async function initDB() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE,
      password TEXT
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS appliances (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER,
      name TEXT,
      powerWatts REAL,
      usageHours REAL,
      FOREIGN KEY(userId) REFERENCES users(id)
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS electricity_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER,
      month TEXT,
      totalKwh REAL,
      estimatedCost REAL,
      FOREIGN KEY(userId) REFERENCES users(id)
    )
  `);

  console.log('Database initialized');
}

export const run = (sql, params = []) => {
  return db.prepare(sql).run(...params);
};

export const get = (sql, params = []) => {
  return db.prepare(sql).get(...params);
};

export const all = (sql, params = []) => {
  return db.prepare(sql).all(...params);
};

export default db;
