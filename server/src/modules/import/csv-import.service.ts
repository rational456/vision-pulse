import type { DatabaseSync } from 'node:sqlite';
import type {
  Conference,
  ExternalPaperCandidate,
  ExternalPaperSearchResult,
} from '@hotwords/shared';
import { PaperService } from '../paper/paper.service.js';
import { CsvFormatError, parseCsv } from './csv.parser.js';

const requiredColumns = ['title'] as const;
const conferences = new Set<Conference>(['CVPR', 'ICCV', 'ECCV']);
const allowedColumns = new Set([
  'externalId', 'title', 'abstract', 'keywords', 'authors',
  'conference', 'venue', 'year', 'paperUrl', 'doi',
]);

export interface ImportFailure {
  line: number;
  title: string | null;
  reason: string;
}

export interface ImportResult {
  id: number;
  fileName: string;
  status: 'completed';
  totalCount: number;
  successCount: number;
  failureCount: number;
  failures: ImportFailure[];
}

export interface PaperMetadataSearch {
  searchByTitle(title: string): Promise<ExternalPaperSearchResult>;
}

export class CsvImportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CsvImportError';
  }
}

function optional(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed || undefined;
}

function splitList(value: string | undefined): string[] {
  return value?.split('|').map((item) => item.trim()).filter(Boolean) ?? [];
}

