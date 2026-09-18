import { mkdirSync, readFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const migrations = [
  {
    version: 1,
    path: new URL('../../migrations/001_initial.sql', import.meta.url),
  },
] as const;

export function openDatabase(path: string): DatabaseSync {
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });

  const database = new DatabaseSync(path);
  database.exec('PRAGMA foreign_keys = ON;');
  database.exec('PRAGMA journal_mode = WAL;');
  return database;
}

export function migrateDatabase(database: DatabaseSync): void {
  database.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  const hasMigration = database.prepare(
    'SELECT 1 FROM schema_migrations WHERE version = ?',
  );
  const recordMigration = database.prepare(
    'INSERT INTO schema_migrations (version) VALUES (?)',
  );

  for (const migration of migrations) {
    if (hasMigration.get(migration.version)) continue;

    const sql = readFileSync(migration.path, 'utf8');
    database.exec('BEGIN IMMEDIATE;');
    try {
      database.exec(sql);
      recordMigration.run(migration.version);
      database.exec('COMMIT;');
    } catch (error) {
      database.exec('ROLLBACK;');
      throw error;
    }
  }
}
