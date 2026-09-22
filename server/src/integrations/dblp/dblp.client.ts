import { fetchJson, type FetchLike } from '../http/fetch-json.js';
import type { BibliographyPaper, BibliographyProvider } from '../../modules/search/external-paper-search.service.js';

interface DblpHit {
  info?: Record<string, unknown>;
}

function readText(value: unknown): string | null {
  if (typeof value === 'string') {
    return value;
  }

  if (value && typeof value === 'object' && 'text' in value) {
    const text = (value as { text?: unknown }).text;
    return typeof text === 'string' ? text : null;
  }

  return null;
}

function readAuthors(value: unknown): string[] {
  if (!value || typeof value !== 'object' || !('author' in value)) {
    return [];
  }

  const authors = (value as { author?: unknown }).author;
  const authorList = Array.isArray(authors) ? authors : [authors];
  return authorList.map(readText).filter((author): author is string => Boolean(author));
}

function readFirstText(value: unknown): string | null {
  const firstValue = Array.isArray(value) ? value[0] : value;
  return readText(firstValue);
}

function cleanTitle(title: string): string {
  return title
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function parseHit(hit: DblpHit): BibliographyPaper | null {
  const info = hit.info;
  const title = cleanTitle(readText(info?.title) ?? '');

  if (!title) {
    return null;
  }

  const externalId = readText(info?.key) ?? readText(info?.url) ?? title;
  const yearText = readText(info?.year);
  const year = yearText && /^\d{4}$/.test(yearText) ? Number.parseInt(yearText, 10) : null;
  const doi = readText(info?.doi);
  const electronicEdition = readFirstText(info?.ee);
  const recordUrl = readText(info?.url);

  return {
    externalId,
    title,
    authors: readAuthors(info?.authors),
    venue: readText(info?.venue) ?? readText(info?.booktitle),
    year,
    paperUrl: electronicEdition ?? recordUrl ?? `https://dblp.org/rec/${externalId}`,
    doi,
  };
}

function getHits(payload: unknown): DblpHit[] {
  if (!payload || typeof payload !== 'object') {
    return [];
  }

  const result = (payload as { result?: unknown }).result;
  if (!result || typeof result !== 'object') {
    return [];
  }

  const hitsContainer = (result as { hits?: unknown }).hits;
  if (!hitsContainer || typeof hitsContainer !== 'object') {
    return [];
  }

  const hits = (hitsContainer as { hit?: unknown }).hit;
  if (!hits) {
    return [];
  }

  return Array.isArray(hits) ? (hits as DblpHit[]) : [hits as DblpHit];
}

export class DblpClient implements BibliographyProvider {
  constructor(
    private readonly fetchImplementation: FetchLike = fetch,
    private readonly timeoutMs = 8_000,
  ) {}

  async searchByTitle(title: string): Promise<BibliographyPaper[]> {
    const url = new URL('https://dblp.org/search/publ/api');
    url.searchParams.set('q', title);
    url.searchParams.set('format', 'json');
    url.searchParams.set('h', '10');
    url.searchParams.set('c', '0');

    const payload = await fetchJson(
      'DBLP',
      url,
      {
        signal: AbortSignal.timeout(this.timeoutMs),
        headers: {
          Accept: 'application/json',
          'User-Agent': 'top-conference-hotwords/0.1 (academic course project)',
        },
      },
      this.fetchImplementation,
    );

    return getHits(payload).map(parseHit).filter((paper): paper is BibliographyPaper => paper !== null);
  }
}
