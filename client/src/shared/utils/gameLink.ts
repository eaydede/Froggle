/**
 * Encode/decode game configuration into URL search params.
 *
 * Format: /play?c=FIRE-BOLD-LAMP&t=120&m=4&ch=<uuid>
 *   c  = board code (encodes board size + seed via seedCode module)
 *   t  = timer in seconds (-1 for unlimited)
 *   m  = min word length
 *   ch = challenge id (optional). Present when the link is a shared
 *        challenge — players who accept get grouped on the server so a
 *        leaderboard can be rendered for everyone who played.
 */

import { encodeSeedCode, decodeSeedCode } from 'models/seedCode';

export interface SharedGameConfig {
  boardSize: number;
  seed: number;
  timer: number;
  minWordLength: number;
  challengeId?: string;
}

export function encodeGameLink(config: SharedGameConfig): string {
  const code = encodeSeedCode(config.boardSize, config.seed);
  const params = new URLSearchParams({
    c: code,
    t: String(config.timer),
    m: String(config.minWordLength),
  });
  if (config.challengeId) params.set('ch', config.challengeId);
  return `${window.location.origin}/play?${params.toString()}`;
}

export function decodeGameParams(searchParams: URLSearchParams): SharedGameConfig | null {
  const code = searchParams.get('c');
  const timer = parseInt(searchParams.get('t') || '', 10);
  const minWordLength = parseInt(searchParams.get('m') || '', 10);

  if (!code || isNaN(timer) || isNaN(minWordLength)) return null;

  const decoded = decodeSeedCode(code);
  if (!decoded) return null;

  const challengeId = searchParams.get('ch') || undefined;

  return {
    boardSize: decoded.boardSize,
    seed: decoded.seed,
    timer,
    minWordLength,
    challengeId,
  };
}
