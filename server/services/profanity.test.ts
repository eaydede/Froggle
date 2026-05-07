import { describe, expect, it } from 'vitest';
import { containsProfanity } from './profanity.js';

describe('containsProfanity', () => {
  it('flags obvious profanity', () => {
    expect(containsProfanity('fuckface')).toBe(true);
    expect(containsProfanity('shitlord')).toBe(true);
  });

  it('flags common leetspeak substitutions', () => {
    expect(containsProfanity('sh1t')).toBe(true);
    expect(containsProfanity('fuk')).toBe(true);
  });

  it('passes innocuous names', () => {
    expect(containsProfanity('Anonymous')).toBe(false);
    expect(containsProfanity('Cheerful Tadpole')).toBe(false);
    expect(containsProfanity('eaydede')).toBe(false);
    expect(containsProfanity('player123')).toBe(false);
  });

  it('handles edge inputs without throwing', () => {
    expect(containsProfanity('')).toBe(false);
    expect(containsProfanity('   ')).toBe(false);
  });
});
