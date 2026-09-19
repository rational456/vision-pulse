import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { getDatabasePath } from '../config/database.config.js';
import { migrateDatabase, openDatabase } from '../database/database.js';
import { PaperRepository } from '../modules/paper/paper.repository.js';
import { PaperService } from '../modules/paper/paper.service.js';
import { OfficialConferenceCrawler, type SeedSnapshot } from '../modules/seed/official-crawler.js';
import { applySeedSnapshot } from '../modules/seed/seed.service.js';

const snapshotPath = fileURLToPath(new URL('../../seeds/official-sample.json', import.meta.url));

async function main() {
  if (process.argv.includes('--collect')) {
    const countArgument = process.argv.find((argument) => argument.startsWith('--per-group='));
    const perGroup = countArgument ? Number(countArgument.split('=')[1]) : 10;
    if (!Number.isInteger(perGroup) || perGroup < 1 || perGroup > 25) {
      throw new Error('--per-group 必须是 1 到 25 之间的整数');
    }
    const snapshot = await new OfficialConferenceCrawler().collect(perGroup);
    await writeFile(snapshotPath, `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8');
    console.log(`Saved ${snapshot.papers.length} official papers to ${snapshotPath}`);
    return;
  }

  const snapshot = JSON.parse(await readFile(snapshotPath, 'utf8')) as SeedSnapshot;
  const database = openDatabase(getDatabasePath());
  try {
    migrateDatabase(database);
    const service = new PaperService(new PaperRepository(database));
    const result = applySeedSnapshot(snapshot, service);
    console.log(`Seed complete: created ${result.created}, skipped existing ${result.skippedExisting}`);
  } finally {
    database.close();
  }
}

await main();
