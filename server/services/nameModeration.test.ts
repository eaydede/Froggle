import { describe, expect, it } from 'vitest';
import {
  computeNameUpdate,
  renderPublicName,
  isLocked,
  LOCKOUT_DURATION_MS,
  MARK_EMOJI,
} from './nameModeration.js';
import { getMaskedName } from './maskedName.js';

const NOW = Date.parse('2026-05-07T12:00:00Z');
const USER = 'user-1';

describe('renderPublicName', () => {
  it('returns the name verbatim when clean and unlocked', () => {
    expect(
      renderPublicName(USER, 'Alice', { strikes: 0, lockedUntilMs: null }, NOW),
    ).toBe('Alice');
  });

  it('silently masks a profane name with the deterministic AdjectiveNoun (no emoji)', () => {
    const rendered = renderPublicName(
      USER,
      'shitlord',
      { strikes: 1, lockedUntilMs: null },
      NOW,
    );
    expect(rendered).toBe(getMaskedName(USER));
    expect(rendered).not.toContain(MARK_EMOJI);
  });

  it('appends 🤡 to the stored name when the user is locked', () => {
    expect(
      renderPublicName(
        USER,
        'Cheerful Tadpole',
        { strikes: 0, lockedUntilMs: NOW + 1_000 },
        NOW,
      ),
    ).toBe(`Cheerful Tadpole ${MARK_EMOJI}`);
  });

  it('treats expired locks as not-locked', () => {
    expect(isLocked({ strikes: 0, lockedUntilMs: NOW - 1 }, NOW)).toBe(false);
  });
});

describe('computeNameUpdate', () => {
  it('accepts a clean name and resets strikes to zero', () => {
    const result = computeNameUpdate(
      USER,
      'happyperson',
      { strikes: 2, lockedUntilMs: null },
      NOW,
    );
    expect(result.nextDisplayName).toBe('happyperson');
    expect(result.nextState).toEqual({ strikes: 0, lockedUntilMs: null });
  });

  it('counts a first profane submission as strike 1', () => {
    const result = computeNameUpdate(
      USER,
      'shitlord',
      { strikes: 0, lockedUntilMs: null },
      NOW,
    );
    expect(result.nextDisplayName).toBe('shitlord');
    expect(result.nextState).toEqual({ strikes: 1, lockedUntilMs: null });
  });

  it('escalates a second profane submission to strike 2 without locking', () => {
    const result = computeNameUpdate(
      USER,
      'fuckface',
      { strikes: 1, lockedUntilMs: null },
      NOW,
    );
    expect(result.nextDisplayName).toBe('fuckface');
    expect(result.nextState).toEqual({ strikes: 2, lockedUntilMs: null });
  });

  it('overwrites the name and locks for 24h on the third strike', () => {
    const result = computeNameUpdate(
      USER,
      'asshole',
      { strikes: 2, lockedUntilMs: null },
      NOW,
    );
    expect(result.nextDisplayName).toBe(getMaskedName(USER));
    expect(result.nextState.lockedUntilMs).toBe(NOW + LOCKOUT_DURATION_MS);
    // Strikes reset so the user emerges from lockout with a clean slate.
    expect(result.nextState.strikes).toBe(0);
  });
});
