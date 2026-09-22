import type { DatabaseSync } from 'node:sqlite';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { migrateDatabase, openDatabase } from '../../database/database.js';
import { PaperRepository } from './paper.repository.js';

describe('PaperRepository', () => {
  let database: DatabaseSync;
  let repository: PaperRepository;

  beforeEach(() => {
    database = openDatabase(':memory:');
    migrateDatabase(database);
    repository = new PaperRepository(database);
  });

  afterEach(() => database.close());

  it('creates and reads a paper without losing array fields', () => {
    const created = repository.create({
      externalId: 'W1',
      title: 'Vision Transformers in the Wild',
      abstract: 'An abstract.',
      keywords: ['Vision Transformer', 'Domain Adaptation'],
      authors: ['Ada Chen', 'Bo Lin'],
      conference: 'CVPR',
      year: 2024,
      paperUrl: 'https://example.com/w1',
      source: 'openalex',
    });

    expect(repository.getById(created.id)).toEqual(created);
    expect(created.keywords).toEqual(['Vision Transformer', 'Domain Adaptation']);
    expect(created.authors).toEqual(['Ada Chen', 'Bo Lin']);
  });

  it('updates and deletes an existing paper', () => {
    const created = repository.create({
      title: 'Initial Title',
      conference: 'ICCV',
      year: 2023,
      paperUrl: 'https://example.com/initial',
      source: 'manual',
    });

    const updated = repository.update(created.id, {
      title: 'Updated Title',
      keywords: ['Segmentation'],
    });

    expect(updated).toEqual(expect.objectContaining({
      id: created.id,
      title: 'Updated Title',
      keywords: ['Segmentation'],
    }));
    expect(repository.delete(created.id)).toBe(true);
    expect(repository.getById(created.id)).toBeNull();
    expect(repository.delete(created.id)).toBe(false);
  });

  it('supports exact title and combined keyword, conference and year filters', () => {
    repository.create({
      externalId: 'CVPR-2024-1',
      title: 'Open Vocabulary Detection',
      keywords: ['Open Vocabulary', 'Object Detection'],
      conference: 'CVPR',
      year: 2024,
      paperUrl: 'https://example.com/cvpr',
      source: 'seed',
    });
    repository.create({
      externalId: 'ICCV-2023-1',
      title: 'Open Vocabulary Segmentation',
      keywords: ['Open Vocabulary', 'Segmentation'],
      conference: 'ICCV',
      year: 2023,
      paperUrl: 'https://example.com/iccv',
      source: 'seed',
    });

    expect(repository.list({ exactTitle: 'open vocabulary detection' }).items).toHaveLength(1);
    expect(repository.list({
      keyword: 'object',
      conference: 'CVPR',
      year: 2024,
    }).items.map(({ title }) => title)).toEqual(['Open Vocabulary Detection']);
    expect(repository.list({ idQuery: 'CVPR-2024' }).items).toHaveLength(1);
  });

  it('paginates deterministically and caps the page size', () => {
    for (let index = 1; index <= 3; index += 1) {
      repository.create({
        title: `Paper ${index}`,
        conference: 'ECCV',
        year: 2022,
        paperUrl: `https://example.com/${index}`,
        source: 'seed',
      });
    }

    const page = repository.list({ page: 2, pageSize: 2 });
    expect(page).toEqual(expect.objectContaining({ total: 3, page: 2, pageSize: 2 }));
    expect(page.items).toHaveLength(1);
    expect(repository.list({ pageSize: 1000 }).pageSize).toBe(100);
  });
});
