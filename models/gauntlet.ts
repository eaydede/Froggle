// Daily Gauntlet — a 3-round daily chain. Each round has its own board,
// timer, and scoring modifier. Rounds are played in order; the aggregate
// winner is determined by sum-of-per-round-ranks (lowest wins).

export type GauntletRoundKind = 'regular' | 'hotLetter' | 'rareLetters';

export const GAUNTLET_ROUND_COUNT = 3;

export const GAUNTLET_ROUND_KINDS: readonly GauntletRoundKind[] = [
  'regular',
  'hotLetter',
  'rareLetters',
];

// Per-letter point values used by the rare-letters round. Inspired by the
// canonical Scrabble distribution but kept as an explicit table so we can
// tune independently. The table is carried inside the modifier itself so
// every persisted gauntlet row is self-describing — a future tweak to the
// defaults won't retroactively change scores stored against old rounds.
export const DEFAULT_RARE_LETTER_VALUES: Readonly<Record<string, number>> = {
  A: 1, E: 1, I: 1, O: 1, U: 1, L: 1, N: 1, R: 1, S: 1, T: 1,
  D: 2, G: 2,
  B: 3, C: 3, M: 3, P: 3,
  F: 4, H: 4, V: 4, W: 4, Y: 4,
  K: 5,
  J: 8, X: 8,
  Q: 10, Z: 10,
};

export type GauntletModifier =
  | { kind: 'regular' }
  | { kind: 'hotLetter'; letter: string; multiplier: number }
  | { kind: 'rareLetters'; values: Record<string, number> };

export interface GauntletRoundConfig {
  index: number;
  kind: GauntletRoundKind;
  boardSize: number;
  timeLimit: number;
  minWordLength: number;
  modifier: GauntletModifier;
}

export type GauntletState = 'unplayed' | 'partial' | 'completed';

export interface GauntletRoundSummary {
  index: number;
  kind: GauntletRoundKind;
  boardSize: number;
  timeLimit: number;
  minWordLength: number;
  modifier: GauntletModifier;
  points: number;
  wordsFound: number;
  longestWord: string;
  endedAt: string | null;
  rank: number | null;
  playersCount: number;
}

export interface GauntletEntry {
  date: string;
  puzzleNumber: number;
  state: GauntletState;
  rounds: Array<GauntletRoundSummary | null>;
  aggregateRankSum: number | null;
  aggregateRank: number | null;
  totalPlayersCompleted: number;
}
