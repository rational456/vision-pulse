import type { Conference, PaperSource } from '@hotwords/shared';
import { PaperRepository } from './paper.repository.js';
import type {
  CreatePaperInput,
  Paper,
  PaperFilters,
  PaperPage,
  UpdatePaperInput,
} from './paper.types.js';

export class PaperValidationError extends Error {
  constructor(message: string, readonly details: unknown = null) {
    super(message);
    this.name = 'PaperValidationError';
  }
}

export class PaperNotFoundError extends Error {
  constructor() {
    super('论文不存在');
    this.name = 'PaperNotFoundError';
  }
}

export class DuplicatePaperError extends Error {
  constructor(options?: ErrorOptions) {
    super('该论文已经存在');
    this.name = 'DuplicatePaperError';
    if (options?.cause !== undefined) this.cause = options.cause;
  }
}

const conferences = new Set<Conference>(['CVPR', 'ICCV', 'ECCV']);
const sources = new Set<Paper['source']>([
  'dblp',
  'openalex',
  'dblp+openalex',
  'manual',
  'csv',
  'seed',
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function optionalString(
  value: unknown,
  field: string,
  maximum: number,
  nullable = true,
): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null && nullable) return null;
  if (typeof value !== 'string') throw new PaperValidationError(`${field} 必须是字符串`);
  const normalized = value.trim();
  if (!normalized || normalized.length > maximum) {
    throw new PaperValidationError(`${field} 长度必须在 1 到 ${maximum} 个字符之间`);
  }
  return normalized;
}

function stringArray(value: unknown, field: string): string[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value) || value.length > 100) {
    throw new PaperValidationError(`${field} 必须是最多包含 100 项的字符串数组`);
  }
  const normalized = value.map((item) => {
    if (typeof item !== 'string' || !item.trim() || item.trim().length > 200) {
      throw new PaperValidationError(`${field} 中包含无效内容`);
    }
    return item.trim();
  });
  return [...new Set(normalized)];
}

function conference(value: unknown): Conference | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== 'string' || !conferences.has(value as Conference)) {
    throw new PaperValidationError('conference 只能是 CVPR、ICCV 或 ECCV');
  }
  return value as Conference;
}

function year(value: unknown): number | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (!Number.isInteger(value) || (value as number) < 1900 || (value as number) > 2100) {
    throw new PaperValidationError('year 必须是 1900 到 2100 之间的整数');
  }
  return value as number;
}

function source(value: unknown, required: boolean): Paper['source'] | undefined {
  if (value === undefined && !required) return undefined;
  if (typeof value !== 'string' || !sources.has(value as Paper['source'])) {
    throw new PaperValidationError('source 不是允许的数据来源');
  }
  return value as PaperSource | 'manual' | 'csv' | 'seed';
}

function paperUrl(value: unknown, required: boolean): string | undefined {
  const normalized = optionalString(value, 'paperUrl', 2000, false);
  if (normalized === undefined && !required) return undefined;
  if (normalized === undefined || normalized === null) {
    throw new PaperValidationError('paperUrl 不能为空');
  }
  try {
    const parsed = new URL(normalized);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') throw new Error();
  } catch {
    throw new PaperValidationError('paperUrl 必须是有效的 HTTP 或 HTTPS 地址');
  }
  return normalized;
}

function normalizeInput(value: unknown, partial: false): CreatePaperInput;
function normalizeInput(value: unknown, partial: true): UpdatePaperInput;
function normalizeInput(value: unknown, partial: boolean): CreatePaperInput | UpdatePaperInput {
  if (!isRecord(value)) throw new PaperValidationError('请求体必须是 JSON 对象');

  const title = optionalString(value.title, 'title', 500, false);
  if (!partial && title === undefined) throw new PaperValidationError('title 不能为空');

  return {
    externalId: optionalString(value.externalId, 'externalId', 500),
    title: title as string | undefined,
    abstract: optionalString(value.abstract, 'abstract', 100_000),
    keywords: stringArray(value.keywords, 'keywords'),
    authors: stringArray(value.authors, 'authors'),
    conference: conference(value.conference),
    venue: optionalString(value.venue, 'venue', 500),
    year: year(value.year),
    paperUrl: paperUrl(value.paperUrl, !partial),
    doi: optionalString(value.doi, 'doi', 500),
    source: source(value.source, !partial),
  } as CreatePaperInput | UpdatePaperInput;
}

function isUniqueConstraintError(error: unknown): boolean {
  return error instanceof Error && error.message.includes('UNIQUE constraint failed');
}

export class PaperService {
  constructor(private readonly repository: PaperRepository) {}

  create(value: unknown): Paper {
    try {
      return this.repository.create(normalizeInput(value, false));
    } catch (error) {
      if (isUniqueConstraintError(error)) throw new DuplicatePaperError({ cause: error });
      throw error;
    }
  }

  getById(id: number): Paper {
    const paper = this.repository.getById(id);
    if (!paper) throw new PaperNotFoundError();
    return paper;
  }

  update(id: number, value: unknown): Paper {
    if (!isRecord(value) || Object.keys(value).length === 0) {
      throw new PaperValidationError('至少提供一个需要更新的字段');
    }
    try {
      const paper = this.repository.update(id, normalizeInput(value, true));
      if (!paper) throw new PaperNotFoundError();
      return paper;
    } catch (error) {
      if (isUniqueConstraintError(error)) throw new DuplicatePaperError({ cause: error });
      throw error;
    }
  }

  delete(id: number): void {
    if (!this.repository.delete(id)) throw new PaperNotFoundError();
  }

  list(filters: PaperFilters): PaperPage {
    return this.repository.list(filters);
  }
}
