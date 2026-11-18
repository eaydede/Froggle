import { ZEN_RANKS } from './zenRanks.js';

export const RANK_TITLES = ZEN_RANKS.map(({ id, name, colorToken }) => ({ id, name, colorToken }));

/** Immutable, public board targets. Contains neither words nor player data. */
export interface TimedRankTargets {
  modelVersion: string;
  statisticsVersion: string;
  attainablePoints: number;
  thresholds: number[];
}

export function getTimedRank(points: number, targets: TimedRankTargets) {
  let index = -1;
  for (let i = 0; i < targets.thresholds.length; i++) {
    if (points >= targets.thresholds[i]) index = i;
  }
  if (index < 0) return null;
  if (index === RANK_TITLES.length - 1) {
    const step = legendStep(targets);
    const level = 1 + Math.floor((points - targets.thresholds[index]) / step);
    return { ...RANK_TITLES[index], name: `Legend ${level}`, points: targets.thresholds[index] + (level - 1) * step, index };
  }
  return { ...RANK_TITLES[index], points: targets.thresholds[index], index };
}

export function getNextTimedRank(points: number, targets: TimedRankTargets) {
  const index = targets.thresholds.findIndex(threshold => points < threshold);
  if (index < 0) {
    const current = getTimedRank(points, targets)!;
    const nextPoints = current.points + legendStep(targets);
    const level = 2 + Math.floor((points - targets.thresholds[4]) / legendStep(targets));
    return { ...RANK_TITLES[4], name: `Legend ${level}`, points: nextPoints, pointsToNext: nextPoints - points };
  }
  return {
    ...RANK_TITLES[index],
    name: index === 4 ? 'Legend 1' : RANK_TITLES[index].name,
    points: targets.thresholds[index],
    pointsToNext: targets.thresholds[index] - points,
  };
}

/** Each additional Legend level repeats the Virtuoso → Legend 1 point gap. */
function legendStep(targets: TimedRankTargets) {
  return Math.max(1, targets.thresholds[4] - targets.thresholds[3]);
}
