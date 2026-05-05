import { useEffect, useRef, useState } from 'react';
import { useChangelog } from '../../../shared/changelog';
import type { ChangelogEntry } from '../../../shared/changelog';

function formatDate(iso: string): string {
  const d = new Date(iso + 'T12:00:00');
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function ChangelogControl() {
  const { entries, seen, hasUnseen, hasUnseenMajor, markAllSeen } = useChangelog();
  const [open, setOpen] = useState(false);
  const autoOpenedRef = useRef(false);
  // Snapshot the seen set when the modal opens, so the "New" pill keeps
  // marking the entries that were unseen at open-time even though the close
  // handler will mark them seen.
  const [seenAtOpen, setSeenAtOpen] = useState<Set<string>>(() => new Set());

  const handleOpen = () => {
    setSeenAtOpen(new Set(seen));
    setOpen(true);
  };

  useEffect(() => {
    if (autoOpenedRef.current) return;
    autoOpenedRef.current = true;
    if (hasUnseenMajor) {
      setSeenAtOpen(new Set(seen));
      setOpen(true);
    }
  }, [hasUnseenMajor, seen]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const handleClose = () => {
    setOpen(false);
    markAllSeen();
  };

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        aria-label={hasUnseen ? "What's new (unread updates)" : "What's new"}
        className="relative w-[34px] h-[34px] rounded-[10px] flex items-center justify-center bg-transparent border-none text-[color:var(--ink)] cursor-pointer"
        style={{ WebkitTapHighlightColor: 'transparent' }}
      >
        <SparklesIcon />
        {hasUnseen && (
          <span
            aria-hidden="true"
            className="absolute top-[2px] right-[2px] w-2.5 h-2.5 rounded-full bg-[var(--podium-gold)] animate-[changelog-dot-pulse_2.2s_ease-out_infinite]"
          />
        )}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[150] flex items-center justify-center p-6 bg-black/40 backdrop-blur-md font-[family-name:var(--font-ui)]"
          onClick={handleClose}
          role="dialog"
          aria-modal="true"
          aria-label="What's new"
        >
          <div
            className="w-full max-w-[340px] max-h-[80vh] rounded-2xl bg-[var(--surface-card)] shadow-[var(--shadow-card)] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="flex flex-col items-center pt-6 pb-4 px-6 border-b border-[var(--ink-border-subtle)]">
              <div
                className="text-title italic leading-none tracking-[-0.01em] font-[family-name:var(--font-display)] text-[color:var(--ink)]"
                style={{ fontWeight: 600 }}
              >
                What&apos;s new
                <span className="inline-block w-[5px] h-[5px] rounded-full bg-[var(--logo-dot)] ml-[2px] align-baseline mb-[3px]" />
              </div>
              <div
                className="mt-2 text-caption uppercase tracking-[0.12em] text-[color:var(--ink-soft)] font-[family-name:var(--font-structure)]"
                style={{ fontWeight: 600 }}
              >
                the changelog
              </div>
            </header>

            <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-6">
              {entries.length === 0 ? (
                <p className="text-body text-[color:var(--ink-soft)] text-center">
                  Nothing yet — check back soon.
                </p>
              ) : (
                entries.map((entry) => (
                  <EntryView
                    key={entry.id}
                    entry={entry}
                    isNew={!seenAtOpen.has(entry.id)}
                  />
                ))
              )}
            </div>

            <div className="px-6 py-4 border-t border-[var(--ink-border-subtle)]">
              <button
                type="button"
                onClick={handleClose}
                className="w-full rounded-xl py-3 text-sm border-none cursor-pointer bg-[var(--ink)] text-[color:var(--ink-inverse)] shadow-[var(--shadow-btn-primary)]"
                style={{ fontWeight: 700, WebkitTapHighlightColor: 'transparent' }}
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function EntryView({ entry, isNew }: { entry: ChangelogEntry; isNew: boolean }) {
  return (
    <article className="flex flex-col gap-1.5">
      <header className="flex items-center justify-between gap-3">
        <span
          className="text-caption uppercase tracking-[0.12em] text-[color:var(--ink-soft)] tabular-nums font-[family-name:var(--font-structure)]"
          style={{ fontWeight: 600 }}
        >
          {formatDate(entry.date)}
        </span>
        {isNew && (
          <span
            className="text-caption uppercase tracking-[0.12em] text-[color:var(--podium-gold)] font-[family-name:var(--font-structure)]"
            style={{ fontWeight: 700 }}
          >
            New
          </span>
        )}
      </header>
      <h3
        className="text-heading italic leading-tight font-[family-name:var(--font-display)] text-[color:var(--ink)]"
        style={{ fontWeight: 600 }}
      >
        {entry.title}
      </h3>
      <div
        className={[
          'text-body leading-relaxed text-[color:var(--ink-muted)] flex flex-col gap-2',
          '[&_p]:m-0',
          '[&_strong]:text-[color:var(--ink)] [&_strong]:font-semibold',
          '[&_em]:italic',
          '[&_a]:text-[color:var(--accent)] [&_a]:underline [&_a]:underline-offset-2',
          '[&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-0 [&_ul]:flex [&_ul]:flex-col [&_ul]:gap-1',
          '[&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:my-0 [&_ol]:flex [&_ol]:flex-col [&_ol]:gap-1',
          '[&_li]:marker:text-[color:var(--ink-faint)]',
          '[&_code]:font-mono [&_code]:text-small [&_code]:bg-[var(--ink-whisper)] [&_code]:rounded [&_code]:px-1 [&_code]:py-0.5',
        ].join(' ')}
      >
        {entry.body}
      </div>
    </article>
  );
}

function SparklesIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 3l1.6 5.4L19 10l-5.4 1.6L12 17l-1.6-5.4L5 10l5.4-1.6L12 3z" />
      <path d="M18.5 15.5l.7 2.1 2.1.7-2.1.7-.7 2.1-.7-2.1-2.1-.7 2.1-.7.7-2.1z" />
    </svg>
  );
}
