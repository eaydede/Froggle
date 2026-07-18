import type { InvalidSubmission } from 'models';

// Per-game bound on stored rejected attempts. Generous — a normal game logs a
// handful of typos — so a runaway scribbler can't grow the row without limit.
// Enforced as a most-recent window, so a long game keeps its latest activity.
export const MAX_INVALID_SUBMISSIONS = 500;

// jsonb comes back parsed (an array) from the driver, but the same value can
// surface as a JSON string on some query paths — accept both, like word_times.
export function parseInvalidSubmissions(raw: unknown): InvalidSubmission[] {
  if (Array.isArray(raw)) return raw as InvalidSubmission[];
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

export function appendInvalidSubmission(
  existing: unknown,
  attempt: InvalidSubmission,
  cap = MAX_INVALID_SUBMISSIONS,
): InvalidSubmission[] {
  const list = parseInvalidSubmissions(existing);
  list.push(attempt);
  if (list.length > cap) list.splice(0, list.length - cap);
  return list;
}
