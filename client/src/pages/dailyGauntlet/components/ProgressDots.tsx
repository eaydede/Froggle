// Three-step progress indicator on the gauntlet confirm page. Past
// rounds (in completedRounds) render as tappable buttons so the player
// can revisit a prior round's results mid-gauntlet without aborting
// the run. The current round is the wider accent pill.
export function ProgressDots({
  current,
  total,
  completedRounds,
  onViewRoundResult,
}: {
  current: number;
  total: number;
  completedRounds: number[];
  onViewRoundResult: (index: number) => void;
}) {
  const doneSet = new Set(completedRounds);
  return (
    <div
      className="flex items-center justify-center gap-2"
      aria-label={`Round ${current + 1} of ${total}`}
    >
      {Array.from({ length: total }, (_, i) => {
        const done = doneSet.has(i);
        const active = i === current;
        if (done && !active) {
          return (
            <button
              key={`r${i}`}
              type="button"
              onClick={() => onViewRoundResult(i)}
              aria-label={`See round ${i + 1} result`}
              className="block h-1.5 w-4 rounded-full bg-[var(--ink)] transition-transform duration-150 hover:scale-y-150 cursor-pointer border-none p-0"
              style={{ WebkitTapHighlightColor: 'transparent' }}
            />
          );
        }
        return (
          <span
            key={`r${i}`}
            className={`block h-1.5 rounded-full transition-colors duration-200 ${
              active ? 'w-8 bg-[var(--accent)]' : 'w-4 bg-[var(--ink-trace)]'
            }`}
            aria-hidden
          />
        );
      })}
    </div>
  );
}
