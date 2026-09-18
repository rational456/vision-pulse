import { describe, expect, it } from 'vitest';
import { migrateDatabase, openDatabase } from './database.js';

describe('database migrations', () => {
  it('creates the required tables and can be applied repeatedly', () => {
    const database = openDatabase(':memory:');

    migrateDatabase(database);
    migrateDatabase(database);

    const tables = database.prepare(
      "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name",
    ).all() as Array<{ name: string }>;

    expect(tables.map(({ name }) => name)).toEqual(
      expect.arrayContaining(['papers', 'keyword_stats', 'import_tasks', 'schema_migrations']),
    );
    expect(database.prepare('SELECT count(*) AS count FROM schema_migrations').get()).toEqual({
      count: 1,
    });
    database.close();
  });

  it('rejects duplicate external ids and duplicate paper identities', () => {
    const database = openDatabase(':memory:');
    migrateDatabase(database);
    const insert = database.prepare(`
      INSERT INTO papers (external_id, title, conference, year, paper_url, source)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    insert.run('paper-1', 'Example Paper', 'CVPR', 2024, 'https://example.com/1', 'test');

    expect(() => insert.run(
      'paper-1',
      'Another Paper',
      'ICCV',
      2023,
      'https://example.com/2',
      'test',
    )).toThrow();
    expect(() => insert.run(
      'paper-2',
      'example paper',
      'CVPR',
      2024,
      'https://example.com/3',
      'test',
    )).toThrow();
    database.close();
  });
});
