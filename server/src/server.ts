import { createApp } from './app.js';
import { getDatabasePath } from './config/database.config.js';
import { migrateDatabase, openDatabase } from './database/database.js';
import { PaperRepository } from './modules/paper/paper.repository.js';
import { AnalysisService } from './modules/analysis/analysis.service.js';
import { CsvImportService } from './modules/import/csv-import.service.js';
import { PaperService } from './modules/paper/paper.service.js';

const port = Number.parseInt(process.env.PORT ?? '3000', 10);
const database = openDatabase(getDatabasePath());
migrateDatabase(database);
const paperRepository = new PaperRepository(database);
const app = createApp({
  paperRepository,
  analysisService: new AnalysisService(database),
  csvImportService: new CsvImportService(database, new PaperService(paperRepository)),
});

app.listen(port, () => {
  console.log(`Top Conference Hotwords API listening on http://localhost:${port}`);
});
