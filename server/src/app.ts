import express from 'express';
import type { ErrorRequestHandler } from 'express';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import type { ApiFailure, ApiSuccess, HealthStatus } from '@hotwords/shared';
import { DblpClient } from './integrations/dblp/dblp.client.js';
import { OpenAlexClient } from './integrations/openalex/openalex.client.js';
import { ExternalPaperSearchService } from './modules/search/external-paper-search.service.js';
import { createSearchRouter } from './modules/search/search.routes.js';
import { PaperRepository } from './modules/paper/paper.repository.js';
import { createPaperRouter } from './modules/paper/paper.routes.js';
import { PaperService } from './modules/paper/paper.service.js';
import { PaperSearchService } from './modules/search/paper-search.service.js';
import { AnalysisService } from './modules/analysis/analysis.service.js';
import { createAnalysisRouter } from './modules/analysis/analysis.routes.js';
import { CsvImportService } from './modules/import/csv-import.service.js';
import { createImportRouter } from './modules/import/import.routes.js';

interface AppDependencies {
  paperRepository: PaperRepository;
  analysisService?: AnalysisService;
  csvImportService?: CsvImportService;
  externalPaperSearch?: ExternalPaperSearchService;
  webDistPath?: string;
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
  if (dependencies.analysisService) {
    app.use('/api/analysis', createAnalysisRouter(dependencies.analysisService));
  }
  if (dependencies.csvImportService) {
    app.use('/api/imports', express.text({ type: 'text/csv', limit: '1mb' }),
      createImportRouter(dependencies.csvImportService));
  }

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

  app.use('/api', (_request, response) => {
    const payload: ApiFailure = {
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: '接口不存在',
        details: null,
      },
    };

    response.status(404).json(payload);
  });

  const indexPath = dependencies.webDistPath
    ? join(dependencies.webDistPath, 'index.html')
    : undefined;
  if (dependencies.webDistPath && indexPath && existsSync(indexPath)) {
    app.use(express.static(dependencies.webDistPath));
    app.use((request, response, next) => {
      if (request.method !== 'GET' || !request.accepts('html')) {
        next();
        return;
      }

      response.sendFile(indexPath);
    });
  }

  const errorHandler: ErrorRequestHandler = (error: unknown, _request, response, _next) => {
    const status = typeof error === 'object' && error !== null && 'status' in error
      ? Number(error.status) : 500;
    let code = 'INTERNAL_ERROR';
    let message = '服务器暂时无法处理请求';
    let responseStatus = 500;
    if (status === 413) {
      code = 'PAYLOAD_TOO_LARGE';
      message = '请求内容超过 1 MB 限制';
      responseStatus = 413;
    } else if (status === 400) {
      code = 'INVALID_REQUEST_BODY';
      message = '请求内容格式不正确';
      responseStatus = 400;
    } else {
      console.error('Unhandled API error:', error);
    }
    const payload: ApiFailure = {
      success: false,
      error: { code, message, details: null },
    };
    response.status(responseStatus).json(payload);
  };
  app.use(errorHandler);

  return app;
}
