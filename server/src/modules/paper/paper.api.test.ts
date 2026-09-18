import type { DatabaseSync } from 'node:sqlite';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../app.js';
import { migrateDatabase, openDatabase } from '../../database/database.js';
import { PaperRepository } from './paper.repository.js';

describe('paper API', () => {
  let database: DatabaseSync;
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    database = openDatabase(':memory:');
    migrateDatabase(database);
    app = createApp({ paperRepository: new PaperRepository(database) });
  });

  afterEach(() => database.close());

  it('creates, reads, updates, filters and deletes papers', async () => {
    const createResponse = await request(app).post('/api/papers').send({
      externalId: 'W42',
      title: 'Open Vocabulary Object Detection',
      abstract: 'A test abstract.',
      keywords: ['Open Vocabulary', 'Object Detection'],
      authors: ['Ada Chen'],
      conference: 'CVPR',
      year: 2024,
      paperUrl: 'https://example.com/paper',
      source: 'openalex',
    });

    expect(createResponse.status).toBe(201);
    expect(createResponse.body.data).toEqual(expect.objectContaining({
      title: 'Open Vocabulary Object Detection',
      conference: 'CVPR',
    }));
    const id = createResponse.body.data.id as number;

    const detailResponse = await request(app).get(`/api/papers/${id}`);
    expect(detailResponse.status).toBe(200);
    expect(detailResponse.body.data.id).toBe(id);

    const updateResponse = await request(app).patch(`/api/papers/${id}`).send({
      keywords: ['Open Vocabulary', 'Detection'],
    });
    expect(updateResponse.status).toBe(200);
    expect(updateResponse.body.data.keywords).toEqual(['Open Vocabulary', 'Detection']);

    const listResponse = await request(app)
      .get('/api/papers')
      .query({ keyword: 'detection', conference: 'CVPR', year: '2024' });
    expect(listResponse.status).toBe(200);
    expect(listResponse.body.data).toEqual(expect.objectContaining({ total: 1 }));

    expect((await request(app).delete(`/api/papers/${id}`)).status).toBe(200);
    expect((await request(app).get(`/api/papers/${id}`)).status).toBe(404);
  });

  it('rejects invalid payloads and duplicate papers with stable error codes', async () => {
    const invalidResponse = await request(app).post('/api/papers').send({
      title: 'Bad URL',
      paperUrl: 'javascript:alert(1)',
      source: 'manual',
    });
    expect(invalidResponse.status).toBe(400);
    expect(invalidResponse.body.error.code).toBe('INVALID_INPUT');

    const paper = {
      externalId: 'duplicate-id',
      title: 'A Valid Paper',
      conference: 'ECCV',
      year: 2022,
      paperUrl: 'https://example.com/valid',
      source: 'manual',
    };
    expect((await request(app).post('/api/papers').send(paper)).status).toBe(201);
    const duplicateResponse = await request(app).post('/api/papers').send({
      ...paper,
      title: 'Another Paper',
    });
    expect(duplicateResponse.status).toBe(409);
    expect(duplicateResponse.body.error.code).toBe('DUPLICATE_PAPER');
  });

  it('validates list query parameters', async () => {
    const response = await request(app).get('/api/papers').query({
      conference: 'NeurIPS',
      page: 'zero',
    });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('INVALID_INPUT');
  });
});
