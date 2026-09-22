import type { DatabaseSync } from 'node:sqlite';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { migrateDatabase, openDatabase } from '../../database/database.js';
import { PaperRepository } from '../paper/paper.repository.js';
import { AnalysisService } from './analysis.service.js';

describe('AnalysisService', () => {
  let database: DatabaseSync;
  let repository: PaperRepository;
  let analysis: AnalysisService;

  beforeEach(() => {
    database = openDatabase(':memory:');
    migrateDatabase(database);
    repository = new PaperRepository(database);
    analysis = new AnalysisService(database);
  });

  afterEach(() => database.close());

  function add(title: string, conference: 'CVPR' | 'ICCV', year: number, keywords: string[]) {
    return repository.create({
      title,
      conference,
      year,
      keywords,
      paperUrl: `https://example.com/${encodeURIComponent(title)}`,
      source: 'seed',
    });
  }

  it('returns deterministic ranking and correct heat denominator', () => {
    add('Paper A', 'CVPR', 2023, ['Object Detection', 'Vision Transformer']);
    add('Paper B', 'CVPR', 2024, ['Object Detection']);
    add('Paper C', 'ICCV', 2023, ['Image Segmentation']);

    expect(analysis.topKeywords().items).toEqual([
      { keyword: 'object detection', paperCount: 2, heat: 2 / 3 },
      { keyword: 'image segmentation', paperCount: 1, heat: 1 / 3 },
      { keyword: 'vision transformer', paperCount: 1, heat: 1 / 3 },
    ]);
    expect(analysis.topKeywords({ conference: 'CVPR' }).totalPapers).toBe(2);
    expect(analysis.topKeywords({ conference: 'CVPR' }).items[0]?.heat).toBe(1);
  });

  it('counts keyword co-occurrence per paper and updates after deletion', () => {
    const first = add('Paper A', 'CVPR', 2023, ['Object Detection', 'Vision Transformer']);
    add('Paper B', 'CVPR', 2024, ['Object Detection', 'Vision Transformer']);

    expect(analysis.graph({}, 10, 2).edges).toEqual([
      { source: 'object detection', target: 'vision transformer', cooccurrence: 2 },
    ]);
    repository.delete(first.id);
    expect(analysis.graph({}, 10, 2).edges).toEqual([]);
  });

  it('returns grouped trends with each year and conference denominator', () => {
    add('Paper A', 'CVPR', 2023, ['Object Detection']);
    add('Paper B', 'CVPR', 2023, ['Image Segmentation']);
    add('Paper C', 'ICCV', 2024, ['Object Detection']);

    const result = analysis.trends();
    expect(result.points).toContainEqual({
      conference: 'CVPR',
      year: 2023,
      keyword: 'object detection',
      paperCount: 1,
      totalPapers: 2,
      heat: 0.5,
    });
    expect(result.frames).toContainEqual(expect.objectContaining({
      conference: 'CVPR',
      year: 2023,
      totalPapers: 2,
      ranking: expect.arrayContaining([
        { keyword: 'image segmentation', paperCount: 1, heat: 0.5 },
      ]),
    }));
    expect(result.points).toContainEqual({
      conference: 'ICCV',
      year: 2024,
      keyword: 'object detection',
      paperCount: 1,
      totalPapers: 1,
      heat: 1,
    });
  });

  it('returns safe empty results', () => {
    expect(analysis.topKeywords()).toEqual({ totalPapers: 0, items: [] });
    expect(analysis.graph()).toEqual({ totalPapers: 0, nodes: [], edges: [] });
    expect(analysis.trends()).toEqual({ keywords: [], points: [], frames: [] });
  });
});
