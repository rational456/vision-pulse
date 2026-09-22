import type {
  AnalysisOverview,
  Conference,
  ExternalPaperCandidate,
  KeywordGraph,
  KeywordStat,
  TrendFrame,
  TrendPoint,
} from '@hotwords/shared';

export type { AnalysisOverview, Conference, ExternalPaperCandidate, KeywordGraph, KeywordStat };

export type PaperSource = 'manual' | 'csv' | 'seed' | 'dblp' | 'openalex' | 'dblp+openalex';

export interface Paper {
  id: number;
  externalId: string | null;
  title: string;
  abstract: string | null;
  keywords: string[];
  authors: string[];
  conference: Conference | null;
  venue: string | null;
  year: number | null;
  paperUrl: string;
  doi: string | null;
  source: PaperSource;
  createdAt: string;
  updatedAt: string;
}

export interface PaperPage {
  items: Paper[];
  total: number;
  page: number;
  pageSize: number;
}

export interface PaperPayload {
  title: string;
  paperUrl: string;
  conference: Conference | null;
  year: number | null;
  authors: string[];
  keywords: string[];
  abstract: string | null;
  source: PaperSource;
  externalId?: string | null;
  venue?: string | null;
  doi?: string | null;
}

export interface TopKeywordsResult {
  totalPapers: number;
  items: KeywordStat[];
}

export interface TrendsResult {
  keywords: string[];
  points: TrendPoint[];
  frames: TrendFrame[];
}

export type PaperSearchResult =
  | { origin: 'local'; items: Paper[]; warnings: string[] }
  | { origin: 'external'; items: ExternalPaperCandidate[]; warnings: string[] };

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
