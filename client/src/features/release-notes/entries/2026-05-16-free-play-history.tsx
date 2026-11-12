import type { ChangelogEntry } from '../types';

function Initial({ char, accent }: { char: string; accent: string }) {
  return (
    <span
      className="inline-flex items-center justify-center rounded-full text-[color:var(--ink-inverse)] font-[family-name:var(--font-structure)] align-middle"
      style={{
        width: '18px',
        height: '18px',
        background: accent,
        fontSize: '10px',
        fontWeight: 800,
      }}
    >
      {char}
    </span>
  );
}

const entry: ChangelogEntry = {
  id: 'free-play-history-2026-05-16',
  date: '2026-05-16',
  kind: 'major',
  title: 'Free play, together',
  body: (
    <>
      <p className="text-center mb-3">
        <Initial char="Y" accent="var(--you-accent)" />{' '}
        <span className="italic font-[family-name:var(--font-display)] mx-1 text-[color:var(--ink-soft)]">
          vs
        </span>{' '}
        <Initial char="?" accent="var(--opp-accent)" />
      </p>
      <p>
        Share any free play board — when your friend finishes, you'll see
        your words side by side with theirs.
      </p>
      <p>
        Plus a new <strong>History</strong> page for every game you've
        played, and a single results view across free play, timed, and zen.
      </p>
    </>
  ),
};

export default entry;
