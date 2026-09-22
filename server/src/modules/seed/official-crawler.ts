import type { Conference } from '@hotwords/shared';
import type { CreatePaperInput } from '../paper/paper.types.js';

export interface SeedGroup {
  conference: Conference;
  year: number;
}

export const seedGroups: SeedGroup[] = [
  { conference: 'CVPR', year: 2023 },
  { conference: 'CVPR', year: 2024 },
  { conference: 'ICCV', year: 2023 },
  { conference: 'ICCV', year: 2025 },
  { conference: 'ECCV', year: 2022 },
  { conference: 'ECCV', year: 2024 },
];

export interface SeedSnapshot {
  collectedAt: string;
  description: string;
  sources: Array<{ conference: Conference; year: number; indexUrl: string }>;
  papers: CreatePaperInput[];
}

function decodeHtml(value: string): string {
  const entities: Record<string, string> = {
    amp: '&', quot: '"', apos: "'", lt: '<', gt: '>', nbsp: ' ',
    ndash: '–', mdash: '—', rsquo: '’', lsquo: '‘', ldquo: '“', rdquo: '”',
  };
  return value.replace(/&(#(?:x[\da-f]+|\d+)|[a-z]+);/gi, (match, entity: string) => {
    if (entity.startsWith('#')) {
      const hexadecimal = entity[1]?.toLowerCase() === 'x';
      const code = Number.parseInt(entity.slice(hexadecimal ? 2 : 1), hexadecimal ? 16 : 10);
      return Number.isInteger(code) && code > 0 && code <= 0x10ffff
        ? String.fromCodePoint(code) : match;
    }
    return entities[entity.toLowerCase()] ?? match;
  });
}

function plainText(html: string): string {
  return decodeHtml(html.replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();
}

function links(html: string, group: SeedGroup): string[] {
  const prefix = group.conference === 'ECCV'
    ? `papers/eccv_${group.year}/papers_ECCV/html/`
    : `/content/${group.conference}${group.year}/html/`;
  const escaped = prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const expression = new RegExp(`href=["']?(${escaped}[^"'\\s>]+\\.(?:html|php))`, 'gi');
  const base = group.conference === 'ECCV'
    ? 'https://www.ecva.net/'
    : 'https://openaccess.thecvf.com/';
  return [...new Set([...html.matchAll(expression)].map((match) =>
    new URL(match[1] as string, base).toString()))];
}

function evenlySample<T>(items: T[], count: number): T[] {
  const size = Math.min(items.length, count);
  return Array.from({ length: size }, (_, index) =>
    items[Math.floor((index + 0.5) * items.length / size)] as T);
}

export function parseOfficialDetail(html: string, url: string, group: SeedGroup): CreatePaperInput | null {
  const title = plainText(html.match(/<div id="papertitle">([\s\S]*?)<\/div>/i)?.[1] ?? '');
  const authorHtml = html.match(/<div id="authors">([\s\S]*?)<\/div>/i)?.[1] ?? '';
  const authorText = plainText(authorHtml.match(/<i>([\s\S]*?)<\/i>/i)?.[1] ?? '');
  const abstract = plainText(html.match(/<div id="abstract">([\s\S]*?)<\/div>/i)?.[1] ?? '')
    .replace(/^"|"$/g, '');
  if (!title || abstract.length < 40) return null;

  return {
    externalId: url,
    title,
    abstract,
    authors: authorText.split(',').map((author) => author.replace(/\*/g, '').trim()).filter(Boolean),
    keywords: [],
    conference: group.conference,
    venue: group.conference,
    year: group.year,
    paperUrl: url,
    source: 'seed',
  };
}

export class OfficialConferenceCrawler {
  constructor(private readonly fetchImplementation: typeof fetch = fetch) {}

  async html(url: string): Promise<string> {
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      try {
        const response = await this.fetchImplementation(url, {
          headers: { 'User-Agent': 'TopConferenceHotwordsCourseProject/1.0 (public metadata sample)' },
          signal: AbortSignal.timeout(20_000),
        });
        if (!response.ok) throw new Error(`公开页面请求失败：${response.status} ${url}`);
        return await response.text();
      } catch (error) {
        const transient = error instanceof TypeError ||
          (error instanceof Error && error.name === 'TimeoutError');
        if (!transient || attempt === 3) throw error;
        await new Promise((resolve) => setTimeout(resolve, attempt * 1_000));
      }
    }
    throw new Error(`无法获取公开页面：${url}`);
  }

  async collect(perGroup = 10): Promise<SeedSnapshot> {
    const eccvIndex = await this.html('https://www.ecva.net/papers.php');
    const papers: CreatePaperInput[] = [];
    const sources: SeedSnapshot['sources'] = [];

    for (const group of seedGroups) {
      const indexUrl = group.conference === 'ECCV'
        ? 'https://www.ecva.net/papers.php'
        : `https://openaccess.thecvf.com/${group.conference}${group.year}?day=all`;
      const indexHtml = group.conference === 'ECCV' ? eccvIndex : await this.html(indexUrl);
      const availableLinks = links(indexHtml, group);
      if (availableLinks.length < perGroup) {
        throw new Error(`${group.conference} ${group.year} 官方列表仅找到 ${availableLinks.length} 个链接`);
      }
      sources.push({ ...group, indexUrl });

      let added = 0;
      for (const url of evenlySample(availableLinks, perGroup * 2)) {
        if (added >= perGroup) break;
        const paper = parseOfficialDetail(await this.html(url), url, group);
        if (paper) {
          papers.push(paper);
          added += 1;
        }
        await new Promise((resolve) => setTimeout(resolve, 250));
      }
      if (added < perGroup) {
        throw new Error(`${group.conference} ${group.year} 仅获得 ${added} 篇有效摘要`);
      }
      console.log(`Collected ${added} papers from ${group.conference} ${group.year}`);
    }

    return {
      collectedAt: new Date().toISOString(),
      description: `每个会议年份从官方列表均匀抽取 ${perGroup} 篇有摘要的论文；仅用于课程演示，不代表全部论文总体。`,
      sources,
      papers,
    };
  }
}
