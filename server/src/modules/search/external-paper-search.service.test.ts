import { describe, expect, it } from 'vitest';
import {
  ExternalPaperSearchService,
  ExternalSearchUnavailableError,
  type BibliographyProvider,
  type ContentProvider,
} from './external-paper-search.service.js';

const dblpPaper = {
  externalId: 'conf/cvpr/Example24',
  title: 'Learning Visual Representations for Open Worlds',
  authors: ['Ada Chen', 'Bo Lin'],
  venue: 'CVPR',
  year: 2024,
  paperUrl: 'https://doi.org/10.1000/example',
  doi: '10.1000/example',
};

const openAlexPaper = {
  externalId: 'https://openalex.org/W123',
  title: 'Learning Visual Representations for Open Worlds',
  authors: ['Ada Chen', 'Bo Lin'],
  venue: 'CVPR',
  year: 2024,
  abstract: 'A representation learning method for open world object detection.',
  fieldsOfStudy: ['Computer Science'],
  paperUrl: 'https://openalex.org/W123',
  doi: '10.1000/example',
  source: 'openalex' as const,
};

describe('ExternalPaperSearchService', () => {
  it('merges DBLP bibliography with OpenAlex abstract data', async () => {
    const bibliography: BibliographyProvider = {
      searchByTitle: async () => [dblpPaper],
    };
    const content: ContentProvider = {
      searchByTitle: async () => [openAlexPaper],
    };
    const service = new ExternalPaperSearchService(bibliography, content);

    const result = await service.searchByTitle(dblpPaper.title);

    expect(result.warnings).toEqual([]);
    expect(result.items).toEqual([
      expect.objectContaining({
        externalId: 'conf/cvpr/Example24',
        abstract: openAlexPaper.abstract,
        conference: 'CVPR',
        year: 2024,
        paperUrl: 'https://doi.org/10.1000/example',
        source: 'dblp+openalex',
      }),
    ]);
  });

  it('keeps DBLP candidates when the abstract provider is unavailable', async () => {
    const bibliography: BibliographyProvider = {
      searchByTitle: async () => [dblpPaper],
    };
    const content: ContentProvider = {
      searchByTitle: async () => {
        throw new Error('rate limited');
      },
    };
    const service = new ExternalPaperSearchService(bibliography, content);

    const result = await service.searchByTitle(dblpPaper.title);

    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toEqual(
      expect.objectContaining({
        abstract: null,
        source: 'dblp',
      }),
    );
    expect(result.warnings).toContain('摘要数据源暂时不可用，当前仅返回书目信息');
  });

  it('uses OpenAlex candidates when DBLP is unavailable', async () => {
    const bibliography: BibliographyProvider = {
      searchByTitle: async () => {
        throw new Error('timeout');
      },
    };
    const content: ContentProvider = {
      searchByTitle: async () => [openAlexPaper],
    };
    const service = new ExternalPaperSearchService(bibliography, content);

    const result = await service.searchByTitle(openAlexPaper.title);

    expect(result.items[0]).toEqual(
      expect.objectContaining({
        externalId: 'https://openalex.org/W123',
        abstract: openAlexPaper.abstract,
        source: 'openalex',
      }),
    );
    expect(result.warnings).toContain('DBLP 暂时不可用，当前结果未经过书目信息校对');
  });

  it('fails only when both external providers are unavailable', async () => {
    const bibliography: BibliographyProvider = {
      searchByTitle: async () => {
        throw new Error('timeout');
      },
    };
    const content: ContentProvider = {
      searchByTitle: async () => {
        throw new Error('rate limited');
      },
    };
    const service = new ExternalPaperSearchService(bibliography, content);

    await expect(service.searchByTitle('some paper')).rejects.toBeInstanceOf(
      ExternalSearchUnavailableError,
    );
  });
});
