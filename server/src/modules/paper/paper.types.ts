import type { Conference, PaperSource } from '@hotwords/shared';

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
  source: PaperSource | 'manual' | 'csv' | 'seed';
  createdAt: string;
  updatedAt: string;
}

export interface CreatePaperInput {
  externalId?: string | null;
  title: string;
  abstract?: string | null;
  keywords?: string[];
  authors?: string[];
  conference?: Conference | null;
  venue?: string | null;
  year?: number | null;
  paperUrl: string;
  doi?: string | null;
  source: Paper['source'];
}

export type UpdatePaperInput = Partial<CreatePaperInput>;

export interface PaperFilters {
  idQuery?: string;
  exactTitle?: string;
  titleQuery?: string;
  keyword?: string;
  conference?: Conference;
  year?: number;
  page?: number;
  pageSize?: number;
}

export interface PaperPage {
  items: Paper[];
  total: number;
  page: number;
  pageSize: number;
}
