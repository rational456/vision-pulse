import { Router } from 'express';
import type { ApiFailure, ApiSuccess, Conference } from '@hotwords/shared';
import {
  DuplicatePaperError,
  PaperNotFoundError,
  PaperService,
  PaperValidationError,
} from './paper.service.js';
import type { Paper, PaperFilters, PaperPage } from './paper.types.js';

function failure(code: string, message: string, details: unknown = null): ApiFailure {
  return { success: false, error: { code, message, details } };
}

function parseId(value: string): number {
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id < 1) throw new PaperValidationError('论文 id 必须是正整数');
  return id;
}

function optionalQuery(value: unknown, maximum: number): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'string' || !value.trim() || value.trim().length > maximum) {
    throw new PaperValidationError(`查询条件长度必须在 1 到 ${maximum} 个字符之间`);
  }
  return value.trim();
}

function positiveQueryInteger(value: unknown, field: string): number | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'string' || !/^\d+$/.test(value)) {
    throw new PaperValidationError(`${field} 必须是正整数`);
  }
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1) {
    throw new PaperValidationError(`${field} 必须是正整数`);
  }
  return parsed;
}

function parseFilters(query: Record<string, unknown>): PaperFilters {
  const conference = optionalQuery(query.conference, 10);
  if (conference && !['CVPR', 'ICCV', 'ECCV'].includes(conference)) {
    throw new PaperValidationError('conference 只能是 CVPR、ICCV 或 ECCV');
  }
  const year = positiveQueryInteger(query.year, 'year');
  if (year !== undefined && (year < 1900 || year > 2100)) {
    throw new PaperValidationError('year 必须在 1900 到 2100 之间');
  }

  const filters: PaperFilters = {};
  const idQuery = optionalQuery(query.id, 100);
  const exactTitle = optionalQuery(query.title, 500);
  const titleQuery = optionalQuery(query.q, 500);
  const keyword = optionalQuery(query.keyword, 200);
  const page = positiveQueryInteger(query.page, 'page');
  const pageSize = positiveQueryInteger(query.pageSize, 'pageSize');

  if (idQuery !== undefined) filters.idQuery = idQuery;
  if (exactTitle !== undefined) filters.exactTitle = exactTitle;
  if (titleQuery !== undefined) filters.titleQuery = titleQuery;
  if (keyword !== undefined) filters.keyword = keyword;
  if (conference !== undefined) filters.conference = conference as Conference;
  if (year !== undefined) filters.year = year;
  if (page !== undefined) filters.page = page;
  if (pageSize !== undefined) filters.pageSize = pageSize;
  return filters;
}

export function createPaperRouter(service: PaperService): Router {
  const router = Router();

  router.get('/', (request, response) => {
    const data = service.list(parseFilters(request.query));
    const payload: ApiSuccess<PaperPage> = { success: true, data, message: '查询成功' };
    response.json(payload);
  });

  router.get('/:id', (request, response) => {
    const data = service.getById(parseId(request.params.id));
    const payload: ApiSuccess<Paper> = { success: true, data, message: '查询成功' };
    response.json(payload);
  });

  router.get('/:id/related', (request, response) => {
    const id = parseId(request.params.id);
    const limit = request.query.limit === undefined ? 5 : Number(request.query.limit);
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > 20) {
      throw new PaperValidationError('limit 必须是 1 到 20 之间的整数');
    }
    const data = service.related(id, limit);
    const payload: ApiSuccess<Paper[]> = { success: true, data, message: '查询成功' };
    response.json(payload);
  });

  router.post('/', (request, response) => {
    const data = service.create(request.body);
    const payload: ApiSuccess<Paper> = { success: true, data, message: '论文创建成功' };
    response.status(201).json(payload);
  });

  router.patch('/:id', (request, response) => {
    const data = service.update(parseId(request.params.id), request.body);
    const payload: ApiSuccess<Paper> = { success: true, data, message: '论文更新成功' };
    response.json(payload);
  });

  router.delete('/:id', (request, response) => {
    service.delete(parseId(request.params.id));
    const payload: ApiSuccess<null> = { success: true, data: null, message: '论文删除成功' };
    response.json(payload);
  });

  router.use((error: unknown, _request: unknown, response: { status: (code: number) => { json: (body: ApiFailure) => void } }, next: (error: unknown) => void) => {
    if (error instanceof PaperValidationError) {
      response.status(400).json(failure('INVALID_INPUT', error.message, error.details));
      return;
    }
    if (error instanceof PaperNotFoundError) {
      response.status(404).json(failure('PAPER_NOT_FOUND', error.message));
      return;
    }
    if (error instanceof DuplicatePaperError) {
      response.status(409).json(failure('DUPLICATE_PAPER', error.message));
      return;
    }
    next(error);
  });

  return router;
}
