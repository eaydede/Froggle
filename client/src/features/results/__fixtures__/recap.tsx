import type { ResultsInsights, ResultPlayer } from 'models/results';
import { scoreWord } from '../../../gameplay/score';
import { findWordPath } from '../../../gameplay/findWordPath';
import { DateChip } from '../../../ui/DateChip';
import { ResultsView } from '../view/ResultsView';
import { ActionButton } from '../view/components/ActionButton';
import { IconAction } from '../../../ui/IconAction';

const board = ['HSGD', 'ECAN', 'IASS', 'LEMS'].map((row) => row.split(''));
const words = [
  'CAME',
  'CAMS',
  'SCAM',
  'SCAMS',
  'SCALE',
  'SCALES',
  'LAMES',
  'SEAM',
  'ACES',
  'CASE',
  'MACE',
];
const times = [8, 14, 21, 26, 41, 45, 63, 78, 92, 104, 117];
const opponentWords =
  'MAILES CAMEL DACES DANGS LEACHES MALICES SCALES LAMES CAME SEAM MACE ACES CASE SCAM DANG SANG SNAG LACE LACES MEAL MALE MALES SALE SEAL ACHE ACHES EACH MASS MESA CAMES SCAN SCANS CANS SNAGS SAME MACES HEAL LEACH SCAMS CAMS'.split(
    ' ',
  );
const players: ResultPlayer[] = [
  {
    id: 'you',
    displayName: 'You',
    isYou: true,
    duration: 120,
    timeLimit: 120,
    finds: words.map((word, i) => ({ word, score: scoreWord(word), time: times[i] })),
  },
  {
    id: 'wach',
    displayName: 'Wach',
    isYou: false,
    duration: 120,
    timeLimit: 120,
    finds: opponentWords.map((word, i) => ({ word, score: scoreWord(word), time: 6 + i * 2.8 })),
  },
  ...[
    'FroggleFreezer',
    'I luv frog',
    'Arya',
    'mossy',
    'big egg',
    'Tasty',
    'lilypad',
    'kermit_fan',
    'Tadpole',
    'bogwalker',
    'Rana',
    'hopscotch',
    'newt',
    'ribbit',
    'Pondering',
    'Croak',
    'marsh',
    'greenie',
    'Polly',
  ].map((name, i) => ({
    id: name,
    displayName: name,
    isYou: false,
    duration: 120,
    timeLimit: 120,
    finds: (i === 2
      ? ['AMESACES', 'MALICES']
      : i === 3 || i === 4 || i === 5
        ? ['LEACHES', 'CASE']
        : ['CAME']
    ).map((word, j) => ({ word, score: scoreWord(word), time: 15 + j * 20 })),
  })),
];
const insights: ResultsInsights = {
  players,
};

export function RecapFixture({
  legacy = false,
  early = false,
  opponentDelay = 0,
}: {
  legacy?: boolean;
  early?: boolean;
  opponentDelay?: number;
}) {
  const activeInsights = early
    ? {
        ...insights,
        players: players.map((p) => {
          const duration = p.id === 'you' ? 80 : p.id === 'wach' ? 100 : p.duration;
          return {
            ...p,
            duration,
            finds: p.finds.map((f) => ({
              ...f,
              time: f.time === null ? null : (f.time * duration) / p.duration,
            })),
          };
        }),
      }
    : insights;
  const all = [...new Set([...words, ...opponentWords, 'AMESACES', 'AMESACE', 'CALESAS'])];
  const scored = (word: string) => ({
    word,
    score: scoreWord(word),
    path: findWordPath(board, word) ?? [],
  });
  return (
    <ResultsView
      insights={
        legacy
          ? {
              ...activeInsights,
              players: activeInsights.players.map((p) => ({
                ...p,
                finds: p.finds.map((f) => ({ ...f, time: null })),
              })),
            }
          : activeInsights
      }
      me={{
        displayName: 'You',
        points: 28,
        wordCount: words.length,
        foundWords: words.map(scored),
        missedWords: all.filter((word) => !words.includes(word)).map(scored),
      }}
      board={board}
      config={{ boardSize: 4, minWordLength: 4, timeLimit: 120 }}
      roster={[...players.filter((p) => !p.isYou), players[0]].map((p, i) => ({
        id: p.id,
        rank: i + 1,
        displayName: p.displayName,
        points: p.id === 'wach' ? 111 : p.isYou ? 28 : 81 - i * 3,
        isYou: p.isYou,
      }))}
      loadOpponent={async (id) => {
        if (opponentDelay) await new Promise((resolve) => setTimeout(resolve, opponentDelay));
        const p = players.find((p) => p.id === id);
        return p
          ? {
              ok: true,
              opponent: {
                id,
                displayName: p.displayName,
                points: p.finds.reduce((sum, f) => sum + f.score, 0),
                wordCount: p.finds.length,
                foundWords: p.finds,
              },
            }
          : { ok: false, error: 'opponent-missing' };
      }}
      standingsHeader="Leaderboard"
      topbar={
        <header
          className="grid items-center gap-2 shrink-0"
          style={{ gridTemplateColumns: '32px 1fr 32px' }}
        >
          <IconAction label="Close" onClick={() => {}}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </IconAction>
          <DateChip label="Timed Daily · Wed, Oct 14" onClick={() => {}} />
          <IconAction label="Share" onClick={() => {}}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 12v8h16v-8M12 16V2m-5 5 5-5 5 5" />
            </svg>
          </IconAction>
        </header>
      }
      bottomActions={
        <div className="grid grid-cols-2 gap-2">
          <ActionButton
            icon={
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
              >
                <path d="M3 11l9-8 9 8M5 10v10h14V10M9 20v-6h6v6" />
              </svg>
            }
            label="Home"
            onClick={() => {}}
          />
          <ActionButton
            icon={
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
              >
                <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
              </svg>
            }
            label="Leaderboard"
            primary
            onClick={() => {}}
          />
        </div>
      }
    />
  );
}
