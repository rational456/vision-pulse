import type { DatabaseSync } from 'node:sqlite';
import type {
  AnalysisOverview,
  Conference,
  KeywordGraph,
  KeywordStat,
  TrendFrame,
  TrendPoint,
} from '@hotwords/shared';
import { keywordsForPaper } from './keywords.js';

export interface AnalysisFilters {
  conference?: Conference;
  yearFrom?: number;
  yearTo?: number;
}

interface AnalysisPaper {
  title: string;
  abstract: string | null;
  keywords: string[];
  conference: Conference | null;
  year: number | null;
}

interface AnalysisRow {
  title: string;
  abstract: string | null;
  keywords: string;
  conference: Conference | null;
  year: number | null;
}

function compareStats(left: KeywordStat, right: KeywordStat): number {
  return right.paperCount - left.paperCount || left.keyword.localeCompare(right.keyword);
}

function countKeywords(papers: AnalysisPaper[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const paper of papers) {
    for (const keyword of keywordsForPaper(paper)) {
      counts.set(keyword, (counts.get(keyword) ?? 0) + 1);
    }
  }
  return counts;
}

function stat(keyword: string, paperCount: number, totalPapers: number): KeywordStat {
  return { keyword, paperCount, heat: totalPapers === 0 ? 0 : paperCount / totalPapers };
}

export class AnalysisService {
  constructor(private readonly database: DatabaseSync) {}

  private papers(filters: AnalysisFilters): AnalysisPaper[] {
    const clauses: string[] = [];
    const values: Array<string | number> = [];
    if (filters.conference) {
      clauses.push('conference = ?');
      values.push(filters.conference);
    }
    if (filters.yearFrom !== undefined) {
      clauses.push('year >= ?');
      values.push(filters.yearFrom);
    }
    if (filters.yearTo !== undefined) {
      clauses.push('year <= ?');
      values.push(filters.yearTo);
    }
    const where = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
    const rows = this.database.prepare(
      `SELECT title, abstract, keywords, conference, year FROM papers ${where}`,
    ).all(...values) as unknown as AnalysisRow[];
    return rows.map((row) => ({
      ...row,
      keywords: JSON.parse(row.keywords) as string[],
    }));
  }

  overview(filters: AnalysisFilters = {}): AnalysisOverview {
    const papers = this.papers(filters);
    return {
      totalPapers: papers.length,
      conferenceCounts: (['CVPR', 'ICCV', 'ECCV'] as const).map((conference) => ({
        conference,
        paperCount: papers.filter((paper) => paper.conference === conference).length,
      })),
      years: [...new Set(papers.map((paper) => paper.year)
        .filter((year): year is number => year !== null))].sort((a, b) => a - b),
    };
  }

  topKeywords(filters: AnalysisFilters = {}, limit = 10): {
    totalPapers: number;
    items: KeywordStat[];
  } {
    const papers = this.papers(filters);
    const items = [...countKeywords(papers)]
      .map(([keyword, count]) => stat(keyword, count, papers.length))
      .sort(compareStats)
      .slice(0, limit);
    return { totalPapers: papers.length, items };
  }

  graph(filters: AnalysisFilters = {}, nodeLimit = 30, minCooccurrence = 1): KeywordGraph {
    const papers = this.papers(filters);
    const nodes = [...countKeywords(papers)]
      .map(([keyword, count]) => stat(keyword, count, papers.length))
      .sort(compareStats)
      .slice(0, nodeLimit);
    const selected = new Set(nodes.map((node) => node.keyword));
    const edgeCounts = new Map<string, number>();

    for (const paper of papers) {
      const keywords = keywordsForPaper(paper).filter((keyword) => selected.has(keyword)).sort();
      for (let left = 0; left < keywords.length; left += 1) {
        for (let right = left + 1; right < keywords.length; right += 1) {
          const key = `${keywords[left]}\u0000${keywords[right]}`;
          edgeCounts.set(key, (edgeCounts.get(key) ?? 0) + 1);
        }
      }
    }

    const edges = [...edgeCounts]
      .filter(([, count]) => count >= minCooccurrence)
      .map(([key, cooccurrence]) => {
        const [source, target] = key.split('\u0000');
        return { source: source as string, target: target as string, cooccurrence };
      })
      .sort((left, right) => right.cooccurrence - left.cooccurrence ||
        left.source.localeCompare(right.source) || left.target.localeCompare(right.target));

    return { totalPapers: papers.length, nodes, edges };
  }

  trends(filters: AnalysisFilters = {}, keywordLimit = 10): {
    keywords: string[];
    points: TrendPoint[];
    frames: TrendFrame[];
  } {
    const papers = this.papers(filters);
    const keywords = [...countKeywords(papers)]
      .map(([keyword, count]) => stat(keyword, count, papers.length))
      .sort(compareStats)
      .slice(0, keywordLimit)
      .map((item) => item.keyword);
    const selected = new Set(keywords);
    const groups = new Map<string, AnalysisPaper[]>();

    for (const paper of papers) {
      if (paper.conference === null || paper.year === null) continue;
      const key = `${paper.conference}:${paper.year}`;
      const group = groups.get(key) ?? [];
      group.push(paper);
      groups.set(key, group);
    }

    const points: TrendPoint[] = [];
    const frames: TrendFrame[] = [];
    for (const [key, group] of groups) {
      const [conference, yearString] = key.split(':');
      const counts = countKeywords(group);
      frames.push({
        conference: conference as Conference,
        year: Number(yearString),
        totalPapers: group.length,
        ranking: [...counts]
          .map(([keyword, count]) => stat(keyword, count, group.length))
          .sort(compareStats)
          .slice(0, keywordLimit),
      });
      for (const keyword of keywords) {
        if (!selected.has(keyword)) continue;
        const paperCount = counts.get(keyword) ?? 0;
        points.push({
          conference: conference as Conference,
          year: Number(yearString),
          keyword,
          paperCount,
          totalPapers: group.length,
          heat: paperCount / group.length,
        });
      }
    }

    points.sort((left, right) => left.year - right.year ||
      left.conference.localeCompare(right.conference) ||
      keywords.indexOf(left.keyword) - keywords.indexOf(right.keyword));
    frames.sort((left, right) => left.year - right.year ||
      left.conference.localeCompare(right.conference));
    return { keywords, points, frames };
  }
}
