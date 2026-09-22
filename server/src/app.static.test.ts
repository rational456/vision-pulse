import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { DatabaseSync } from 'node:sqlite';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from './app.js';
import { migrateDatabase, openDatabase } from './database/database.js';
import { PaperRepository } from './modules/paper/paper.repository.js';

describe('production web hosting', () => {
  let database: DatabaseSync;
  let webDistPath: string;

  beforeEach(() => {
    database = openDatabase(':memory:');
    migrateDatabase(database);
    webDistPath = mkdtempSync(join(tmpdir(), 'vision-pulse-web-'));
    mkdirSync(join(webDistPath, 'assets'));
    writeFileSync(
      join(webDistPath, 'index.html'),
      '<!doctype html><html><body>VISION_PULSE_TEST</body></html>',
      'utf8',
    );
    writeFileSync(join(webDistPath, 'assets', 'app.js'), 'window.APP_READY = true;', 'utf8');
  });

  afterEach(() => {
    database.close();
    rmSync(webDistPath, { recursive: true, force: true });
  });

  function appWithWeb() {
    return createApp({
      paperRepository: new PaperRepository(database),
      webDistPath,
    });
  }

  it('serves the built index and static assets', async () => {
    const app = appWithWeb();

    const index = await request(app).get('/');
    expect(index.status).toBe(200);
    expect(index.type).toBe('text/html');
    expect(index.text).toContain('VISION_PULSE_TEST');

    const asset = await request(app).get('/assets/app.js');
    expect(asset.status).toBe(200);
    expect(asset.type).toMatch(/javascript/);
    expect(asset.text).toContain('APP_READY');
  });

  it('falls back to index.html for Vue routes', async () => {
    const app = appWithWeb();
    const response = await request(app)
      .get('/papers/42')
      .set('Accept', 'text/html');

    expect(response.status).toBe(200);
    expect(response.type).toBe('text/html');
    expect(response.text).toContain('VISION_PULSE_TEST');
  });

  it('keeps unknown API routes as JSON 404 responses', async () => {
    const app = appWithWeb();
    const response = await request(app)
      .get('/api/does-not-exist')
      .set('Accept', 'text/html');

    expect(response.status).toBe(404);
    expect(response.type).toBe('application/json');
    expect(response.body.error.code).toBe('NOT_FOUND');
  });

  it('continues to support API-only mode without a web build', async () => {
    const app = createApp({ paperRepository: new PaperRepository(database) });
    const health = await request(app).get('/api/health');
    const page = await request(app).get('/');

    expect(health.status).toBe(200);
    expect(page.status).toBe(404);
    expect(page.text).not.toContain('VISION_PULSE_TEST');
  });
});
