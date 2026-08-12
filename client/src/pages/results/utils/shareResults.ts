import type { ScoredWord } from '../../../shared/types';

const DIGIT_EMOJIS = ['0️⃣', '1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣'];

interface ScoreTier {
  scores: number[];
  emoji: string;
}

// Mirrors the in-app rarity palette in client/src/tailwind.css and the
// score thresholds in engine/scoring.ts. Orange (🟧) stays pinned to the top
// score so the share output preserves the same "orange = best word" mental
// model players see in the word list.
const SCORE_TIERS: ScoreTier[] = [
  { scores: [1], emoji: '⬜' },
  { scores: [2], emoji: '🟨' },
  { scores: [3], emoji: '🟩' },
  { scores: [5], emoji: '🟦' },
  { scores: [8], emoji: '🟪' },
  { scores: [13], emoji: '🟧' },
];

export interface ShareOptions {
  daily?: {
    number: number;
    mode?: 'timed' | 'zen' | 'time-is-money';
    /** Total clock a run was worth, in seconds. Set by modes scored in time
     *  rather than points — the headline becomes mm:ss instead of W/pts. */
    clockSeconds?: number;
  };
  gameLink?: string;
}

const DAILY_MODE_TAG: Record<string, string> = {
  zen: 'Zen',
  'time-is-money': 'Time is Money',
};

const DAILY_MODE_PATH: Record<string, string> = {
  zen: '/daily/zen/play',
  'time-is-money': '/daily/time-is-money',
};

function formatClock(seconds: number): string {
  const clamped = Math.max(0, Math.floor(seconds));
  return `${Math.floor(clamped / 60)}:${String(clamped % 60).padStart(2, '0')}`;
}

function numberToEmojis(n: number): string {
  return String(n)
    .split('')
    .map((d) => DIGIT_EMOJIS[Number(d)])
    .join('');
}

function buildSquareLine(count: number, emoji: string): string | null {
  if (count === 0) return null;
  if (count > 10) {
    return `${numberToEmojis(count)} - ${emoji}`;
  }
  return Array(count).fill(emoji).join('');
}

export function generateShareText(foundWords: ScoredWord[], options: ShareOptions = {}): string {
  const totalWords = foundWords.length;
  const totalPoints = foundWords.reduce((sum, w) => sum + w.score, 0);
  const isDaily = !!options.daily;

  const lines: string[] = [];

  if (isDaily) {
    const daily = options.daily!;
    const tag = DAILY_MODE_TAG[daily.mode ?? 'timed'] ?? '';
    const prefix = tag ? `Froggle ${tag} #${daily.number}` : `Froggle #${daily.number}`;
    // A mode scored in time headlines the clock it bought, mirroring its
    // results hero. The rarity squares below still carry the word detail, so
    // nothing is lost by dropping W/pts from this line.
    lines.push(
      daily.clockSeconds !== undefined
        ? `${prefix} ${formatClock(daily.clockSeconds)} played`
        : `${prefix} ${totalWords}W ${totalPoints}pts`,
    );
  } else {
    lines.push(`Froggle ${totalWords}W ${totalPoints}pts`);
  }

  const longestLength = foundWords.reduce((max, w) => Math.max(max, w.word.length), 0);
  if (longestLength > 0) {
    lines.push(`⭐ ${longestLength} letters ⭐`);
  }

  for (const tier of SCORE_TIERS) {
    const count = foundWords.filter((w) => tier.scores.includes(w.score)).length;
    const line = buildSquareLine(count, tier.emoji);
    if (line) lines.push(line);
  }

  if (isDaily) {
    const path = DAILY_MODE_PATH[options.daily!.mode ?? 'timed'] ?? '/daily';
    lines.push(`${window.location.origin}${path}`);
  } else if (options.gameLink) {
    lines.push(options.gameLink);
  }

  return lines.join('\n');
}
