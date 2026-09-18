import express from 'express';
import type { ApiSuccess, HealthStatus } from '@hotwords/shared';

export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.use(express.json({ limit: '1mb' }));

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
