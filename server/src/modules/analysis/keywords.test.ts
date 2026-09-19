import { describe, expect, it } from 'vitest';
import { keywordsForPaper, normalizeKeyword } from './keywords.js';

describe('keyword processing', () => {
  it('normalizes aliases and removes empty or meaningless keywords', () => {
    expect(normalizeKeyword(' Object Detections! ')).toBe('object detection');
    expect(normalizeKeyword('the')).toBeNull();
    expect(normalizeKeyword('12345')).toBeNull();
  });

  it('prefers supplied keywords and counts each only once', () => {
    expect(keywordsForPaper({
      title: 'Different Title',
      abstract: 'A different abstract',
      keywords: ['Object Detection', 'object detections', 'Vision Transformer'],
    })).toEqual(['object detection', 'vision transformer']);
  });

  it('preserves technical phrases in fallback extraction', () => {
    const result = keywordsForPaper({
      title: 'Open Vocabulary Object Detection with Vision Transformers',
      abstract: 'We study object detection and open vocabulary recognition.',
      keywords: [],
    });
    expect(result).toContain('object detection');
    expect(result).toContain('open vocabulary');
    expect(result).toContain('vision transformer');
    expect(result).not.toContain('object');
  });
});
