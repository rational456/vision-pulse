export interface ApiSuccess<T> {
  success: true;
  data: T;
  message: string;
}

export interface ApiFailure {
  success: false;
  error: {
    code: string;
    message: string;
    details: unknown;
  };
}

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

export interface HealthStatus {
  status: 'ok';
  service: 'top-conference-hotwords-api';
  timestamp: string;
}

export type Conference = 'CVPR' | 'ICCV' | 'ECCV';

export type PaperSource =
  | 'dblp'
  | 'openalex'
  | 'dblp+openalex';

export interface ExternalPaperCandidate {
  externalId: string;
  title: string;
  authors: string[];
  conference: Conference | null;
  venue: string | null;
  year: number | null;
  abstract: string | null;
  keywords: string[];
  paperUrl: string;
  doi: string | null;
  source: PaperSource;
}

export interface ExternalPaperSearchResult {
  items: ExternalPaperCandidate[];
  warnings: string[];
}

export interface KeywordStat {
  keyword: string;
  paperCount: number;
  heat: number;
}

export interface KeywordGraph {
  totalPapers: number;
  nodes: KeywordStat[];
  edges: Array<{ source: string; target: string; cooccurrence: number }>;
}

export interface TrendPoint {
  conference: Conference;
  year: number;
  keyword: string;
  paperCount: number;
  totalPapers: number;
  heat: number;
}

export interface TrendFrame {
  conference: Conference;
  year: number;
  totalPapers: number;
  ranking: KeywordStat[];
}

export interface AnalysisOverview {
  totalPapers: number;
  conferenceCounts: Array<{ conference: Conference; paperCount: number }>;
  years: number[];
}
