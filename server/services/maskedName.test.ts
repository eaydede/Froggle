import { describe, expect, it } from 'vitest';
import { getMaskedName } from './maskedName.js';

describe('getMaskedName', () => {
  it('is stable for the same (user, date)', () => {
    const a = getMaskedName('user-1', '2026-05-07');
    const b = getMaskedName('user-1', '2026-05-07');
    expect(a).toBe(b);
  });

  it('rotates when the date changes', () => {
    const day1 = getMaskedName('user-1', '2026-05-07');
    const day2 = getMaskedName('user-1', '2026-05-08');
    expect(day1).not.toBe(day2);
  });

  it('differs across users on the same date', () => {
    const a = getMaskedName('user-1', '2026-05-07');
    const b = getMaskedName('user-2', '2026-05-07');
    expect(a).not.toBe(b);
  });

  it('returns "Adjective Noun" shape', () => {
    expect(getMaskedName('user-x', '2026-05-07')).toMatch(/^[A-Z][a-z]+ [A-Z][a-z]+$/);
  });
});
