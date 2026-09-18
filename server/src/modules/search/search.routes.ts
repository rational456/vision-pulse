import { Router } from 'express';
import type { ApiFailure, ApiSuccess, ExternalPaperSearchResult } from '@hotwords/shared';
import {
  ExternalPaperSearchService,
  ExternalSearchUnavailableError,
} from './external-paper-search.service.js';
import { PaperSearchService, type PaperSearchResult } from './paper-search.service.js';

function readTitle(value: unknown): string {
  const title = typeof value === 'string' ? value.trim() : '';
  if (title.length < 3 || title.length > 300) return '';
  return title;
}

export function createSearchRouter(
  service: ExternalPaperSearchService,
  localFirstService?: PaperSearchService,
): Router {
  const router = Router();

  router.get('/', async (request, response) => {
    const title = readTitle(request.query.title);
    if (!title) {
      response.status(400).json({
        success: false,
        error: {
          code: 'INVALID_PAPER_TITLE',
          message: '论文题目长度必须在 3 到 300 个字符之间',
          details: null,
        },
      } satisfies ApiFailure);
      return;
    }
    if (!localFirstService) throw new Error('Local-first paper search is not configured');

    try {
      const result = await localFirstService.searchByTitle(title);
      const payload: ApiSuccess<PaperSearchResult> = {
        success: true,
        data: result,
        message: result.items.length > 0 ? '查询完成' : '未找到匹配论文',
      };
      response.json(payload);
    } catch (error) {
      if (error instanceof ExternalSearchUnavailableError) {
        response.status(503).json({
          success: false,
          error: {
            code: 'EXTERNAL_SEARCH_UNAVAILABLE',
            message: error.message,
            details: null,
          },
        } satisfies ApiFailure);
        return;
      }
      throw error;
    }
  });

  router.get('/external', async (request, response) => {
    const title = readTitle(request.query.title);

    if (!title) {
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
