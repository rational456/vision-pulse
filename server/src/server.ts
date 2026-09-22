import { createApp } from './app.js';
import { fileURLToPath } from 'node:url';
import { getDatabasePath } from './config/database.config.js';
import { migrateDatabase, openDatabase } from './database/database.js';
import { PaperRepository } from './modules/paper/paper.repository.js';
import { AnalysisService } from './modules/analysis/analysis.service.js';
import { CsvImportService } from './modules/import/csv-import.service.js';
import { PaperService } from './modules/paper/paper.service.js';
import { DblpClient } from './integrations/dblp/dblp.client.js';
import { OpenAlexClient } from './integrations/openalex/openalex.client.js';
import { ExternalPaperSearchService } from './modules/search/external-paper-search.service.js';

const port = Number.parseInt(process.env.PORT ?? '3000', 10);
const database = openDatabase(getDatabasePath());
migrateDatabase(database);
const paperRepository = new PaperRepository(database);
const externalPaperSearch = new ExternalPaperSearchService(
  new DblpClient(),
  new OpenAlexClient(),
);
const webDistPath = process.env.WEB_DIST_PATH?.trim()
  || fileURLToPath(new URL('../../web/dist', import.meta.url));
const app = createApp({
  paperRepository,
  analysisService: new AnalysisService(database),
  csvImportService: new CsvImportService(
    database,
    new PaperService(paperRepository),
    externalPaperSearch,
  ),
  externalPaperSearch,
  webDistPath,
});

app.listen(port, () => {
  console.log(`Vision Pulse listening on http://localhost:${port}`);
});
