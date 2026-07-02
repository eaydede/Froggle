// Experimental daily modes — a rotating group of prototype game variants that
// share one table, one service, one route, and one set of screens. Each variant
// is declared here and "plugged in" via server/client twist logic keyed by the
// same `mode_key`. Players thumbs up/down each mode per day so we can collect a
// signal on whether the experience felt good before promoting a mode to a
// permanent home (its own Zen/Gauntlet-style stack) or retiring it.
//
// This file is the shared, declarative half of the registry: the parts both the
// server and client agree on (identity, copy, board config, which stat headlines
// the result). The behavioural halves live next to the code that needs them —
// server-side scoring/validation in server/services/experimental, client-side
// rendering in client/src/pages/dailyExperimental.

export type ExperimentalModeKey = 'time-is-money' | 'golden-ticket';

// The metric that headlines the result screen + drives the ranking display.
// Ordering is always by points under the hood (see note below); this only
// changes how the value is presented.
export type ExperimentalHeroStat = 'points' | 'timeSurvived';

export interface ExperimentalModeMeta {
  key: ExperimentalModeKey;
  // Shown on the hub tile and as the page title.
  name: string;
  // One-line hook under the name on the hub tile.
  tagline: string;
  // One-sentence rule shown on the overview screen. Kept intentionally short —
  // the overview is a start gate, not a tutorial, so a single sentence carries
  // the mode's twist and everything else is discovered in play. Mirrors the
  // gauntlet's ModifierCard description in density.
  rule: string;
  boardSize: number;
  minWordLength: number;
  // Base timer in seconds. For Time is Money this is the starting time before
  // found words extend it; for other modes it's the plain countdown.
  timeLimit: number;
  heroStat: ExperimentalHeroStat;
}

// Ordered list drives the hub tile layout. Keep the record + order in sync.
export const EXPERIMENTAL_MODE_ORDER: readonly ExperimentalModeKey[] = [
  'time-is-money',
  'golden-ticket',
];

// Time is Money: how many seconds each point a found word is worth adds to the
// clock. Single source of truth so the server's clock math, the client timer,
// and the time-survived display all agree — bump here to retune the payout.
export const TIME_IS_MONEY_SECONDS_PER_POINT = 2;

// Golden Ticket: the character used in the board array to mark the wildcard
// cell. Chosen so it doesn't collide with any real letter and reads
// unambiguously in logs. Rendering swaps it out for a proper star glyph.
export const GOLDEN_TILE = '★';

// The wildcard cell for a given board size. Always the geometric center — the
// mode is defined around a 5x5 board so the center is [2][2], but this stays a
// helper in case we later run it at other sizes.
export function goldenCell(boardSize: number): { row: number; col: number } {
  const c = Math.floor(boardSize / 2);
  return { row: c, col: c };
}

export const EXPERIMENTAL_MODES: Record<ExperimentalModeKey, ExperimentalModeMeta> = {
  'time-is-money': {
    key: 'time-is-money',
    name: 'Time is Money',
    tagline: 'Every word buys you more time.',
    rule: 'Each word adds two seconds to the clock for every point it scores.',
    boardSize: 5,
    minWordLength: 3,
    timeLimit: 60,
    heroStat: 'timeSurvived',
  },
  'golden-ticket': {
    key: 'golden-ticket',
    name: 'Golden Ticket',
    tagline: 'The center tile is a wildcard.',
    rule: 'Draw through the center tile and every letter that completes the word scores at once.',
    boardSize: 5,
    minWordLength: 5,
    timeLimit: 120,
    heroStat: 'points',
  },
};

// ─── Per-mode persisted state (the `state` jsonb column) ────────────────────
//
// Each mode stores whatever extra bookkeeping it needs to stay self-describing
// on resume and on the results screen. Discriminated on `mode_key` so the
// server and client can narrow it. Modes with no extra state use `{}`.
//
// Time is Money and Golden Ticket both keep no per-session state — the added
// time is derived from the point total, and the golden cell is deterministic
// from the board size. `found_words` covers everything.
export type ExperimentalModeState = Record<string, never>;

// ─── Voting ─────────────────────────────────────────────────────────────────

// Three-way reaction to how the day's experience felt: a smile, a shrug, or a
// frown. `meh` is the neutral middle so a player can register indifference
// rather than being forced into a like/dislike.
export type VoteSentiment = 'up' | 'meh' | 'down';

// The player's own vote for a mode on a given day, or null if they haven't
// voted yet. Tallies are intentionally not surfaced to players — the signal is
// for us, not a public score.
export interface ExperimentalVoteState {
  sentiment: VoteSentiment | null;
}
