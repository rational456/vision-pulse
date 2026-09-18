import { Router } from 'express';
import type { ApiFailure, ApiSuccess, ExternalPaperSearchResult } from '@hotwords/shared';
import {
  ExternalPaperSearchService,
  ExternalSearchUnavailableError,
} from './external-paper-search.service.js';

export function createSearchRouter(service: ExternalPaperSearchService): Router {
  const router = Router();

  router.get('/external', async (request, response) => {
    const title = typeof request.query.title === 'string' ? request.query.title.trim() : '';

    if (title.length < 3 || title.length > 300) {
      const payload: ApiFailure = {
        success: false,
        error: {
          code: 'INVALID_PAPER_TITLE',
          message: '论文题目长度必须在 3 到 300 个字符之间',
          details: null,
        },
      };
      response.status(400).json(payload);
      return;
    }

    try {
      const result = await service.searchByTitle(title);
      const payload: ApiSuccess<ExternalPaperSearchResult> = {
        success: true,
        data: result,
        message: result.items.length > 0 ? '查询完成' : '未找到匹配论文',
      };
      response.json(payload);
    } catch (error) {
      if (error instanceof ExternalSearchUnavailableError) {
        const payload: ApiFailure = {
          success: false,
          error: {
            code: 'EXTERNAL_SEARCH_UNAVAILABLE',
            message: error.message,
            details: null,
          },
        };
        response.status(503).json(payload);
        return;
      }

      throw error;
    }
  });

  return router;
}
