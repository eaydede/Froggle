import {
  completedFixture,
  partialFixture,
  unplayedFixture,
  zenInProgressFixture,
  zenEndedFixture,
  podiumGoldFixture,
  podiumSilverFixture,
  podiumBronzeFixture,
  podiumButtonFixture,
  podiumScoreFixture,
  podiumGlyphFixture,
  type LandingFixture,
} from './default';

const FIXTURES: Record<string, LandingFixture> = {
  unplayed: unplayedFixture,
  completed: completedFixture,
  partial: partialFixture,
  'zen-progress': zenInProgressFixture,
  'zen-ended': zenEndedFixture,
  'podium-gold': podiumGoldFixture,
  'podium-silver': podiumSilverFixture,
  'podium-bronze': podiumBronzeFixture,
  'podium-button': podiumButtonFixture,
  'podium-score': podiumScoreFixture,
  'podium-glyph': podiumGlyphFixture,
};

export function getLandingFixture(name: string | null): LandingFixture | null {
  if (!name) return null;
  return FIXTURES[name] ?? null;
}

export type { LandingFixture };
