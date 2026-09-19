import { Router } from 'express';
import type { ApiFailure, ApiSuccess, Conference } from '@hotwords/shared';
import { AnalysisService, type AnalysisFilters } from './analysis.service.js';

class AnalysisQueryError extends Error {}

function integer(value: unknown, field: string, minimum: number, maximum: number): number | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'string' || !/^\d+$/.test(value)) {
    throw new AnalysisQueryError(`${field} 必须是整数`);
  }
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < minimum || parsed > maximum) {
    throw new AnalysisQueryError(`${field} 必须在 ${minimum} 到 ${maximum} 之间`);
  }
  return parsed;
}

function filters(query: Record<string, unknown>): AnalysisFilters {
  const result: AnalysisFilters = {};
  if (query.conference !== undefined) {
    if (typeof query.conference !== 'string' ||
      !['CVPR', 'ICCV', 'ECCV'].includes(query.conference)) {
      throw new AnalysisQueryError('conference 只能是 CVPR、ICCV 或 ECCV');
    }
    result.conference = query.conference as Conference;
  }
  const yearFrom = integer(query.yearFrom, 'yearFrom', 1900, 2100);
  const yearTo = integer(query.yearTo, 'yearTo', 1900, 2100);
  if (yearFrom !== undefined) result.yearFrom = yearFrom;
  if (yearTo !== undefined) result.yearTo = yearTo;
  if (yearFrom !== undefined && yearTo !== undefined && yearFrom > yearTo) {
    throw new AnalysisQueryError('yearFrom 不能大于 yearTo');
  }
  return result;
}

function success<T>(data: T): ApiSuccess<T> {
  return { success: true, data, message: '统计成功' };
}

export function createAnalysisRouter(service: AnalysisService): Router {
  const router = Router();

  router.get('/overview', (request, response) => {
    response.json(success(service.overview(filters(request.query))));
  });
  router.get('/top-keywords', (request, response) => {
    const limit = integer(request.query.limit, 'limit', 1, 100) ?? 10;
    response.json(success(service.topKeywords(filters(request.query), limit)));
  });
  router.get('/graph', (request, response) => {
    const nodeLimit = integer(request.query.nodeLimit, 'nodeLimit', 1, 100) ?? 30;
    const minCooccurrence = integer(request.query.minCooccurrence, 'minCooccurrence', 1, 1000) ?? 1;
    response.json(success(service.graph(filters(request.query), nodeLimit, minCooccurrence)));
  });
  router.get('/trends', (request, response) => {
    const keywordLimit = integer(request.query.keywordLimit, 'keywordLimit', 1, 50) ?? 10;
    response.json(success(service.trends(filters(request.query), keywordLimit)));
  });

  router.use((error: unknown, _request: unknown, response: { status: (code: number) => { json: (body: ApiFailure) => void } }, next: (error: unknown) => void) => {
    if (error instanceof AnalysisQueryError) {
      response.status(400).json({
        success: false,
        error: { code: 'INVALID_ANALYSIS_QUERY', message: error.message, details: null },
      });
      return;
    }
    next(error);
  });
  return router;
}
