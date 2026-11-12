import { createHash } from 'node:crypto';

const ADJECTIVES = [
  'Cheerful', 'Brave', 'Plucky', 'Quiet', 'Sneaky', 'Mellow', 'Gentle', 'Lively',
  'Curious', 'Nimble', 'Sleepy', 'Sunny', 'Witty', 'Cosy', 'Lucky', 'Breezy',
  'Drowsy', 'Bouncy', 'Snappy', 'Jolly', 'Daring', 'Spry', 'Earnest', 'Tidy',
  'Dapper', 'Smug', 'Crafty', 'Humble', 'Rowdy', 'Eager',
];

const NOUNS = [
  'Otter', 'Fox', 'Heron', 'Pebble', 'Comet', 'Lantern', 'Maple', 'Willow',
  'Pinecone', 'Acorn', 'Sparrow', 'Beetle', 'Marmot', 'Pelican', 'Compass',
  'Boulder', 'Glacier', 'Meadow', 'Ferret', 'Falcon', 'Lemur', 'Walrus',
  'Penguin', 'Mongoose', 'Finch', 'Cricket', 'Iguana', 'Wombat', 'Hedgehog',
  'Toucan',
];

function todayUtcIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Deterministic AdjectiveNoun for a user, seeded by user id + date so the
 * masked identity rotates daily and can't be farmed as a stable handle.
 */
export function getMaskedName(userId: string, dateIsoYmd: string = todayUtcIso()): string {
  const hash = createHash('sha256').update(`${userId}:${dateIsoYmd}`).digest();
  const adj = ADJECTIVES[hash[0] % ADJECTIVES.length];
  const noun = NOUNS[hash[1] % NOUNS.length];
  return `${adj} ${noun}`;
}
