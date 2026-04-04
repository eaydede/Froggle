import type { ScoredWord } from '../types';

const DIGIT_EMOJIS = ['0️⃣', '1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣'];

interface ScoreTier {
  scores: number[];
  emoji: string;
}

const SCORE_TIERS: ScoreTier[] = [
  { scores: [1], emoji: '⬜' },
  { scores: [2], emoji: '🟩' },
  { scores: [3], emoji: '🟦' },
  { scores: [5], emoji: '🟪' },
  { scores: [11], emoji: '🟧' },
];

export interface ShareOptions {
  daily?: { number: number };
  gameLink?: string;
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

function findLongestWord(words: ScoredWord[]): string {
  let longest = '';
  for (const w of words) {
    if (w.word.length > longest.length) {
      longest = w.word;
    }
  }
  return longest;
}

export function generateShareText(foundWords: ScoredWord[], options: ShareOptions = {}): string {
  const totalWords = foundWords.length;
  const totalPoints = foundWords.reduce((sum, w) => sum + w.score, 0);
  const isDaily = !!options.daily;

  const lines: string[] = [];

  if (isDaily) {
    lines.push(`Froggle #${options.daily!.number} ${totalWords}W ${totalPoints}pts`);
  } else {
    lines.push(`Froggle ${totalWords}W ${totalPoints}pts`);
  }

  if (isDaily) {
    const longest = findLongestWord(foundWords);
    if (longest) {
      const spaced = longest.toUpperCase().split('').join(' ');
      lines.push(`⭐ ${spaced} ⭐`);
    }
  }

  for (const tier of SCORE_TIERS) {
    const count = foundWords.filter((w) => tier.scores.includes(w.score)).length;
    const line = buildSquareLine(count, tier.emoji);
    if (line) lines.push(line);
  }

  if (!isDaily && options.gameLink) {
    lines.push(options.gameLink);
  }

  return lines.join('\n');
}
