import type { Game } from 'models';
import type { GameResults } from '../../../shared/types';
import { defaultFixture, defaultGame } from './default';

export interface ResultsFixture {
  results: GameResults;
  game: Game;
}

const FIXTURES: Record<string, ResultsFixture> = {
  default: { results: defaultFixture, game: defaultGame },
};

export function getResultsFixture(name: string | null): ResultsFixture | null {
  if (!name) return null;
  return FIXTURES[name] ?? null;
}
