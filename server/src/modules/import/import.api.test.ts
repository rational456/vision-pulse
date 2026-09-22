import type { DatabaseSync } from 'node:sqlite';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../app.js';
import { migrateDatabase, openDatabase } from '../../database/database.js';
import { PaperRepository } from '../paper/paper.repository.js';
import { PaperService } from '../paper/paper.service.js';
import { CsvImportService } from './csv-import.service.js';
import { parseCsv } from './csv.parser.js';

describe('CSV parsing', () => {
  it('handles BOM, quoted commas, escaped quotes and multiline fields', () => {
    expect(parseCsv('\uFEFFtitle,abstract\r\n"A, B","Line 1\nLine ""2"""')).toEqual([
      { line: 1, cells: ['title', 'abstract'] },
      { line: 2, cells: ['A, B', 'Line 1\nLine "2"'] },
    ]);
  });
});

describe('CSV import API', () => {
  let database: DatabaseSync;
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    database = openDatabase(':memory:');
    migrateDatabase(database);
    const repository = new PaperRepository(database);
    app = createApp({
      paperRepository: repository,
      csvImportService: new CsvImportService(database, new PaperService(repository)),
    });
  });

  afterEach(() => database.close());

  it('imports valid rows, reports invalid and duplicate rows, and persists the task', async () => {
    const csv = [
      'title,conference,year,paperUrl,keywords,abstract',
      'First Paper,CVPR,2024,https://example.com/first,Object Detection|Vision Transformer,First abstract',
      'Broken Year,ICCV,nope,https://example.com/broken,Image Segmentation,',
      'First Paper,CVPR,2024,https://example.com/first,Object Detection,',
    ].join('\n');

    const response = await request(app).post('/api/imports/csv')
      .set('Content-Type', 'text/csv')
      .set('X-File-Name', 'papers.csv')
      .send(csv);

    expect(response.status).toBe(201);
    expect(response.body.data).toEqual(expect.objectContaining({
      totalCount: 3, successCount: 1, failureCount: 2,
    }));
    expect(response.body.data.failures.map((item: { line: number }) => item.line)).toEqual([3, 4]);
    const id = response.body.data.id as number;
    const task = await request(app).get(`/api/imports/${id}`);
    expect(task.status).toBe(200);
    expect(task.body.data.failureCount).toBe(2);
    const papers = await request(app).get('/api/papers');
    expect(papers.body.data.total).toBe(1);
  });

  it('rejects missing columns, empty files and malformed CSV', async () => {
    for (const csv of [
      'title,year\nPaper,2024',
      'title,conference,year,paperUrl\n',
      'title,conference,year,paperUrl\n"Unclosed,CVPR,2024,https://example.com',
    ]) {
      const response = await request(app).post('/api/imports/csv')
        .set('Content-Type', 'text/csv').send(csv);
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('INVALID_CSV');
    }
  });

  it('reports a blank conference as a failed row', async () => {
    const response = await request(app).post('/api/imports/csv')
      .set('Content-Type', 'text/csv')
      .send('title,conference,year,paperUrl\nPaper A,,2024,https://example.com/a');
    expect(response.status).toBe(201);
    expect(response.body.data).toEqual(expect.objectContaining({
      successCount: 0, failureCount: 1,
    }));
  });

  it('returns JSON for oversized uploads', async () => {
    const response = await request(app).post('/api/imports/csv')
      .set('Content-Type', 'text/csv')
      .send('x'.repeat(1_100_000));
    expect(response.status).toBe(413);
    expect(response.body.error.code).toBe('PAYLOAD_TOO_LARGE');
  });
});
