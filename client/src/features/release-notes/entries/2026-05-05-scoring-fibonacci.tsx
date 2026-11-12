import type { ChangelogEntry } from '../types';

function RarityDot({ color }: { color: string }) {
  return (
    <span
      aria-hidden="true"
      className="inline-block w-2 h-2 rounded-full align-baseline mr-1"
      style={{ background: color }}
    />
  );
}

const entry: ChangelogEntry = {
  id: 'scoring-fibonacci-2026-05-05',
  date: '2026-05-05',
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
};

export default entry;
