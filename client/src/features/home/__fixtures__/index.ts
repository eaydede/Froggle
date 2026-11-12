import {
  completedFixture,
  partialFixture,
  unplayedFixture,
  zenEndedFixture,
  zenInProgressFixture,
  type LandingFixture,
} from './default';

const FIXTURES: Record<string, LandingFixture> = {
  unplayed: unplayedFixture,
  completed: completedFixture,
  partial: partialFixture,
  'zen-progress': zenInProgressFixture,
  'zen-ended': zenEndedFixture,
};

export function getLandingFixture(name: string | null): LandingFixture | null {
  if (!name) return null;
  return FIXTURES[name] ?? null;
}

export type { LandingFixture };
