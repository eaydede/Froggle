import { type Kysely } from 'kysely';
import type { Database } from '../../platform/database/types.js';
import { getDefinitions } from '../definitions/service.js';
import type { WordDefinition } from '../definitions/types.js';
import { getDailyConfig } from '../timed-daily/config.js';
import * as repository from './repository.js';
import type { DailyStatsConfig, DailyStatsDay, DailyStatsResponse, StampTier } from './types.js';


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


// Consecutive played days ending at today, walking backward over real
// calendar dates. Today being unplayed does not break the streak (the user
// may not have played yet); the first prior gap ends it. Bounded only by
// launchDate, never by the history window — so a 100-day streak reads as 100,
// not as the window ceiling. This is the regression guard against the
// "streak caps at the window size" bug; keep it independent of windowDays.
export function computeStreak(
  playedDates: Set<string>,
  today: string,
  launchDate: string,
): number {
  let streak = 0;
  let cursor = playedDates.has(today) ? today : addDays(today, -1);
  while (cursor >= launchDate && playedDates.has(cursor)) {
    streak++;
    cursor = addDays(cursor, -1);
  }
  return streak;
}


function stampTierFor(rank: number, totalPlayers: number): StampTier {
  if (rank === 1) return 'first';
  if (rank === 2) return 'second';
  if (rank === 3) return 'third';
  if (rank <= Math.ceil(totalPlayers * 0.3)) return 'top30';
  return null;
}


// Set of dates in the window where the user engaged with any daily mode.
// Used by the unified streak — a played-day signal that doesn't require
// the user to have submitted to a specific mode.
async function getUserPlayedDatesAcrossModes(
  db: Kysely<Database>,
  userId: string,
  windowStart: string,
  windowEnd: string,
): Promise<Set<string>> {
  const dates = new Set<string>();

  const [timed, zen, gauntlet, timeIsMoney] = await Promise.all([
    repository.listTimedDates(db, userId, windowStart, windowEnd),
    repository.listZenDates(db, userId, windowStart, windowEnd),
    repository.listGauntletDates(db, userId, windowStart, windowEnd),
    // Row existence, not `ended_at`, matching zen and gauntlet: the row is
    // written when the player starts, and this set is a played-day signal
    // rather than a completion one.
    repository.listMoneyDates(db, userId, windowStart, windowEnd),
  ]);

  for (const row of timed) dates.add(row.date);
  for (const row of zen) dates.add(row.date);
  for (const row of gauntlet) dates.add(row.date);
  for (const row of timeIsMoney) dates.add(row.date);
  return dates;
}


export async function getDailyStats(
  db: Kysely<Database>,
  userId: string,
  config: DailyStatsConfig
): Promise<DailyStatsResponse> {
  const {
    launchDate,
    today,
    getPuzzleNumber,
    windowDays = 30,
    includeDefinitions = true,
  } = config;

  const windowStart = maxDate(addDays(today, -(windowDays - 1)), launchDate);
  const windowEnd = today;

  // Query 1: this user's rank + aggregates per date they played. In-progress
  // sessions (ended_at is null) are excluded — they don't belong on the
  // leaderboard and they have no final score to rank by yet. Ranked on points
  // alone so equal points share a place (1, 1, 3); this keeps the stamp tier
  // consistent with the leaderboard, where a tie is purely an equal score.
  const rankedRows = await repository.listRankedHistory(db, windowStart, windowEnd, userId);

  // Query 2: total players per date in the window — needed for every day,
  // not just days this user played, so the UI can show player counts on
  // missed/unplayed days too. Excludes in-progress sessions for the same
  // reason as the rank query.
  const playerCountRows = await repository.countPlayers(db, windowStart, windowEnd);

  const userByDate = new Map<string, typeof rankedRows[number]>();
  for (const row of rankedRows) userByDate.set(row.date, row);

  const playersByDate = new Map<string, number>();
  for (const row of playerCountRows) playersByDate.set(row.date, Number(row.players));

  const definitions = includeDefinitions
    ? await getDefinitions(Array.from(
      new Set(rankedRows.map((r) => r.longest_word).filter((w): w is string => !!w)),
    ))
    : new Map<string, WordDefinition | null>();

  const days: DailyStatsDay[] = [];
  for (let d = windowStart; d <= windowEnd; d = addDays(d, 1)) {
    const userRow = userByDate.get(d);
    const playersCount = playersByDate.get(d) ?? 0;

    if (!userRow) {
      // User didn't play this day. "Unplayed" only applies to today; past
      // dates without a row are misses.
      days.push({
        date: d,
        puzzleNumber: getPuzzleNumber(d),
        state: d === today ? 'unplayed' : 'missed',
        points: null,
        wordsFound: null,
        longestWord: null,
        longestWordDefinition: null,
        stampTier: null,
        playersCount,
        config: getDailyConfig(d),
      });
      continue;
    }

    const rank = Number(userRow.rank);
    days.push({
      date: d,
      puzzleNumber: getPuzzleNumber(d),
      state: 'completed',
      points: userRow.points,
      wordsFound: userRow.word_count,
      longestWord: userRow.longest_word,
      longestWordDefinition: definitions.get(userRow.longest_word.toLowerCase()) ?? null,
      stampTier: stampTierFor(rank, playersCount),
      playersCount,
      config: {
        boardSize: userRow.board_size,
        minWordLength: userRow.min_word_length,
        timeLimit: userRow.time_limit,
      },
    });
  }

  // Streak is unified across all daily modes: playing the timed daily,
  // the zen daily, or the gauntlet on a given date all count as a played
  // day. The per-day stats below stay timed-specific (points/longest/etc.
  // only make sense for the timed mode), but the streak signal reflects
  // every form of daily engagement so users aren't punished for choosing
  // a mode that doesn't have streak semantics of its own.
  //
  // Played dates are queried from launchDate (not windowStart) so the streak
  // can run longer than the 30-day history window. The history grid below
  // stays windowed; only the streak walk needs the full play history.
  const playedDates = await getUserPlayedDatesAcrossModes(
    db,
    userId,
    launchDate,
    windowEnd,
  );

  const currentStreak = computeStreak(playedDates, today, launchDate);

  // streakDays: last 7 PST days ending at today, oldest-to-newest.
  // Slicing the tail of `days` works because days is already in that order
  // and the window always ends at today. If the window is shorter than 7
  // (very early post-launch), pad the front with `false`.
  const tail = days.slice(-7);
  const streakDays: boolean[] = [
    ...Array(Math.max(0, 7 - tail.length)).fill(false),
    ...tail.map((d) => playedDates.has(d.date)),
  ];

  // 7-day avg: last 7 PLAYED days anywhere in window. Includes today if
  // played, so a user who just submitted sees it reflected immediately.
  const completed = days.filter((d) => d.state === 'completed');
  const recent = completed.slice(-7);
  const avgPoints = recent.length === 0
    ? 0
    : recent.reduce((s, d) => s + (d.points ?? 0), 0) / recent.length;
  const avgWords = recent.length === 0
    ? 0
    : recent.reduce((s, d) => s + (d.wordsFound ?? 0), 0) / recent.length;

  return {
    currentStreak,
    streakDays,
    avgPoints,
    avgWords,
    windowStart,
    windowEnd,
    days,
  };
}
