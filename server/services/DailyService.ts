import { sql, type Kysely } from 'kysely';
import { scoreWord } from 'engine/scoring.js';
import type { Database } from '../db/types.js';
import { getDailyConfig, type DailyConfig } from './dailyConfig.js';

export interface ScoredResult {
  points: number;
  wordCount: number;
  longestWord: string;
}

// Sums the per-word scores of a word list. Callers that only need the point
// total share this helper instead of reimplementing the reduce inline.
export function scoreWords(foundWords: string[]): number {
  let points = 0;
  for (const word of foundWords) points += scoreWord(word);
  return points;
}

// Computes the aggregates that get persisted alongside a daily_results row.
// Kept pure and trivially testable so the Phase 3 backfill script can reuse it.
// Longest-word tiebreak is alphabetical ascending so the stored value is stable
// regardless of the order words were found in.
export function scoreResult(foundWords: string[]): ScoredResult {
  let longestWord = '';
  for (const word of foundWords) {
    if (
      word.length > longestWord.length ||
      (word.length === longestWord.length && word < longestWord)
    ) {
      longestWord = word;
    }
  }
  return { points: scoreWords(foundWords), wordCount: foundWords.length, longestWord };
}

// ─── Definition lookup ────────────────────────────────────────────────────
//
// Mirrors the WordDefinition shape the results page already renders
// (client/src/pages/results/hooks/useDefinition.ts) so the Daily page and
// Results page can share a single component tree for definition display.

export interface WordDefinition {
  word: string;
  phonetic?: string;
  meanings: Array<{
    partOfSpeech: string;
    definitions: Array<{ definition: string; example?: string }>;
  }>;
}

// Module-level cache. Shared across all users and requests; warms back up on
// restart. No TTL — definitions don't change and the space of "daily longest
// words" is naturally bounded. `null` is cached too so repeated lookups of a
// word neither API knows don't re-fetch.
const definitionCache = new Map<string, WordDefinition | null>();

function parsePrimaryApi(data: unknown): WordDefinition | null {
  const d = data as {
    word: string;
    entries?: {
      partOfSpeech: string;
      pronunciations?: { text?: string }[];
      senses: { definition: string; examples?: string[] }[];
    }[];
  };
  if (!d || !d.entries || d.entries.length === 0) return null;

  const phonetic = d.entries[0]?.pronunciations?.find((p) => p.text)?.text;
  const seen = new Set<string>();
  const meanings: WordDefinition['meanings'] = [];
  for (const entry of d.entries) {
    if (seen.has(entry.partOfSpeech)) continue;
    seen.add(entry.partOfSpeech);
    meanings.push({
      partOfSpeech: entry.partOfSpeech,
      definitions: entry.senses.slice(0, 2).map((s) => ({
        definition: s.definition,
        example: s.examples?.[0],
      })),
    });
  }
  return { word: d.word, phonetic, meanings };
}

function parseFallbackApi(data: unknown): WordDefinition | null {
  const arr = data as {
    word: string;
    phonetic?: string;
    phonetics?: { text?: string }[];
    meanings: {
      partOfSpeech: string;
      definitions: { definition: string; example?: string }[];
    }[];
  }[];
  if (!Array.isArray(arr) || arr.length === 0) return null;

  const entry = arr[0];
  return {
    word: entry.word,
    phonetic: entry.phonetic || entry.phonetics?.find((p) => p.text)?.text,
    meanings: entry.meanings.map((m) => ({
      partOfSpeech: m.partOfSpeech,
      definitions: m.definitions.slice(0, 2).map((d) => ({
        definition: d.definition,
        example: d.example,
      })),
    })),
  };
}

async function fetchDefinitionUncached(word: string): Promise<WordDefinition | null> {
  try {
    const res = await fetch(
      `https://freedictionaryapi.com/api/v1/entries/en/${word}`,
      { signal: AbortSignal.timeout(5000) },
    );
    if (res.ok) {
      const parsed = parsePrimaryApi(await res.json());
      if (parsed) return parsed;
    }
  } catch {
    // Primary failed or timed out; fall through to the backup.
  }

  try {
    const res = await fetch(
      `https://api.dictionaryapi.dev/api/v2/entries/en/${word}`,
      { signal: AbortSignal.timeout(5000) },
    );
    if (res.ok) return parseFallbackApi(await res.json());
  } catch {
    // Both APIs failed — treat the word as undefinable.
  }

  return null;
}

