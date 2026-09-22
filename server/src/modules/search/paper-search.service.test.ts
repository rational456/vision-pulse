import type { DatabaseSync } from 'node:sqlite';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { migrateDatabase, openDatabase } from '../../database/database.js';
import { PaperRepository } from '../paper/paper.repository.js';
import { ExternalPaperSearchService } from './external-paper-search.service.js';
import { PaperSearchService } from './paper-search.service.js';

describe('PaperSearchService', () => {
  let database: DatabaseSync;
  let repository: PaperRepository;

  beforeEach(() => {
    database = openDatabase(':memory:');
    migrateDatabase(database);
    repository = new PaperRepository(database);
  });

  afterEach(() => database.close());

  it('returns an exact local match without calling external providers', async () => {
    repository.create({
      title: 'A Local Vision Paper',
      conference: 'CVPR',
      year: 2024,
      paperUrl: 'https://example.com/local',
      source: 'seed',
    });
    const bibliography = { searchByTitle: vi.fn(async () => []) };
    const content = { searchByTitle: vi.fn(async () => []) };
    const service = new PaperSearchService(
      repository,
      new ExternalPaperSearchService(bibliography, content),
    );

    const result = await service.searchByTitle('a local vision paper');

    expect(result.origin).toBe('local');
    expect(result.items).toHaveLength(1);
    expect(bibliography.searchByTitle).not.toHaveBeenCalled();
    expect(content.searchByTitle).not.toHaveBeenCalled();
  });

  it('falls back to external providers when the local database has no exact match', async () => {
    const externalPaper = {
      externalId: 'W99',
      title: 'An External Vision Paper',
      authors: ['Ada Chen'],
      venue: 'CVPR',
      year: 2024,
      abstract: 'An abstract.',
      fieldsOfStudy: ['Computer Vision'],
      paperUrl: 'https://openalex.org/W99',
      doi: null,
      source: 'openalex' as const,
    };
    const service = new PaperSearchService(
      repository,
      new ExternalPaperSearchService(
        { searchByTitle: async () => [] },
        { searchByTitle: async () => [externalPaper] },
      ),
    );

    const result = await service.searchByTitle(externalPaper.title);

    expect(result.origin).toBe('external');
    expect(result.items[0]).toEqual(expect.objectContaining({ externalId: 'W99' }));
  });
});
