import { RANK_TITLES, type TimedRankTargets } from 'models/timedRanks';
import type { WordStats } from './types.js';

export const MODEL_VERSION = 'timed-ranks-v3-legend-p93-board-out-60d-wordfreq-3.1.1';
export const RANK_PERCENTILES = [0.20, 0.45, 0.70, 0.90, 0.93];
export const MIN_CALIBRATION_GAMES = 50;
export const MIN_CALIBRATION_BOARDS = 5;
const SMOOTHING_OPPORTUNITIES = 20;
const FULL_CONFIDENCE_BOARDS = 5;
const MIN_BASELINE_OPPORTUNITIES = 20;

export function vocabularyDifficulty(zipf: number | undefined): number {
  return zipf == null || !Number.isFinite(zipf) ? 0.5 : Math.max(0, Math.min(1, (6 - zipf) / 4));
}

/** Build once per cohort: each board then evaluates only its own words. */
export function createDifficultyLookup(stats: WordStats[], vocabulary: ReadonlyMap<string, number>) {
  const byWord = new Map(stats.map(row => [row.word, row]));
  const groups = new Map<string, { opportunities: number; finds: number; }>();
  const bandOf = (word: string) => Math.min(3, Math.floor(vocabularyDifficulty(vocabulary.get(word)) * 4));
  const keysFor = (word: string) => {
    const band = bandOf(word);
    return [`${word.length}:${band}`, `${word.length}:half${Math.floor(band / 2)}`, `${word.length}:all`, 'all'];
  };
  for (const row of stats) {
    for (const key of keysFor(row.word)) {
      const group = groups.get(key) ?? { opportunities: 0, finds: 0 };
      group.opportunities += row.opportunities;
      group.finds += row.finds;
      groups.set(key, group);
    }
  }

  return (word: string) => {
    const vocabularyValue = vocabularyDifficulty(vocabulary.get(word));
    const row = byWord.get(word);
    let baseline = 0.15;
    // Exclude this word: a sparse word must not manufacture its own prior.
    for (const key of keysFor(word)) {
      const group = groups.get(key);
      const opportunities = (group?.opportunities ?? 0) - (row?.opportunities ?? 0);
      if (opportunities >= MIN_BASELINE_OPPORTUNITIES) {
        baseline = ((group?.finds ?? 0) - (row?.finds ?? 0)) / opportunities;
        break;
      }
    }
    // Many players on one board do not supply five boards of evidence.
    const confidence = Math.min(1, (row?.boards ?? 0) / FULL_CONFIDENCE_BOARDS);
    const opportunities = row?.opportunities ?? 0;
    const finds = row?.finds ?? 0;
    const smoothed = (finds + SMOOTHING_OPPORTUNITIES * baseline) / (opportunities + SMOOTHING_OPPORTUNITIES);
    const findRate = confidence * smoothed + (1 - confidence) * baseline;
    const findingValue = 1 - findRate;
    return {
      vocabulary: vocabularyValue,
      finding: findingValue,
      combined: 0.4 * vocabularyValue + 0.6 * findingValue,
    };
  };
}

export function attainablePoints(
  words: Array<{ word: string; points: number; }>,
  difficulty: ReturnType<typeof createDifficultyLookup>,
): number {
  return words.reduce((sum, { word, points }) => sum + points * (1 - difficulty(word).combined), 0);
}

export function percentile(values: number[], fraction: number): number {
  if (!values.length) throw new Error('Cannot calculate a percentile without observations');
  const sorted = [...values].sort((a, b) => a - b);
  const position = (sorted.length - 1) * fraction;
  const lower = Math.floor(position);
  return sorted[lower] + (sorted[Math.ceil(position)] - sorted[lower]) * (position - lower);
}

export function createTargets(
  attainable: number,
  maximum: number,
  multipliers: number[],
  statisticsVersion: string,
): TimedRankTargets | null {
  if (maximum < RANK_TITLES.length || attainable <= 0 || multipliers.length !== RANK_TITLES.length) return null;
  if (multipliers.some(value => !Number.isFinite(value) || value < 0)) return null;
  const thresholds: number[] = [];
  for (let i = 0; i < multipliers.length; i++) {
    const previous = thresholds[i - 1] ?? 0;
    // Leave at least one integer point for every remaining title.
    const ceiling = maximum - (multipliers.length - 1 - i);
    thresholds.push(Math.min(ceiling, Math.max(previous + 1, Math.ceil(attainable * multipliers[i]))));
  }
  return { modelVersion: MODEL_VERSION, statisticsVersion, attainablePoints: attainable, thresholds };
}