async function getDefinitions(words: string[]): Promise<Map<string, WordDefinition | null>> {
  const result = new Map<string, WordDefinition | null>();
  const misses: string[] = [];

  for (const raw of words) {
    const w = raw.toLowerCase();
    if (result.has(w)) continue;
    if (definitionCache.has(w)) {
      result.set(w, definitionCache.get(w)!);
    } else {
      misses.push(w);
    }
  }

  // Parallel so total latency ≈ slowest single call, not sum of all calls.
  const fetched = await Promise.all(
    misses.map(async (w) => [w, await fetchDefinitionUncached(w)] as const),
  );
  for (const [w, def] of fetched) {
    definitionCache.set(w, def);
    result.set(w, def);
  }
  return result;
}

// ─── Stats endpoint ───────────────────────────────────────────────────────

export type DailyState = 'completed' | 'missed' | 'unplayed';
export type StampTier = 'first' | 'second' | 'third' | 'top30' | null;

export interface DailyStatsDay {
  date: string;
  puzzleNumber: number;
  state: DailyState;
  points: number | null;
  wordsFound: number | null;
  longestWord: string | null;
  longestWordDefinition: WordDefinition | null;
  stampTier: StampTier;
  playersCount: number;
  config: DailyConfig;
}

export interface DailyStatsResponse {
  currentStreak: number;
  streakDays: boolean[];
  avgPoints: number;
  avgWords: number;
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

function stampTierFor(rank: number, totalPlayers: number): StampTier {
  if (rank === 1) return 'first';
  if (rank === 2) return 'second';
  if (rank === 3) return 'third';
  if (rank <= Math.ceil(totalPlayers * 0.3)) return 'top30';
  return null;
}

export async function getDailyStats(
  db: Kysely<Database>,
  userId: string,
  config: DailyStatsConfig
): Promise<DailyStatsResponse> {
  const { launchDate, today, getPuzzleNumber, windowDays = 30 } = config;

  const windowStart = maxDate(addDays(today, -(windowDays - 1)), launchDate);
  const windowEnd = today;

  // Query 1: this user's rank + aggregates per date they played.
  // Tiebreak matches "placed top 3" as presented to users.
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
          'board_size',
          'min_word_length',
          'time_limit',
          sql<number>`rank() over (partition by ${eb.ref('date')} order by ${eb.ref('points')} desc, ${eb.ref('word_count')} desc, ${eb.ref('completed_at')} asc)`.as('rank'),
        ])
        .where('date', '>=', windowStart)
        .where('date', '<=', windowEnd)
    )
    .selectFrom('ranked')
    .select(['date', 'points', 'word_count', 'longest_word', 'board_size', 'min_word_length', 'time_limit', 'rank'])
    .where('user_id', '=', userId)
    .execute();

  // Query 2: total players per date in the window — needed for every day,
  // not just days this user played, so the UI can show player counts on
  // missed/unplayed days too.
  const playerCountRows = await db
    .selectFrom('daily_results')
    .select((eb) => ['date', eb.fn.countAll<number>().as('players')])
    .where('date', '>=', windowStart)
    .where('date', '<=', windowEnd)
    .groupBy('date')
    .execute();

  const userByDate = new Map<string, typeof rankedRows[number]>();
  for (const row of rankedRows) userByDate.set(row.date, row);

  const playersByDate = new Map<string, number>();
  for (const row of playerCountRows) playersByDate.set(row.date, Number(row.players));

  // Fetch definitions once per unique longest word — dedupe before calling.
  const uniqueLongestWords = Array.from(
    new Set(rankedRows.map((r) => r.longest_word).filter((w): w is string => !!w)),
  );
  const definitions = await getDefinitions(uniqueLongestWords);

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

  // Streak: walk backwards from today; today missing is not a break yet.
  let currentStreak = 0;
  for (let i = days.length - 1; i >= 0; i--) {
    const day = days[i];
    if (i === days.length - 1 && day.state === 'unplayed') continue;
    if (day.state !== 'completed') break;
    currentStreak++;
  }

  // streakDays: last 7 PST days ending at today, oldest-to-newest.
  // Slicing the tail of `days` works because days is already in that order
  // and the window always ends at today. If the window is shorter than 7
  // (very early post-launch), pad the front with `false`.
  const tail = days.slice(-7);
  const streakDays: boolean[] = [
    ...Array(Math.max(0, 7 - tail.length)).fill(false),
    ...tail.map((d) => d.state === 'completed'),
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
