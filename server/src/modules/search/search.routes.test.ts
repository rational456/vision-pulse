import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import {
  ExternalPaperSearchService,
  type BibliographyProvider,
  type ContentProvider,
} from './external-paper-search.service.js';
import { createSearchRouter } from './search.routes.js';

function createTestApp(
  bibliographyProvider: BibliographyProvider,
  contentProvider: ContentProvider,
) {
  const app = express();
  const service = new ExternalPaperSearchService(bibliographyProvider, contentProvider);
  app.use('/api/search', createSearchRouter(service));
  return app;
}

describe('GET /api/search/external', () => {
  it('rejects missing or too-short titles', async () => {
    const provider = { searchByTitle: async () => [] };
    const app = createTestApp(provider, provider);

    const response = await request(app).get('/api/search/external').query({ title: 'AI' });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('INVALID_PAPER_TITLE');
  });

  it('returns 503 when both external providers fail', async () => {
    const provider = {
      searchByTitle: async () => {
        throw new Error('provider unavailable');
      },
    };
    const app = createTestApp(provider, provider);

    const response = await request(app)
      .get('/api/search/external')
      .query({ title: 'Learning Visual Representations' });

    expect(response.status).toBe(503);
    expect(response.body).toEqual({
      success: false,
      error: {
        code: 'EXTERNAL_SEARCH_UNAVAILABLE',
        message: '外部论文数据源暂时不可用',
        details: null,
      },
    });
  });
});
