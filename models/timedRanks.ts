import { ZEN_RANKS } from './zenRanks.js';

export const RANK_TITLES = ZEN_RANKS.map(({ id, name, colorToken }) => ({ id, name, colorToken }));
export const TIMED_RANK_POLICY_VERSION = 'timed-ranks-v4-even-bands';
const legendIndex = RANK_TITLES.length - 1;

export interface BoardDifficulty {
  /** Point-weighted word difficulty in [0, 1]. */
  value: number;
  totalPoints: number;
  /** Percentage of comparable historical boards with strictly lower difficulty. */
  percentile: number | null;
  comparisonBoards: number;
}

export const BOARD_DIFFICULTY_LEVELS = [
  { name: 'Easy', colorToken: '--board-difficulty-easy' },
  { name: 'Fair', colorToken: '--board-difficulty-fair' },
  { name: 'Tough', colorToken: '--board-difficulty-tough' },
  { name: 'Hard', colorToken: '--board-difficulty-hard' },
  { name: 'Brutal', colorToken: '--board-difficulty-brutal' },
] as const;

/** Relative descriptions and the comparison sentence use the same percentile. */
export function getBoardDifficultyLevel(percentile: number | null | undefined) {
  if (percentile == null || !Number.isFinite(percentile)) return null;
  const index = Math.max(0, Math.min(4, Math.floor(percentile / 20)));
  return { ...BOARD_DIFFICULTY_LEVELS[index], index };
}

/** Immutable, public board targets. Contains neither words nor player data. */
export interface TimedRankTargets {
  modelVersion: string;
  statisticsVersion: string;
  attainablePoints: number;
  /** Absent on older snapshots; never invent a historical comparison. */
  boardDifficulty?: BoardDifficulty;
  /** Inclusive upper score of each colored band. Scribe starts at zero. */
  thresholds: number[];
}

/** A title belongs to the band being filled, rather than the last band completed. */
export function getTimedRankStarts(targets: TimedRankTargets): number[] {
  return [0, ...targets.thresholds.slice(0, -1).map(points => points + 1)];
}

export function getTimedRank(points: number, targets: TimedRankTargets) {
  const starts = getTimedRankStarts(targets);
  const band = targets.thresholds.findIndex(threshold => points <= threshold);
  const index = band < 0 ? legendIndex : band;
  if (index === legendIndex) {
    const step = legendStep(targets);
    const level = 1 + Math.floor((points - starts[index]) / step);
    return { ...RANK_TITLES[index], name: `Legend ${level}`, points: starts[index] + (level - 1) * step, index };
  }
  return { ...RANK_TITLES[index], points: starts[index], index };
}

export function getNextTimedRank(points: number, targets: TimedRankTargets) {
  const current = getTimedRank(points, targets);
  const starts = getTimedRankStarts(targets);
  if (current.index === legendIndex) {
    const step = legendStep(targets);
    const level = 2 + Math.floor((points - starts[legendIndex]) / step);
    const nextPoints = current.points + step;
    return { ...RANK_TITLES[legendIndex], name: `Legend ${level}`, points: nextPoints, pointsToNext: nextPoints - points };
  }
  const index = current.index + 1;
  return {
    ...RANK_TITLES[index],
    name: index === legendIndex ? 'Legend 1' : RANK_TITLES[index].name,
    points: starts[index],
    pointsToNext: starts[index] - points,
  };
}

/** Descending, read-only carousel: one level above the player, through Scribe. */
export function getTimedRankRungs(points: number, targets: TimedRankTargets) {
  const starts = getTimedRankStarts(targets);
  const step = legendStep(targets);
  const current = getTimedRank(points, targets);
  const level = current.index === legendIndex ? 1 + Math.round((current.points - starts[legendIndex]) / step) : 0;
  const top = level ? legendIndex + level : legendIndex;
  return Array.from({ length: top + 1 }, (_, index) => {
    const ordinal = top - index;
    const isLegend = ordinal >= legendIndex;
    const title = RANK_TITLES[Math.min(ordinal, legendIndex)];
    const collapsed = !level && isLegend;
    const target = isLegend ? starts[legendIndex] + (ordinal - legendIndex) * step : starts[ordinal];
    const next = isLegend ? target + step : starts[ordinal + 1];
    return {
      ...title, ordinal, collapsed, points: target, nextPoints: next,
      name: collapsed ? 'Legend' : isLegend ? `Legend ${ordinal - legendIndex + 1}` : title.name,
    };
  });
}

/** Further Legend levels repeat the width of the orange band. */
function legendStep(targets: TimedRankTargets) {
  return Math.max(1, targets.thresholds[legendIndex] - targets.thresholds[legendIndex - 1]);
}
