import { useCallback, useMemo, useState } from 'react';
import { changelogEntries } from './entries';
import type { ChangelogEntry } from './types';

const SEEN_KEY = 'froggle-changelog-seen';

const loadSeen = (): string[] => {
  try {
    const raw = localStorage.getItem(SEEN_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
};

const saveSeen = (ids: string[]): void => {
  try {
    localStorage.setItem(SEEN_KEY, JSON.stringify(ids));
  } catch {
    // localStorage can throw in private mode / quota — non-fatal.
  }
};

interface UseChangelog {
  entries: ChangelogEntry[];
  hasUnseen: boolean;
  hasUnseenMajor: boolean;
  markAllSeen: () => void;
}

export function useChangelog(): UseChangelog {
  const [seen, setSeen] = useState<Set<string>>(() => new Set(loadSeen()));

  const unseenEntries = useMemo(
    () => changelogEntries.filter((e) => !seen.has(e.id)),
    [seen],
  );

  const markAllSeen = useCallback(() => {
    const allIds = changelogEntries.map((e) => e.id);
    setSeen(new Set(allIds));
    saveSeen(allIds);
  }, []);

  return {
    entries: changelogEntries,
    hasUnseen: unseenEntries.length > 0,
    hasUnseenMajor: unseenEntries.some((e) => e.kind === 'major'),
    markAllSeen,
  };
}
