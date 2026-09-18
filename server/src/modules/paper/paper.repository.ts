import type { DatabaseSync, SQLInputValue } from 'node:sqlite';
import type {
  CreatePaperInput,
  Paper,
  PaperFilters,
  PaperPage,
  UpdatePaperInput,
} from './paper.types.js';

interface PaperRow {
  id: number;
  external_id: string | null;
  title: string;
  abstract: string | null;
  keywords: string;
  authors: string;
  conference: Paper['conference'];
  venue: string | null;
  year: number | null;
  paper_url: string;
  doi: string | null;
  source: Paper['source'];
  created_at: string;
  updated_at: string;
}

function parseStringArray(value: string): string[] {
  const parsed: unknown = JSON.parse(value);
  return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
}

function mapPaper(row: PaperRow): Paper {
  return {
    id: row.id,
    externalId: row.external_id,
    title: row.title,
    abstract: row.abstract,
    keywords: parseStringArray(row.keywords),
    authors: parseStringArray(row.authors),
    conference: row.conference,
    venue: row.venue,
    year: row.year,
    paperUrl: row.paper_url,
    doi: row.doi,
    source: row.source,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function boundedPositiveInteger(value: number | undefined, fallback: number, maximum: number): number {
  if (!Number.isInteger(value) || (value ?? 0) < 1) return fallback;
  return Math.min(value as number, maximum);
}

export class PaperRepository {
  constructor(private readonly database: DatabaseSync) {}

  create(input: CreatePaperInput): Paper {
    const result = this.database.prepare(`
      INSERT INTO papers (
        external_id, title, abstract, keywords, authors, conference,
        venue, year, paper_url, doi, source
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      input.externalId ?? null,
      input.title,
      input.abstract ?? null,
      JSON.stringify(input.keywords ?? []),
      JSON.stringify(input.authors ?? []),
      input.conference ?? null,
      input.venue ?? null,
      input.year ?? null,
      input.paperUrl,
      input.doi ?? null,
      input.source,
    );

    return this.getById(Number(result.lastInsertRowid)) as Paper;
  }

  getById(id: number): Paper | null {
    const row = this.database.prepare('SELECT * FROM papers WHERE id = ?').get(id) as
      | PaperRow
      | undefined;
    return row ? mapPaper(row) : null;
  }

  update(id: number, input: UpdatePaperInput): Paper | null {
    const columnMap: Record<keyof CreatePaperInput, string> = {
      externalId: 'external_id',
      title: 'title',
      abstract: 'abstract',
      keywords: 'keywords',
      authors: 'authors',
      conference: 'conference',
      venue: 'venue',
      year: 'year',
      paperUrl: 'paper_url',
      doi: 'doi',
      source: 'source',
    };
    const assignments: string[] = [];
    const values: SQLInputValue[] = [];

    for (const key of Object.keys(columnMap) as Array<keyof CreatePaperInput>) {
      const value = input[key];
      if (value === undefined) continue;
      assignments.push(`${columnMap[key]} = ?`);
      if (key === 'keywords' || key === 'authors') {
        values.push(JSON.stringify(value));
      } else {
        values.push(value as SQLInputValue);
      }
    }

    if (assignments.length === 0) return this.getById(id);

    assignments.push('updated_at = CURRENT_TIMESTAMP');
    const result = this.database.prepare(
      `UPDATE papers SET ${assignments.join(', ')} WHERE id = ?`,
    ).run(...values, id);

    return Number(result.changes) === 0 ? null : this.getById(id);
  }

  delete(id: number): boolean {
    const result = this.database.prepare('DELETE FROM papers WHERE id = ?').run(id);
    return Number(result.changes) > 0;
  }

  list(filters: PaperFilters = {}): PaperPage {
    const clauses: string[] = [];
    const parameters: SQLInputValue[] = [];

    if (filters.idQuery?.trim()) {
      const pattern = `%${filters.idQuery.trim()}%`;
      clauses.push("(CAST(p.id AS TEXT) LIKE ? OR lower(coalesce(p.external_id, '')) LIKE lower(?))");
      parameters.push(pattern, pattern);
    }
    if (filters.exactTitle?.trim()) {
      clauses.push('lower(p.title) = lower(?)');
      parameters.push(filters.exactTitle.trim());
    }
    if (filters.titleQuery?.trim()) {
      clauses.push('lower(p.title) LIKE lower(?)');
      parameters.push(`%${filters.titleQuery.trim()}%`);
    }
    if (filters.keyword?.trim()) {
      clauses.push(`EXISTS (
        SELECT 1 FROM json_each(p.keywords) AS keyword
        WHERE lower(CAST(keyword.value AS TEXT)) LIKE lower(?)
      )`);
      parameters.push(`%${filters.keyword.trim()}%`);
    }
    if (filters.conference) {
      clauses.push('p.conference = ?');
      parameters.push(filters.conference);
    }
    if (filters.year !== undefined) {
      clauses.push('p.year = ?');
      parameters.push(filters.year);
    }

    const where = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
    const page = boundedPositiveInteger(filters.page, 1, Number.MAX_SAFE_INTEGER);
    const pageSize = boundedPositiveInteger(filters.pageSize, 20, 100);
    const totalRow = this.database.prepare(
      `SELECT count(*) AS total FROM papers AS p ${where}`,
    ).get(...parameters) as { total: number };
    const rows = this.database.prepare(`
      SELECT p.* FROM papers AS p
      ${where}
      ORDER BY coalesce(p.year, 0) DESC, p.title ASC
      LIMIT ? OFFSET ?
    `).all(...parameters, pageSize, (page - 1) * pageSize) as unknown as PaperRow[];

    return {
      items: rows.map(mapPaper),
      total: Number(totalRow.total),
      page,
      pageSize,
    };
  }
}
