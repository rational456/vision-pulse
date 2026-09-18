import type {
  Conference,
  ExternalPaperCandidate,
  ExternalPaperSearchResult,
} from '@hotwords/shared';

export interface BibliographyPaper {
  externalId: string;
  title: string;
  authors: string[];
  venue: string | null;
  year: number | null;
  paperUrl: string;
  doi: string | null;
}

export interface ContentPaper extends BibliographyPaper {
  abstract: string | null;
  fieldsOfStudy: string[];
  source: 'openalex';
}

export interface BibliographyProvider {
  searchByTitle(title: string): Promise<BibliographyPaper[]>;
}

export interface ContentProvider {
  searchByTitle(title: string): Promise<ContentPaper[]>;
}

export class ExternalSearchUnavailableError extends Error {
  constructor(options?: ErrorOptions) {
    super('外部论文数据源暂时不可用', options);
    this.name = 'ExternalSearchUnavailableError';
  }
}

function normalizeTitle(title: string): string {
  return title
    .normalize('NFKC')
    .toLocaleLowerCase('en-US')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

function normalizeDoi(doi: string | null): string | null {
  return doi?.trim().toLocaleLowerCase('en-US') ?? null;
}

function detectConference(venue: string | null): Conference | null {
  const normalizedVenue = venue?.toLocaleUpperCase('en-US') ?? '';
  if (/\bCVPR\b/.test(normalizedVenue)) return 'CVPR';
  if (/\bICCV\b/.test(normalizedVenue)) return 'ICCV';
  if (/\bECCV\b/.test(normalizedVenue)) return 'ECCV';
  return null;
}

function uniqueKeywords(fields: string[]): string[] {
  return [...new Set(fields.map((field) => field.trim()).filter(Boolean))];
}

function matchContent(
  bibliography: BibliographyPaper,
  contentPapers: ContentPaper[],
): ContentPaper | undefined {
  const bibliographyDoi = normalizeDoi(bibliography.doi);
  return contentPapers.find((content) => {
    const sameDoi = bibliographyDoi && bibliographyDoi === normalizeDoi(content.doi);
    return sameDoi || normalizeTitle(content.title) === normalizeTitle(bibliography.title);
  });
}

function fromBibliography(
  bibliography: BibliographyPaper,
  content: ContentPaper | undefined,
): ExternalPaperCandidate {
  return {
    externalId: bibliography.externalId,
    title: bibliography.title,
    authors: bibliography.authors.length > 0 ? bibliography.authors : (content?.authors ?? []),
    conference: detectConference(bibliography.venue ?? content?.venue ?? null),
    venue: bibliography.venue ?? content?.venue ?? null,
    year: bibliography.year ?? content?.year ?? null,
    abstract: content?.abstract ?? null,
    keywords: uniqueKeywords(content?.fieldsOfStudy ?? []),
    paperUrl: bibliography.paperUrl || content?.paperUrl || '',
    doi: bibliography.doi ?? content?.doi ?? null,
    source: content ? `dblp+${content.source}` : 'dblp',
  };
}

function fromContent(content: ContentPaper): ExternalPaperCandidate {
  return {
    externalId: content.externalId,
    title: content.title,
    authors: content.authors,
    conference: detectConference(content.venue),
    venue: content.venue,
    year: content.year,
    abstract: content.abstract,
    keywords: uniqueKeywords(content.fieldsOfStudy),
    paperUrl: content.paperUrl,
    doi: content.doi,
    source: content.source,
  };
}

export class ExternalPaperSearchService {
  constructor(
    private readonly bibliographyProvider: BibliographyProvider,
    private readonly contentProvider: ContentProvider,
  ) {}

  async searchByTitle(title: string): Promise<ExternalPaperSearchResult> {
    const [bibliographyResult, contentResult] = await Promise.allSettled([
      this.bibliographyProvider.searchByTitle(title),
      this.contentProvider.searchByTitle(title),
    ]);

    if (bibliographyResult.status === 'rejected' && contentResult.status === 'rejected') {
      throw new ExternalSearchUnavailableError({
        cause: new AggregateError(
          [bibliographyResult.reason, contentResult.reason],
          'Both paper providers failed',
        ),
      });
    }

    const bibliographyPapers = bibliographyResult.status === 'fulfilled' ? bibliographyResult.value : [];
    const contentPapers = contentResult.status === 'fulfilled' ? contentResult.value : [];
    const usedContentIds = new Set<string>();

    const items = bibliographyPapers.map((bibliography) => {
      const content = matchContent(bibliography, contentPapers);
      if (content) usedContentIds.add(content.externalId);
      return fromBibliography(bibliography, content);
    });

    for (const content of contentPapers) {
      if (!usedContentIds.has(content.externalId)) {
        items.push(fromContent(content));
      }
    }

    const warnings: string[] = [];
    if (bibliographyResult.status === 'rejected') {
      warnings.push('DBLP 暂时不可用，当前结果未经过书目信息校对');
    }
    if (contentResult.status === 'rejected') {
      warnings.push('摘要数据源暂时不可用，当前仅返回书目信息');
    }

    return { items, warnings };
  }
}