function normalizeTitle(value: string): string {
  return value
    .normalize('NFKC')
    .toLocaleLowerCase('en-US')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

function parsedYear(value: string | undefined): number | undefined {
  if (value === undefined) return undefined;
  if (!/^\d{4}$/.test(value)) throw new CsvImportError('year 必须是四位年份');
  const year = Number(value);
  if (year < 1900 || year > 2100) {
    throw new CsvImportError('year 必须是 1900 到 2100 之间的年份');
  }
  return year;
}

function selectCandidate(
  items: ExternalPaperCandidate[],
  title: string,
  conference: string | undefined,
  year: number | undefined,
): ExternalPaperCandidate {
  let matches = items.filter((item) => normalizeTitle(item.title) === normalizeTitle(title));
  if (conference) matches = matches.filter((item) => item.conference === conference);
  if (year !== undefined) matches = matches.filter((item) => item.year === year);

  if (matches.length === 0) {
    throw new CsvImportError('外部数据源未找到标题、会议和年份完全匹配的论文');
  }
  if (matches.length > 1) {
    throw new CsvImportError('外部数据源返回多个完全匹配的候选，请补充会议或年份后重试');
  }
  return matches[0] as ExternalPaperCandidate;
}

export class CsvImportService {
  constructor(
    private readonly database: DatabaseSync,
    private readonly papers: PaperService,
    private readonly metadataSearch?: PaperMetadataSearch,
  ) {}

  private async paperInput(raw: Record<string, string | undefined>): Promise<Record<string, unknown>> {
    const title = raw.title?.trim();
    if (!title) throw new CsvImportError('title 不能为空');
    const year = parsedYear(raw.year);
    if (raw.conference && !conferences.has(raw.conference as Conference)) {
      throw new CsvImportError('conference 只能是 CVPR、ICCV 或 ECCV');
    }

    if (raw.paperUrl) {
      return {
        ...raw,
        title,
        keywords: splitList(raw.keywords),
        authors: splitList(raw.authors),
        year,
        source: 'csv',
      };
    }

    if (!this.metadataSearch) {
      throw new CsvImportError('paperUrl 缺失，且当前未配置外部论文检索服务');
    }

    const result = await this.metadataSearch.searchByTitle(title);
    const candidate = selectCandidate(result.items, title, raw.conference, year);
    return {
      ...candidate,
      externalId: raw.externalId ?? candidate.externalId,
      title,
      abstract: raw.abstract ?? candidate.abstract,
      keywords: raw.keywords === undefined ? candidate.keywords : splitList(raw.keywords),
      authors: raw.authors === undefined ? candidate.authors : splitList(raw.authors),
      conference: (raw.conference as Conference | undefined) ?? candidate.conference,
      venue: raw.venue ?? candidate.venue,
      year: year ?? candidate.year,
      paperUrl: candidate.paperUrl,
      doi: raw.doi ?? candidate.doi,
      source: candidate.source,
    };
  }

  async importText(fileName: string, csv: string): Promise<ImportResult> {
    if (Buffer.byteLength(csv, 'utf8') > 1_000_000) {
      throw new CsvImportError('CSV 文件不能超过 1 MB');
    }
    let rows;
    try {
      rows = parseCsv(csv);
    } catch (error) {
      if (error instanceof CsvFormatError) throw new CsvImportError(error.message);
      throw error;
    }
    if (rows.length < 2) throw new CsvImportError('CSV 文件没有可导入的数据行');
    if (rows.length > 501) throw new CsvImportError('单次最多导入 500 篇论文');

    const headers = rows[0]?.cells.map((cell) => cell.trim()) ?? [];
    if (new Set(headers).size !== headers.length || headers.some((header) => !allowedColumns.has(header))) {
      throw new CsvImportError('CSV 表头包含重复或不支持的列');
    }
    const missing = requiredColumns.filter((column) => !headers.includes(column));
    if (missing.length > 0) throw new CsvImportError(`CSV 缺少必填列：${missing.join('、')}`);

    const insertTask = this.database.prepare(`
      INSERT INTO import_tasks (file_name, status, total_count)
      VALUES (?, 'running', ?)
    `).run(fileName, rows.length - 1);
    const id = Number(insertTask.lastInsertRowid);
    const dataRows = rows.slice(1);
    const outcomes: Array<ImportFailure | null> = new Array(dataRows.length).fill(null);
    let nextIndex = 0;

    const worker = async (): Promise<void> => {
      while (nextIndex < dataRows.length) {
        const index = nextIndex;
        nextIndex += 1;
        const row = dataRows[index];
        if (!row) continue;
        const raw = Object.fromEntries(
          headers.map((header, cellIndex) => [header, optional(row.cells[cellIndex])]),
        );
        try {
          if (row.cells.length !== headers.length) throw new CsvImportError('列数与表头不一致');
          this.papers.create(await this.paperInput(raw));
        } catch (error) {
          outcomes[index] = {
            line: row.line,
            title: raw.title ?? null,
            reason: error instanceof Error ? error.message : '未知错误',
          };
        }
      }
    };

    const concurrency = Math.min(3, dataRows.length);
    await Promise.all(Array.from({ length: concurrency }, () => worker()));
    const failures = outcomes.filter((outcome): outcome is ImportFailure => outcome !== null);
    const successCount = dataRows.length - failures.length;

    this.database.prepare(`
      UPDATE import_tasks SET status = 'completed', success_count = ?,
        failure_count = ?, error_report = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(successCount, failures.length, JSON.stringify(failures), id);

    return {
      id,
      fileName,
      status: 'completed',
      totalCount: rows.length - 1,
      successCount,
      failureCount: failures.length,
      failures,
    };
  }

  getById(id: number): ImportResult | null {
    const row = this.database.prepare(`
      SELECT id, file_name, status, total_count, success_count, failure_count, error_report
      FROM import_tasks WHERE id = ?
    `).get(id) as {
      id: number;
      file_name: string;
      status: 'completed';
      total_count: number;
      success_count: number;
      failure_count: number;
      error_report: string | null;
    } | undefined;
    if (!row) return null;
    return {
      id: row.id,
      fileName: row.file_name,
      status: row.status,
      totalCount: row.total_count,
      successCount: row.success_count,
      failureCount: row.failure_count,
      failures: row.error_report ? JSON.parse(row.error_report) as ImportFailure[] : [],
    };
  }
}
