import type { ChangelogEntry } from './types';

// One file per entry under ./entries/, default-exporting a ChangelogEntry.
// This avoids merge conflicts when multiple branches add entries in parallel:
// each new entry is a new file, so there's no shared array head to fight over.
//
// Filename convention: YYYY-MM-DD-<slug>.tsx. Keep `id` unique across entries
// (the convention naturally enforces this).
const modules = import.meta.glob<{ default: ChangelogEntry }>(
  './entries/*.tsx',
  { eager: true },
);

export const changelogEntries: ChangelogEntry[] = Object.values(modules)
  .map((m) => m.default)
  .sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? 1 : -1;
    return a.id < b.id ? 1 : -1;
  });
