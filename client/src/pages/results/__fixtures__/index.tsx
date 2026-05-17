import type { ReactNode } from 'react';
import { ResultsView } from '../../../shared/results/ResultsView';
import type {
  LoadOpponentResult,
  ResultsRosterEntry,
} from '../../../shared/results/types';
import type { ScoredWord } from '../../../shared/types';

const BOARD_4x4: string[][] = [
  ['T', 'R', 'A', 'P'],
  ['E', 'S', 'O', 'L'],
  ['N', 'I', 'D', 'E'],
  ['G', 'H', 'A', 'M'],
];

// Mock words spanning every rarity tier so the board preview animation
// exercises each rarity color when the cells are tapped.
const ME_WORDS: ScoredWord[] = [
  { word: 'TEAR', score: 2, path: [
    { row: 0, col: 0 }, { row: 1, col: 0 }, { row: 0, col: 2 }, { row: 1, col: 1 },
  ]},
  { word: 'STORE', score: 3, path: [
    { row: 1, col: 1 }, { row: 0, col: 1 }, { row: 0, col: 2 }, { row: 1, col: 2 }, { row: 1, col: 0 },
  ]},
  { word: 'STREAM', score: 5, path: [
    { row: 1, col: 1 }, { row: 0, col: 1 }, { row: 0, col: 0 }, { row: 1, col: 0 }, { row: 0, col: 2 }, { row: 3, col: 3 },
  ]},
  { word: 'PARSED', score: 8, path: [
    { row: 0, col: 3 }, { row: 0, col: 2 }, { row: 0, col: 1 }, { row: 1, col: 1 }, { row: 0, col: 0 }, { row: 2, col: 2 },
  ]},
  { word: 'MIDDLES', score: 13, path: [
    { row: 3, col: 3 }, { row: 2, col: 1 }, { row: 2, col: 2 }, { row: 2, col: 2 }, { row: 1, col: 3 }, { row: 2, col: 3 }, { row: 1, col: 1 },
  ]},
  { word: 'NIT', score: 1, path: [
    { row: 2, col: 0 }, { row: 2, col: 1 }, { row: 0, col: 0 },
  ]},
];

const MISSED_WORDS: ScoredWord[] = [
  { word: 'PRESIDED', score: 13, path: [] },
];

const ROSTER: ResultsRosterEntry[] = [
  { id: 'you', rank: 1, displayName: 'You', points: 32, isYou: true },
  { id: 'op-1', rank: 2, displayName: 'Pat', points: 22, isYou: false },
];

async function loadOpponent(id: string): Promise<LoadOpponentResult> {
  if (id !== 'op-1') return { ok: false, error: 'opponent-missing' };
  return {
    ok: true,
    opponent: {
      id: 'op-1',
      displayName: 'Pat',
      points: 22,
      wordCount: 3,
      foundWords: [
        { word: 'TEAR', score: 2 },
        { word: 'STORE', score: 3 },
        { word: 'MIDDLES', score: 13 },
      ],
    },
  };
}

export const RESULTS_FIXTURES: Record<string, () => ReactNode> = {
  rarity: () => (
    <ResultsView
      me={{
        displayName: 'You',
        points: ME_WORDS.reduce((s, w) => s + w.score, 0),
        wordCount: ME_WORDS.length,
        foundWords: ME_WORDS,
        missedWords: MISSED_WORDS,
      }}
      board={BOARD_4x4}
      config={{ boardSize: 4, minWordLength: 3, timeLimit: 90 }}
      roster={ROSTER}
      loadOpponent={loadOpponent}
      topbarLabel="MOCK"
      topbarOnClose={() => {}}
      topbarOnShare={() => {}}
      bottomActions={<div className="h-10" />}
    />
  ),
};
