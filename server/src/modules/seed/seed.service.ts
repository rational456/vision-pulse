import { DuplicatePaperError, PaperService } from '../paper/paper.service.js';
import type { SeedSnapshot } from './official-crawler.js';

export interface SeedResult {
  created: number;
  skippedExisting: number;
}

export function applySeedSnapshot(snapshot: SeedSnapshot, papers: PaperService): SeedResult {
  let created = 0;
  let skippedExisting = 0;
  for (const paper of snapshot.papers) {
    try {
      papers.create(paper);
      created += 1;
    } catch (error) {
      if (!(error instanceof DuplicatePaperError)) throw error;
      skippedExisting += 1;
    }
  }
  return { created, skippedExisting };
}
