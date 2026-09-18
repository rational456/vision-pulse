import { createApp } from './app.js';
import { getDatabasePath } from './config/database.config.js';
import { migrateDatabase, openDatabase } from './database/database.js';
import { PaperRepository } from './modules/paper/paper.repository.js';

const port = Number.parseInt(process.env.PORT ?? '3000', 10);
const database = openDatabase(getDatabasePath());
migrateDatabase(database);
const app = createApp({ paperRepository: new PaperRepository(database) });

app.listen(port, () => {
  console.log(`Top Conference Hotwords API listening on http://localhost:${port}`);
});
