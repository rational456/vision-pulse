import type { ExternalPaperSearchResult } from '@hotwords/shared';
import { PaperRepository } from '../paper/paper.repository.js';
import type { Paper } from '../paper/paper.types.js';
import { ExternalPaperSearchService } from './external-paper-search.service.js';

export type PaperSearchResult =
  | { origin: 'local'; items: Paper[]; warnings: string[] }
  | ({ origin: 'external' } & ExternalPaperSearchResult);

export class PaperSearchService {
  constructor(
    private readonly paperRepository: PaperRepository,
    private readonly externalSearch: ExternalPaperSearchService,
  ) {}

  async searchByTitle(title: string): Promise<PaperSearchResult> {
    const local = this.paperRepository.list({ exactTitle: title, page: 1, pageSize: 100 });
    if (local.items.length > 0) {
      return { origin: 'local', items: local.items, warnings: [] };
    }

    return {
      origin: 'external',
      ...await this.externalSearch.searchByTitle(title),
    };
  }
}
