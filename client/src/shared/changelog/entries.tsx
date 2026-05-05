import type { ChangelogEntry } from './types';

function RarityDot({ color }: { color: string }) {
  return (
    <span
      aria-hidden="true"
      className="inline-block w-2 h-2 rounded-full align-baseline mr-1"
      style={{ background: color }}
    />
  );
}

// Newest first. `kind: 'major'` auto-pops the modal once for users who haven't
// dismissed that entry yet; `kind: 'minor'` only lights the notification dot.
// Body accepts any ReactNode — use <strong>, <em>, <a>, <ul>/<li>, <code>, and
// <p> blocks freely; the modal styles them for you.
export const changelogEntries: ChangelogEntry[] = [
  {
    id: 'scoring-fibonacci-2026-05-04',
    date: '2026-05-04',
    kind: 'major',
    title: 'New scoring',
    body: (
      <>
        <ul>
          <li>
            <RarityDot color="var(--rarity-common)" /> 3 letters:{' '}
            <strong>1</strong> <em>(was 1)</em>
          </li>
          <li>
            <RarityDot color="var(--rarity-uncommon)" /> 4 letters:{' '}
            <strong>2</strong> <em>(was 1)</em> — <strong>new color!</strong>
          </li>
          <li>
            <RarityDot color="var(--rarity-rare)" /> 5 letters:{' '}
            <strong>3</strong> <em>(was 2)</em>
          </li>
          <li>
            <RarityDot color="var(--rarity-epic)" /> 6 letters:{' '}
            <strong>5</strong> <em>(was 3)</em>
          </li>
          <li>
            <RarityDot color="var(--rarity-mythic)" /> 7 letters:{' '}
            <strong>8</strong> <em>(was 5)</em>
          </li>
          <li>
            <RarityDot color="var(--rarity-legendary)" /> 8+ letters:{' '}
            <strong>13</strong> <em>(was 11)</em>
          </li>
        </ul>
        <p>
          Mid-length words are worth more. 4-letter words now have their own
          color and everything else shifts up the ladder — orange stays the
          prize for the longest finds. Past results were re-scored so
          leaderboards stay comparable.
        </p>
      </>
    ),
  },
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
