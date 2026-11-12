import { type GameConfig } from 'models';
export const ROOM_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export const ROOM_CODE_LENGTH = 5;

export const ROOM_TTL_MS = 6 * 60 * 60 * 1000;

export const DEFAULT_CONFIG: GameConfig = {
  durationSeconds: 60,
  boardSize: 4,
  minWordLength: 3,
};

export const GRACE_PERIOD_MS = 500;

export const COUNTDOWN_MS = 3000;

export const COUNTDOWN_STEP_MS = 1000;

export function sanitizeConfig(input: unknown): Partial<GameConfig> {
  const raw = (input ?? {}) as Partial<GameConfig>;
  const out: Partial<GameConfig> = {};
  if (typeof raw.boardSize === 'number' && [4, 5, 6].includes(raw.boardSize)) {
    out.boardSize = raw.boardSize;
  }
  if (typeof raw.durationSeconds === 'number') {
    // Finite timers only (30..600s). Unlike solo free-play, a multiplayer
    // round has no per-player engine timer — the board's countdown is the
    // sole backstop that ends it if players drop — so a no-timer (Zen) round
    // could hang forever. Out-of-range/non-positive values are dropped, so
    // the config keeps its prior finite value (default 180s).
    const v = Math.floor(raw.durationSeconds);
    if (v >= 30 && v <= 600) out.durationSeconds = v;
  }
  if (typeof raw.minWordLength === 'number' && raw.minWordLength >= 3 && raw.minWordLength <= 6) {
    out.minWordLength = Math.floor(raw.minWordLength);
  }
  return out;
}

export const NUDGE_COOLDOWN_MS = 10_000;
