import type { Game } from 'models';
import type { GameResults } from '../../../shared/types';
import type { DailyResultsExtras } from '../ResultsPage';
import { defaultFixture, defaultGame } from './default';
import { dailyDefaultFixture, dailyDefaultGame, dailyDefaultExtras } from './daily';

export interface ResultsFixture {
  results: GameResults;
  game: Game;
  /** When present, ResultsRoute renders the page in daily mode
   *  (date chip + leaderboard teaser). */
  daily?: DailyResultsExtras;
}

const FIXTURES: Record<string, ResultsFixture> = {
  default: { results: defaultFixture, game: defaultGame },
  daily: {
    results: dailyDefaultFixture,
    game: dailyDefaultGame,
    daily: dailyDefaultExtras,
  },
};

export function getResultsFixture(name: string | null): ResultsFixture | null {
  if (!name) return null;
  return FIXTURES[name] ?? null;
}
