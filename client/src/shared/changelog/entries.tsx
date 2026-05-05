import type { ChangelogEntry } from './types';

// Newest first. `kind: 'major'` auto-pops the modal once for users who haven't
// dismissed that entry yet; `kind: 'minor'` only lights the notification dot.
// Body accepts any ReactNode — use <strong>, <em>, <a>, <ul>/<li>, <code>, and
// <p> blocks freely; the modal styles them for you.
export const changelogEntries: ChangelogEntry[] = [
  {
    id: 'changelog-launch-2026-05-04',
    date: '2026-05-04',
    kind: 'minor',
    title: "What's new lives here",
    body: (
      <>
        <p>
          Tap the sparkle on the top left of the landng page to see what&apos;s changed — new features,
          fixes, and the occasional tweak.
        </p>
        <p>
          <strong>Big updates</strong> pop open on their own. Smaller ones just
          light up the gold dot.
        </p>
      </>
    ),
  },
];
