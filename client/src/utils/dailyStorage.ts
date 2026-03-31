import { ScoredWord } from '../api/gameApi';

const STATS_KEY = 'froggle-daily-stats';
const RESULTS_KEY = 'froggle-daily-results';
const RESULTS_MAX_DAYS = 7;

// === Stats (stored indefinitely) ===

export interface DailyStats {
  totalPlayed: number;
  currentStreak: number;
  longestStreak: number;
  totalScore: number;       // for computing average
  mostWords: number;
  mostPoints: number;
  lastPlayedDate: string;   // YYYY-MM-DD in PST
}

const DEFAULT_STATS: DailyStats = {
  totalPlayed: 0,
  currentStreak: 0,
  longestStreak: 0,
  totalScore: 0,
  mostWords: 0,
  mostPoints: 0,
  lastPlayedDate: '',
};

export function loadDailyStats(): DailyStats {
  try {
    const raw = localStorage.getItem(STATS_KEY);
    if (raw) return { ...DEFAULT_STATS, ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return { ...DEFAULT_STATS };
}

function saveDailyStats(stats: DailyStats): void {
  try {
    localStorage.setItem(STATS_KEY, JSON.stringify(stats));
  } catch { /* ignore */ }
}

/**
 * Check if a date is exactly one day after another (both YYYY-MM-DD strings).
 */
function isConsecutiveDay(prev: string, current: string): boolean {
  const prevDate = new Date(prev + 'T00:00:00Z');
  const currDate = new Date(current + 'T00:00:00Z');
  const diffMs = currDate.getTime() - prevDate.getTime();
  return diffMs === 24 * 60 * 60 * 1000;
}

/**
 * Record a completed daily game. Updates stats and stores results.
 */
export function recordDailyResult(
  date: string,
  dailyNumber: number,
  foundWords: ScoredWord[],
  missedWords: ScoredWord[],
  board: string[][],
): void {
  const stats = loadDailyStats();
  const score = foundWords.reduce((sum, w) => sum + w.score, 0);

  // Update streak
  if (stats.lastPlayedDate === date) {
    // Already played today, don't double count
    return;
  }

  const isConsecutive = isConsecutiveDay(stats.lastPlayedDate, date);
  stats.totalPlayed += 1;
  stats.totalScore += score;
  stats.mostWords = Math.max(stats.mostWords, foundWords.length);
  stats.mostPoints = Math.max(stats.mostPoints, score);
  stats.currentStreak = isConsecutive ? stats.currentStreak + 1 : 1;
  stats.longestStreak = Math.max(stats.longestStreak, stats.currentStreak);
  stats.lastPlayedDate = date;

  saveDailyStats(stats);

  // Store results
  saveDailyResult(date, {
    dailyNumber,
    date,
    foundWords,
    missedWords,
    board,
    score,
    wordCount: foundWords.length,
  });
}

// === Results history (last 7 days) ===

export interface DailyResult {
  dailyNumber: number;
  date: string;
  foundWords: ScoredWord[];
  missedWords: ScoredWord[];
  board: string[][];
  score: number;
  wordCount: number;
}

function loadAllResults(): Record<string, DailyResult> {
  try {
    const raw = localStorage.getItem(RESULTS_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return {};
}

function saveAllResults(results: Record<string, DailyResult>): void {
  try {
    localStorage.setItem(RESULTS_KEY, JSON.stringify(results));
  } catch { /* ignore */ }
}

function saveDailyResult(date: string, result: DailyResult): void {
  const all = loadAllResults();
  all[date] = result;

  // Prune entries older than RESULTS_MAX_DAYS
  const dates = Object.keys(all).sort().reverse();
  const pruned: Record<string, DailyResult> = {};
  for (const d of dates.slice(0, RESULTS_MAX_DAYS)) {
    pruned[d] = all[d];
  }
  saveAllResults(pruned);
}

export function loadDailyResult(date: string): DailyResult | null {
  const all = loadAllResults();
  return all[date] || null;
}

export function hasPlayedDaily(date: string): boolean {
  return !!loadDailyResult(date);
}

export function clearDailyResult(date: string): void {
  const all = loadAllResults();
  delete all[date];
  saveAllResults(all);
}

export function getRecentResults(): DailyResult[] {
  const all = loadAllResults();
  return Object.values(all).sort((a, b) => b.date.localeCompare(a.date));
}
