import type { ResultFind } from 'models/results';

export interface RunFind extends ResultFind {
  time: number;
  side: 'you' | 'opp';
  key: string;
}

export function timedFinds(finds: ResultFind[], side: RunFind['side']): RunFind[] | null {
  if (finds.some((f) => f.time === null || !Number.isFinite(f.time) || f.time < 0)) return null;
  return finds
    .map((f) => ({ ...f, time: f.time!, side, key: `${side}:${f.word}` }))
    .sort((a, b) => a.time - b.time);
}

export function mergeRuns(you: RunFind[], opponent: RunFind[]): RunFind[] {
  return [...you, ...opponent].sort(
    (a, b) => a.time - b.time || (a.side === b.side ? 0 : a.side === 'you' ? -1 : 1),
  );
}

export function scoreAt(finds: RunFind[], time: number): number {
  return finds.reduce((score, find) => score + (find.time <= time ? find.score : 0), 0);
}

export function curve(finds: RunFind[], duration: number, max: number, time: number): string {
  let score = 0;
  const points = ['0,52'];
  for (const find of finds) {
    if (find.time > time) break;
    const x = (find.time / duration) * 100;
    points.push(`${x},${52 - (score / max) * 52}`);
    score += find.score;
    points.push(`${x},${52 - (score / max) * 52}`);
  }
  points.push(`${(time / duration) * 100},${52 - (score / max) * 52}`);
  return points.join(' ');
}

export function runSegments(
  finds: RunFind[],
  duration: number,
  max: number,
  time: number,
  finishedAt: number,
) {
  const finish = Math.max(0, Math.min(duration, finishedAt));
  const y = 52 - (scoreAt(finds, finish) / max) * 52;
  return {
    active: curve(finds, duration, max, Math.min(time, finish)),
    afterFinish:
      time > finish ? `${(finish / duration) * 100},${y} ${(time / duration) * 100},${y}` : null,
  };
}

export function formatTime(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
}
