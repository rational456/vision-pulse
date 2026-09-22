import { fetchJson, type FetchLike } from '../http/fetch-json.js';
import type { ContentPaper, ContentProvider } from '../../modules/search/external-paper-search.service.js';

interface OpenAlexTopic {
  display_name?: unknown;
}

interface OpenAlexAuthor {
  author?: {
    display_name?: unknown;
  } | null;
}

interface OpenAlexLocation {
  landing_page_url?: unknown;
  raw_source_name?: unknown;
  source?: {
    display_name?: unknown;
  } | null;
}

interface OpenAlexWork {
  id?: unknown;
  doi?: unknown;
  title?: unknown;
  display_name?: unknown;
  publication_year?: unknown;
  primary_location?: OpenAlexLocation | null;
  abstract_inverted_index?: unknown;
  topics?: unknown;
  authorships?: unknown;
}

function stringOrNull(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function normalizeDoi(value: unknown): string | null {
  const doi = stringOrNull(value);
  return doi?.replace(/^https?:\/\/(?:dx\.)?doi\.org\//i, '') ?? null;
}

function reconstructAbstract(value: unknown): string | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const positionedWords: Array<{ position: number; word: string }> = [];
  for (const [word, positions] of Object.entries(value)) {
    if (!Array.isArray(positions)) continue;
    for (const position of positions) {
      if (typeof position === 'number' && Number.isInteger(position) && position >= 0) {
        positionedWords.push({ position, word });
      }
    }
  }

  if (positionedWords.length === 0) {
    return null;
  }

  return positionedWords
    .sort((left, right) => left.position - right.position)
    .map(({ word }) => word)
    .join(' ');
}

function readTopics(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [
    ...new Set(
      value
        .map((topic) => stringOrNull((topic as OpenAlexTopic | null)?.display_name))
        .filter((topic): topic is string => topic !== null),
    ),
  ];
}

function readAuthors(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((authorship) =>
      stringOrNull((authorship as OpenAlexAuthor | null)?.author?.display_name),
    )
    .filter((author): author is string => author !== null);
}

function parseWork(value: unknown): ContentPaper | null {
  if (!value || typeof value !== 'object') return null;

  const work = value as OpenAlexWork;
  const idUrl = stringOrNull(work.id);
  const title = stringOrNull(work.title) ?? stringOrNull(work.display_name);
  if (!idUrl || !title) return null;

  const externalId = idUrl.split('/').at(-1) ?? idUrl;
  const location = work.primary_location;
  const venue =
    stringOrNull(location?.source?.display_name) ??
    stringOrNull(location?.raw_source_name);
  const doi = normalizeDoi(work.doi);
  const doiUrl = doi ? `https://doi.org/${doi}` : null;

  return {
    externalId,
    title,
    authors: readAuthors(work.authorships),
    venue,
    year:
      typeof work.publication_year === 'number' && Number.isInteger(work.publication_year)
        ? work.publication_year
        : null,
    abstract: reconstructAbstract(work.abstract_inverted_index),
    fieldsOfStudy: readTopics(work.topics),
    paperUrl: stringOrNull(location?.landing_page_url) ?? doiUrl ?? idUrl,
    doi,
    source: 'openalex',
  };
}

function getWorks(payload: unknown): ContentPaper[] {
  if (!payload || typeof payload !== 'object') return [];
  const results = (payload as { results?: unknown }).results;
  if (!Array.isArray(results)) return [];
  return results.map(parseWork).filter((paper): paper is ContentPaper => paper !== null);
}

function normalizeTitle(title: string): string {
  return title
    .normalize('NFKC')
    .toLocaleLowerCase('en-US')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

export class OpenAlexClient implements ContentProvider {
  constructor(
    private readonly fetchImplementation: FetchLike = fetch,
    private readonly timeoutMs = 10_000,
  ) {}

  async searchByTitle(title: string): Promise<ContentPaper[]> {
    const url = new URL('https://api.openalex.org/works');
    url.searchParams.set('search', title);
    url.searchParams.set('per-page', '10');
    url.searchParams.set(
      'select',
      'id,doi,title,display_name,publication_year,primary_location,abstract_inverted_index,topics,authorships',
    );

    const payload = await fetchJson(
      'OpenAlex',
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
    const normalizedQuery = normalizeTitle(title);

    return getWorks(payload).sort((left, right) => {
      const leftExact = normalizeTitle(left.title) === normalizedQuery ? 1 : 0;
      const rightExact = normalizeTitle(right.title) === normalizedQuery ? 1 : 0;
      return rightExact - leftExact;
    });
  }
}
