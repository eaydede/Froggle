import { describe, expect, it } from 'vitest';
import type { InvalidSubmission } from 'models';
import { appendInvalidSubmission, parseInvalidSubmissions } from './invalidSubmissions.js';

const attempt = (word: string): InvalidSubmission => ({
  word,
  reason: 'invalid',
  t: 1,
  path: [],
});

describe('parseInvalidSubmissions', () => {
  it('passes a parsed array through (jsonb driver shape)', () => {
    expect(parseInvalidSubmissions([attempt('A')])).toHaveLength(1);
  });

  it('parses a JSON string, and reads null / junk as empty', () => {
    expect(parseInvalidSubmissions(JSON.stringify([attempt('A')]))).toHaveLength(1);
    expect(parseInvalidSubmissions(null)).toEqual([]);
    expect(parseInvalidSubmissions('not json')).toEqual([]);
    expect(parseInvalidSubmissions('{}')).toEqual([]);
  });
});

describe('appendInvalidSubmission', () => {
  it('appends a new attempt', () => {
    expect(appendInvalidSubmission([attempt('A')], attempt('B'))).toHaveLength(2);
  });

  it('keeps only the most recent N when over the cap', () => {
    const existing = Array.from({ length: 5 }, (_, i) => attempt(`W${i}`));
    const out = appendInvalidSubmission(existing, attempt('NEW'), 3);
    expect(out.map((a) => a.word)).toEqual(['W3', 'W4', 'NEW']);
  });
});
