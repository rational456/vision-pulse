import type { Paper } from '../paper/paper.types.js';

const stopwords = new Set([
  'about', 'after', 'again', 'against', 'also', 'among', 'another', 'based',
  'been', 'being', 'between', 'both', 'could', 'data', 'does', 'each', 'from',
  'have', 'into', 'more', 'most', 'other', 'ours', 'over', 'paper', 'propose',
  'proposed', 'results', 'show', 'shows', 'such', 'than', 'that', 'their',
  'them', 'there', 'these', 'this', 'those', 'through', 'towards', 'using',
  'very', 'were', 'where', 'which', 'while', 'with', 'within', 'without',
  'would', 'your', 'and', 'are', 'for', 'the', 'has', 'its', 'our', 'can',
  'new', 'via', 'all', 'any', 'not', 'but', 'one', 'two', 'use', 'used',
  'method', 'methods', 'model', 'models', 'approach', 'approaches',
]);

const phraseAliases = new Map<string, string>([
  ['object detections', 'object detection'],
  ['image segmentations', 'image segmentation'],
  ['large language models', 'large language model'],
  ['vision language models', 'vision language model'],
  ['visual language model', 'vision language model'],
  ['three dimensional', '3d'],
]);

const technicalPhrases = [
  'object detection', 'image segmentation', 'semantic segmentation',
  'instance segmentation', 'large language model', 'vision language model',
  'vision transformer', 'diffusion model', 'generative model',
  'self supervised learning', 'few shot learning', 'zero shot learning',
  'domain adaptation', 'open vocabulary', 'image generation',
  'image classification', 'video understanding', 'multi modal',
  'three dimensional reconstruction', '3d reconstruction',
];

function clean(value: string): string {
  return value
    .normalize('NFKC')
    .toLocaleLowerCase('en-US')
    .replace(/&/g, ' and ')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function normalizeKeyword(value: string): string | null {
  const normalized = clean(value);
  if (!normalized || /^\d+$/.test(normalized)) return null;
  const alias = phraseAliases.get(normalized) ?? normalized;
  if (alias.split(' ').every((word) => stopwords.has(word))) return null;
  return alias;
}

function containsPhrase(text: string, phrase: string): boolean {
  return ` ${text} `.includes(` ${phrase} `) || ` ${text} `.includes(` ${phrase}s `);
}

export function keywordsForPaper(paper: Pick<Paper, 'keywords' | 'title' | 'abstract'>): string[] {
  const explicit = [...new Set(paper.keywords
    .map(normalizeKeyword)
    .filter((keyword): keyword is string => keyword !== null))];
  if (explicit.length > 0) return explicit;

  const title = clean(paper.title);
  const abstract = clean(paper.abstract ?? '');
  const combined = `${title} ${abstract}`;
  const phrases = technicalPhrases.filter((phrase) => containsPhrase(combined, phrase));
  const coveredWords = new Set(phrases.flatMap((phrase) => phrase.split(' ')));
  const scores = new Map<string, number>();

  for (const [text, weight] of [[title, 3], [abstract, 1]] as const) {
    for (const word of text.split(' ')) {
      if (word.length < 4 || /^\d+$/.test(word) || stopwords.has(word) || coveredWords.has(word)) continue;
      scores.set(word, (scores.get(word) ?? 0) + weight);
    }
  }

  const singleWords = [...scores]
    .sort(([leftWord, leftScore], [rightWord, rightScore]) =>
      rightScore - leftScore || leftWord.localeCompare(rightWord))
    .slice(0, Math.max(0, 8 - phrases.length))
    .map(([word]) => word);

  return [...new Set([...phrases, ...singleWords])].slice(0, 8);
}
