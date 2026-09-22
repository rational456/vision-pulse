import type { DatabaseSync } from 'node:sqlite';
import { PaperService } from '../paper/paper.service.js';
import { CsvFormatError, parseCsv } from './csv.parser.js';

const requiredColumns = ['title', 'conference', 'year', 'paperUrl'] as const;
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

export class CsvImportService {
  constructor(
    private readonly database: DatabaseSync,
    private readonly papers: PaperService,
  ) {}

  importText(fileName: string, csv: string): ImportResult {
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
    const failures: ImportFailure[] = [];
    let successCount = 0;

    for (const row of rows.slice(1)) {
      const raw = Object.fromEntries(headers.map((header, index) => [header, optional(row.cells[index])]));
      try {
        if (row.cells.length !== headers.length) throw new CsvImportError('列数与表头不一致');
        if (!raw.conference) throw new CsvImportError('conference 不能为空');
        if (!raw.year || !/^\d{4}$/.test(raw.year)) throw new CsvImportError('year 必须是四位年份');
        this.papers.create({
          ...raw,
          keywords: splitList(raw.keywords),
          authors: splitList(raw.authors),
          year: Number(raw.year),
          source: 'csv',
        });
        successCount += 1;
      } catch (error) {
        failures.push({
          line: row.line,
          title: raw.title ?? null,
          reason: error instanceof Error ? error.message : '未知错误',
        });
      }
    }

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
