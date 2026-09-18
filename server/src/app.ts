import express from 'express';
import type { ApiSuccess, HealthStatus } from '@hotwords/shared';
import { DblpClient } from './integrations/dblp/dblp.client.js';
import { OpenAlexClient } from './integrations/openalex/openalex.client.js';
import { ExternalPaperSearchService } from './modules/search/external-paper-search.service.js';
import { createSearchRouter } from './modules/search/search.routes.js';

export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.use(express.json({ limit: '1mb' }));

  const externalPaperSearch = new ExternalPaperSearchService(
    new DblpClient(),
    new OpenAlexClient(),
  );
  app.use('/api/search', createSearchRouter(externalPaperSearch));

  app.get('/api/health', (_request, response) => {
    const payload: ApiSuccess<HealthStatus> = {
      success: true,
      data: {
        status: 'ok',
        service: 'top-conference-hotwords-api',
        timestamp: new Date().toISOString(),
      },
      message: '服务运行正常',
    };

    response.json(payload);
  });

  return app;
}
