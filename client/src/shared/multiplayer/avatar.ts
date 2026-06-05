// Deterministic avatar styling for a multiplayer player.
//
// Color is derived from the stable player id so the same person reads as
// the same hue everywhere (player strip, last-round card, results). Host
// and "you" get semantic overrides at the call site — this module only
// owns the neutral identity palette.

const AVATAR_VARS = [
  'var(--avatar-1)',
  'var(--avatar-2)',
  'var(--avatar-3)',
  'var(--avatar-4)',
  'var(--avatar-5)',
  'var(--avatar-6)',
] as const;

function hashId(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  return hash;
}

/** Background color for a player's avatar. Pass isYou/isHost to apply the
 *  semantic green / gold; otherwise an id-derived identity hue. */
export function avatarColor(
  id: string,
  opts: { isYou?: boolean; isHost?: boolean } = {},
): string {
  if (opts.isHost) return 'var(--podium-gold)';
  if (opts.isYou) return 'var(--logo-dot)';
  return AVATAR_VARS[hashId(id) % AVATAR_VARS.length];
}

/** First character of a display name, upper-cased, for the avatar glyph.
 *  Falls back to a bullet for empty names so the circle never renders
 *  blank. */
export function avatarInitial(displayName: string): string {
  const trimmed = displayName.trim();
  return trimmed ? trimmed[0].toUpperCase() : '•';
}
