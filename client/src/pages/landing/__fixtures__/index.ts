import { completedFixture, partialFixture, unplayedFixture, type LandingFixture } from './default';

const FIXTURES: Record<string, LandingFixture> = {
  unplayed: unplayedFixture,
  completed: completedFixture,
  partial: partialFixture,
};

export function getLandingFixture(name: string | null): LandingFixture | null {
  if (!name) return null;
  return FIXTURES[name] ?? null;
}

export type { LandingFixture };
