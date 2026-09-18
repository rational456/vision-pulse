import express from 'express';
import type { ApiSuccess, HealthStatus } from '@hotwords/shared';
import { DblpClient } from './integrations/dblp/dblp.client.js';
import { OpenAlexClient } from './integrations/openalex/openalex.client.js';
import { ExternalPaperSearchService } from './modules/search/external-paper-search.service.js';
import { createSearchRouter } from './modules/search/search.routes.js';
import { PaperRepository } from './modules/paper/paper.repository.js';
import { createPaperRouter } from './modules/paper/paper.routes.js';
import { PaperService } from './modules/paper/paper.service.js';
import { PaperSearchService } from './modules/search/paper-search.service.js';

interface AppDependencies {
  paperRepository: PaperRepository;
  externalPaperSearch?: ExternalPaperSearchService;
}

export function createApp(dependencies: AppDependencies) {
  const app = express();

  app.disable('x-powered-by');
  app.use(express.json({ limit: '1mb' }));

  const externalPaperSearch = dependencies.externalPaperSearch ?? new ExternalPaperSearchService(
    new DblpClient(), new OpenAlexClient(),
  );
  app.use('/api/search', createSearchRouter(
    externalPaperSearch,
    new PaperSearchService(dependencies.paperRepository, externalPaperSearch),
  ));
  app.use('/api/papers', createPaperRouter(new PaperService(dependencies.paperRepository)));

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
