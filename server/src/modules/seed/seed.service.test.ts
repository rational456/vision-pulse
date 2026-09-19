import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { DatabaseSync } from 'node:sqlite';
import { migrateDatabase, openDatabase } from '../../database/database.js';
import { AnalysisService } from '../analysis/analysis.service.js';
import { PaperRepository } from '../paper/paper.repository.js';
import { PaperService } from '../paper/paper.service.js';
import type { SeedSnapshot } from './official-crawler.js';
import { applySeedSnapshot } from './seed.service.js';

const snapshot = JSON.parse(readFileSync(
  new URL('../../../seeds/official-sample.json', import.meta.url), 'utf8',
)) as SeedSnapshot;

describe('official seed snapshot', () => {
  let database: DatabaseSync;

  beforeEach(() => {
    database = openDatabase(':memory:');
    migrateDatabase(database);
  });

  afterEach(() => database.close());

  it('has 10 distinct official papers with abstracts per conference-year', () => {
    expect(snapshot.papers).toHaveLength(60);
    expect(new Set(snapshot.papers.map((paper) => paper.externalId)).size).toBe(60);
    for (const source of snapshot.sources) {
      const group = snapshot.papers.filter((paper) =>
        paper.conference === source.conference && paper.year === source.year);
      expect(group).toHaveLength(10);
      expect(group.every((paper) => Boolean(paper.abstract && paper.paperUrl))).toBe(true);
    }
  });

  it('is idempotent and produces nonempty analysis across all three conferences', () => {
    const service = new PaperService(new PaperRepository(database));
    expect(applySeedSnapshot(snapshot, service)).toEqual({ created: 60, skippedExisting: 0 });
    expect(applySeedSnapshot(snapshot, service)).toEqual({ created: 0, skippedExisting: 60 });

    const analysis = new AnalysisService(database);
    expect(analysis.overview().totalPapers).toBe(60);
    expect(analysis.overview().conferenceCounts.map((item) => item.paperCount)).toEqual([20, 20, 20]);
    expect(analysis.topKeywords().items).toHaveLength(10);
    expect(analysis.graph().edges.length).toBeGreaterThan(0);
    expect(analysis.trends().frames).toHaveLength(6);
  });
});
