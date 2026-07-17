import type { ReactNode } from 'react';
import type { InvalidSubmission } from 'models';
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
// exercises each rarity color when the cells are tapped. The find times trace
// an early cluster, a ~50s break, then two late finds — so the timeline panel
// shows a cluster, a flagged break, and time left on the clock.
const ME_WORDS: ScoredWord[] = [
  { word: 'TEAR', score: 2, timeSeconds: 6, path: [
    { row: 0, col: 0 }, { row: 1, col: 0 }, { row: 0, col: 2 }, { row: 1, col: 1 },
  ]},
  { word: 'STORE', score: 3, timeSeconds: 11, path: [
    { row: 1, col: 1 }, { row: 0, col: 1 }, { row: 0, col: 2 }, { row: 1, col: 2 }, { row: 1, col: 0 },
  ]},
  { word: 'STREAM', score: 5, timeSeconds: 18, path: [
    { row: 1, col: 1 }, { row: 0, col: 1 }, { row: 0, col: 0 }, { row: 1, col: 0 }, { row: 0, col: 2 }, { row: 3, col: 3 },
  ]},
  { word: 'PARSED', score: 8, timeSeconds: 68, path: [
    { row: 0, col: 3 }, { row: 0, col: 2 }, { row: 0, col: 1 }, { row: 1, col: 1 }, { row: 0, col: 0 }, { row: 2, col: 2 },
  ]},
  { word: 'MIDDLES', score: 13, timeSeconds: 74, path: [
    { row: 3, col: 3 }, { row: 2, col: 1 }, { row: 2, col: 2 }, { row: 2, col: 2 }, { row: 1, col: 3 }, { row: 2, col: 3 }, { row: 1, col: 1 },
  ]},
  { word: 'NIT', score: 1, timeSeconds: 3, path: [
    { row: 2, col: 0 }, { row: 2, col: 1 }, { row: 0, col: 0 },
  ]},
];

const MISSED_WORDS: ScoredWord[] = [
  { word: 'PRESIDED', score: 13, path: [] },
];

// Rejected attempts — several land during the 18→68s lull, so toggling them on
// reveals the "quiet" stretch was actually full of failed tries.
const ME_ATTEMPTS: InvalidSubmission[] = [
  { word: 'TREE', reason: 'invalid', t: 9, path: [] },
  { word: 'STOR', reason: 'invalid', t: 14, path: [] },
  { word: 'AER', reason: 'invalid', t: 31, path: [] },
  { word: 'PARSE', reason: 'invalid', t: 44, path: [] },
  { word: 'TEAR', reason: 'repeat', t: 57, path: [] },
  { word: 'MDDLE', reason: 'invalid', t: 71, path: [] },
];

// A long find list (empty paths — this fixture exercises list scrolling, not
// the board replay) so the timeline's auto-scroll-to-top behaviour is visible.
const MANY_WORDS: ScoredWord[] = (
  [
    ['CAT', 1, 2], ['DOG', 1, 5], ['TREE', 2, 9], ['OPEN', 2, 13], ['STONE', 3, 17],
    ['RIVER', 3, 22], ['PLANET', 5, 27], ['GARDEN', 5, 33], ['TEACHER', 8, 39],
    ['MONSTER', 8, 45],
    ['ELEPHANT', 13, 71], ['DIAMOND', 8, 74], ['ORANGE', 5, 77], ['SILVER', 5, 80],
    ['CANDLE', 5, 82], ['WINDOW', 5, 84], ['ROCK', 2, 86], ['LAMP', 2, 87],
    ['PEN', 1, 88], ['CUP', 1, 89],
  ] as const
).map(([word, score, timeSeconds]) => ({ word, score, timeSeconds, path: [] }));

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
        { word: 'TEAR', score: 2, timeSeconds: 8 },
        { word: 'STORE', score: 3, timeSeconds: 20 },
        { word: 'MIDDLES', score: 13, timeSeconds: 55 },
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
        invalidSubmissions: ME_ATTEMPTS,
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
  timeline: () => (
    <ResultsView
      me={{
        displayName: 'You',
        points: MANY_WORDS.reduce((s, w) => s + w.score, 0),
        wordCount: MANY_WORDS.length,
        foundWords: MANY_WORDS,
        missedWords: [],
      }}
      board={BOARD_4x4}
      config={{ boardSize: 4, minWordLength: 3, timeLimit: 90 }}
      roster={[ROSTER[0]]}
      topbarLabel="MOCK"
      topbarOnClose={() => {}}
      topbarOnShare={() => {}}
      bottomActions={<div className="h-10" />}
    />
  ),
};
