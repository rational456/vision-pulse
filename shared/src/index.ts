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
