// Dictionary loaders for the test bench. Both the main thread and the worker
// can call these. Vite's dev server exposes these endpoints via a custom
// middleware (see vite.config.ts) — they exist only in development.

export async function fetchDictionary(): Promise<Set<string>> {
  const res = await fetch('/calibration/enable1.txt');
  if (!res.ok) throw new Error(`Failed to load enable1.txt: ${res.status}`);
  const text = await res.text();
  const set = new Set<string>();
  for (const line of text.split('\n')) {
    const w = line.trim().toLowerCase();
    if (w) set.add(w);
  }
  return set;
}

export async function fetchCommonWords(dict: Set<string>): Promise<Set<string>> {
  const res = await fetch('/calibration/mit10k.txt');
  if (!res.ok) throw new Error(`Failed to load mit10k.txt: ${res.status}`);
  const text = await res.text();
  const set = new Set<string>();
  for (const line of text.split('\n')) {
    const w = line.trim().toLowerCase();
    if (w && dict.has(w)) set.add(w);
  }
  return set;
}

export function commonByLengthBucket(common: Set<string>): Record<string, number> {
  const counts: Record<string, number> = { '3': 0, '4': 0, '5': 0, '6': 0, '7+': 0 };
  for (const w of common) {
    const len = w.length;
    const bucket = len <= 3 ? '3' : len === 4 ? '4' : len === 5 ? '5' : len === 6 ? '6' : '7+';
    counts[bucket]++;
  }
  return counts;
}
