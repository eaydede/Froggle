import { findDefinition } from './repository.js';
import type { WordDefinition } from './types.js';


// Module-level cache. Shared across all users and requests; warms back up on
// restart. No TTL — definitions don't change and the space of "daily longest
// words" is naturally bounded. `null` is cached too so repeated lookups of a
// word neither API knows don't re-fetch.
const definitionCache = new Map<string, WordDefinition | null>();


export async function getDefinitions(words: string[]): Promise<Map<string, WordDefinition | null>> {
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
    misses.map(async (w) => [w, await findDefinition(w)] as const),
  );
  for (const [w, def] of fetched) {
    definitionCache.set(w, def);
    result.set(w, def);
  }
  return result;
}
