import { sql, type Kysely } from 'kysely';
import { scoreWord } from 'engine/scoring.js';
import type { Database } from '../db/types.js';

export interface ScoredResult {
  points: number;
  wordCount: number;
  longestWord: string;
}

// Computes the aggregates that get persisted alongside a daily_results row.
// Kept pure and trivially testable so the Phase 3 backfill script can reuse it.
// Longest-word tiebreak is alphabetical ascending so the stored value is stable
// regardless of the order words were found in.
export function scoreResult(foundWords: string[]): ScoredResult {
  let points = 0;
  let longestWord = '';
  for (const word of foundWords) {
    points += scoreWord(word);
    if (
      word.length > longestWord.length ||
      (word.length === longestWord.length && word < longestWord)
    ) {
      longestWord = word;
    }
  }
  return { points, wordCount: foundWords.length, longestWord };
}

export interface DailyStatsDay {
  date: string;
  puzzleNumber: number;
  played: boolean;
  result: {
    points: number;
    wordsFound: number;
    longestWord: string;
    rank: number;
    totalPlayers: number;
    placedTop3: boolean;
    placedTop30Percent: boolean;
  } | null;
}

export interface DailyStatsResponse {
  streak: number;
  sevenDayAvg: { points: number; wordsFound: number };
  windowStart: string;
  windowEnd: string;
  days: DailyStatsDay[];
}

export interface DailyStatsConfig {
  launchDate: string;
  today: string;
  getPuzzleNumber: (date: string) => number;
  windowDays?: number;
}

// Pure PST calendar arithmetic on YYYY-MM-DD strings. Noon UTC avoids
// any DST edge cases when adding days.
function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function maxDate(a: string, b: string): string {
  return a >= b ? a : b;
}

export async function getDailyStats(
  db: Kysely<Database>,
  userId: string,
  config: DailyStatsConfig
): Promise<DailyStatsResponse> {
  const { launchDate, today, getPuzzleNumber, windowDays = 30 } = config;

  const windowStart = maxDate(addDays(today, -(windowDays - 1)), launchDate);
  const windowEnd = today;

  // Single query: per-day rank + total_players, filtered to this user's rows.
  // Tiebreak order matches what "placed top 3" promises to users:
  // points DESC, word_count DESC, earliest completion wins.
  // Window functions go through sql fragments since Kysely has no first-class
  // window-function builder, but the CTE and column wiring stay type-safe.
  const rankedRows = await db
    .with('ranked', (qb) =>
      qb
        .selectFrom('daily_results')
        .select((eb) => [
          'user_id',
          'date',
          'points',
          'word_count',
          'longest_word',
          sql<number>`rank() over (partition by ${eb.ref('date')} order by ${eb.ref('points')} desc, ${eb.ref('word_count')} desc, ${eb.ref('completed_at')} asc)`.as('rank'),
          sql<number>`count(*) over (partition by ${eb.ref('date')})`.as('total_players'),
        ])
        .where('date', '>=', windowStart)
        .where('date', '<=', windowEnd)
    )
    .selectFrom('ranked')
    .select(['date', 'points', 'word_count', 'longest_word', 'rank', 'total_players'])
    .where('user_id', '=', userId)
    .execute();

  const byDate = new Map<string, typeof rankedRows[number]>();
  for (const row of rankedRows) byDate.set(row.date, row);

  const days: DailyStatsDay[] = [];
  for (let d = windowStart; d <= windowEnd; d = addDays(d, 1)) {
    const row = byDate.get(d);
    if (!row) {
      days.push({
        date: d,
        puzzleNumber: getPuzzleNumber(d),
        played: false,
        result: null,
      });
      continue;
    }

    // Postgres returns bigint for count(); rank() is int but Kysely types it
    // loosely. Coerce both defensively in case the driver hands back strings.
    const rank = Number(row.rank);
    const totalPlayers = Number(row.total_players);
    days.push({
      date: d,
      puzzleNumber: getPuzzleNumber(d),
      played: true,
      result: {
        points: row.points,
        wordsFound: row.word_count,
        longestWord: row.longest_word,
        rank,
        totalPlayers,
        placedTop3: rank <= 3,
        // Ceiling so the single-player case (1 of 1) still counts as top 30%.
        placedTop30Percent: rank <= Math.ceil(totalPlayers * 0.3),
      },
    });
  }

  // Streak: walk backwards from today; today missing is not a break yet.
  // Starting point is today if played, else yesterday.
  let streak = 0;
  for (let i = days.length - 1; i >= 0; i--) {
    const day = days[i];
    if (i === days.length - 1 && !day.played) continue; // today unplayed: OK
    if (!day.played) break;
    streak++;
  }

  // 7-day avg: last 7 PLAYED days (any time in window).
  const playedDays = days.filter((d) => d.played);
  const recentPlayed = playedDays.slice(-7);
  const sevenDayAvg = recentPlayed.length === 0
    ? { points: 0, wordsFound: 0 }
    : {
        points: recentPlayed.reduce((s, d) => s + (d.result?.points ?? 0), 0) / recentPlayed.length,
        wordsFound: recentPlayed.reduce((s, d) => s + (d.result?.wordsFound ?? 0), 0) / recentPlayed.length,
      };

  return { streak, sevenDayAvg, windowStart, windowEnd, days };
}
