import {
  completedFixture,
  partialFixture,
  unplayedFixture,
  zenInProgressFixture,
  zenEndedFixture,
  podiumGoldFixture,
  podiumSilverFixture,
  podiumBronzeFixture,
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
};

export function getLandingFixture(name: string | null): LandingFixture | null {
  if (!name) return null;
  return FIXTURES[name] ?? null;
}

export type { LandingFixture };
