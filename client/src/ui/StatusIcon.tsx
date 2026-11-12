type StatusIconState = 'unplayed' | 'in-progress' | 'completed';

export function StatusIcon({ state }: { state: StatusIconState }) {
  const label =
    state === 'completed' ? 'Completed' : state === 'in-progress' ? 'In progress' : 'Not started';
  const colorClass =
    state === 'completed'
      ? 'text-[color:var(--completion)]'
      : 'text-[color:var(--ink-muted)]';

  return (
    <span
      role="img"
      aria-label={label}
      className={`inline-flex shrink-0 leading-none ${colorClass}`}
    >
      {state === 'completed' ? (
        <CompletedIcon />
      ) : state === 'in-progress' ? (
        <InProgressIcon />
      ) : (
        <UnplayedIcon />
      )}
    </span>
  );
}

function CompletedIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" aria-hidden>
      <circle cx="12" cy="12" r="10" fill="currentColor" />
      <polyline
        points="7.5,12.5 10.5,15.5 16.5,9"
        fill="none"
        stroke="var(--surface-card)"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function InProgressIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" aria-hidden>
      <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M12 2 A10 10 0 0 1 12 22 Z" fill="currentColor" />
    </svg>
  );
}

function UnplayedIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" aria-hidden className="opacity-50">
      <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}
