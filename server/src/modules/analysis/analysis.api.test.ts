import type { DatabaseSync } from 'node:sqlite';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../app.js';
import { migrateDatabase, openDatabase } from '../../database/database.js';
import { PaperRepository } from '../paper/paper.repository.js';
import { AnalysisService } from './analysis.service.js';

describe('analysis API', () => {
  let database: DatabaseSync;
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    database = openDatabase(':memory:');
    migrateDatabase(database);
    const repository = new PaperRepository(database);
    repository.create({
      title: 'CVPR Vision Paper',
      keywords: ['Object Detection', 'Vision Transformer'],
      conference: 'CVPR',
      year: 2024,
      paperUrl: 'https://example.com/cvpr',
      source: 'seed',
    });
    repository.create({
      title: 'ICCV Vision Paper',
      keywords: ['Object Detection'],
      conference: 'ICCV',
      year: 2023,
      paperUrl: 'https://example.com/iccv',
      source: 'seed',
    });
    app = createApp({
      paperRepository: repository,
      analysisService: new AnalysisService(database),
    });
  });

  afterEach(() => database.close());

  it('returns overview, top keywords, graph and trends', async () => {
    const overview = await request(app).get('/api/analysis/overview');
    expect(overview.status).toBe(200);
    expect(overview.body.data.totalPapers).toBe(2);

    const top = await request(app).get('/api/analysis/top-keywords').query({ conference: 'CVPR' });
    expect(top.status).toBe(200);
    expect(top.body.data.totalPapers).toBe(1);

    const graph = await request(app).get('/api/analysis/graph');
    expect(graph.status).toBe(200);
    expect(graph.body.data.edges).toContainEqual({
      source: 'object detection',
      target: 'vision transformer',
      cooccurrence: 1,
    });

    const trends = await request(app).get('/api/analysis/trends');
    expect(trends.status).toBe(200);
    expect(trends.body.data.points).toContainEqual(expect.objectContaining({
      conference: 'CVPR', year: 2024, keyword: 'object detection', heat: 1,
    }));
  });

  it('rejects invalid ranges and oversized limits', async () => {
    const range = await request(app).get('/api/analysis/trends')
      .query({ yearFrom: 2025, yearTo: 2020 });
    expect(range.status).toBe(400);
    expect(range.body.error.code).toBe('INVALID_ANALYSIS_QUERY');

    const limit = await request(app).get('/api/analysis/graph').query({ nodeLimit: 1000 });
    expect(limit.status).toBe(400);
  });
});
