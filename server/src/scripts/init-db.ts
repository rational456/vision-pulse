import { getDatabasePath } from '../config/database.config.js';
import { migrateDatabase, openDatabase } from '../database/database.js';

const databasePath = getDatabasePath();
const database = openDatabase(databasePath);

try {
  migrateDatabase(database);
  console.log(`Database initialized: ${databasePath}`);
} finally {
  database.close();
}
