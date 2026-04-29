import { useEffect, useMemo, useRef } from 'react';
import type { DailyEntry } from '../../pages/daily/types';

interface DateTimelinePickerProps {
  open: boolean;
  onClose: () => void;
  onSelect: (dateIso: string) => void;
  entries: DailyEntry[];
  /** ISO `YYYY-MM-DD` of the currently selected day (for the header). */
  selectedDate: string;
  /** ISO `YYYY-MM-DD` for today — drives the "Now" pill + today ring. */
  todayDate: string;
  /** When true, tapping a missed-state day is disabled (e.g., on the
   *  daily results page where we can't render a day that was never
   *  played). Defaults to false — every row is tappable. */
  disableMissed?: boolean;
  /** Optional share button in the topbar. */
  onShare?: () => void;
}

interface WeekGroup {
  label: string;
  entries: DailyEntry[];
}

const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function startOfWeek(d: Date): Date {
  // Sunday as week start, to match the mockup header "This week".
  const day = d.getDay();
  const s = new Date(d);
  s.setHours(0, 0, 0, 0);
  s.setDate(s.getDate() - day);
  return s;
}

function weeksBetween(a: Date, b: Date): number {
  const ms = startOfWeek(b).getTime() - startOfWeek(a).getTime();
  return Math.round(ms / (7 * 24 * 60 * 60 * 1000));
}

function formatSelected(dateIso: string): string {
  const d = new Date(dateIso + 'T12:00:00');
  return d.toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function groupByWeek(entries: DailyEntry[], today: Date): WeekGroup[] {
  // Newest first — the mockup reads top-down from today backwards.
  const sorted = [...entries].sort((a, b) => b.date.getTime() - a.date.getTime());

  const groups: WeekGroup[] = [];
  let currentWeek: Date | null = null;
  let currentGroup: WeekGroup | null = null;

  for (const entry of sorted) {
    const weekStart = startOfWeek(entry.date);
    if (!currentWeek || weekStart.getTime() !== currentWeek.getTime()) {
      currentWeek = weekStart;
      const weeksAgo = weeksBetween(weekStart, today);
      const label =
        weeksAgo === 0
          ? `This week · ${weekStart.toLocaleString('en-US', { month: 'long', year: 'numeric' })}`
          : weeksAgo === 1
            ? 'Last week'
            : `${weeksAgo} weeks ago`;
      currentGroup = { label, entries: [] };
      groups.push(currentGroup);
    }
    currentGroup!.entries.push(entry);
  }
  return groups;
}

export function DateTimelinePicker({
  open,
  onClose,
  onSelect,
  entries,
  selectedDate,
  todayDate,
  disableMissed = false,
  onShare,
}: DateTimelinePickerProps) {
  const today = useMemo(() => new Date(todayDate + 'T12:00:00'), [todayDate]);
  const groups = useMemo(() => groupByWeek(entries, today), [entries, today]);

  // Close on Escape while the picker is open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  // Scroll the selected row into view when the picker opens.
  const listRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const el = listRef.current?.querySelector(`[data-date="${selectedDate}"]`) as HTMLElement | null;
    el?.scrollIntoView({ block: 'center' });
  }, [open, selectedDate]);

  // `inert` blocks focus + hides from assistive tech in one go. Using it
  // instead of aria-hidden avoids the "aria-hidden on a focused ancestor"
  // warning when a date button retains focus across the close transition.
  const rootRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (rootRef.current) rootRef.current.inert = !open;
  }, [open]);

  return (
    <div
      ref={rootRef}
      onClick={onClose}
      className={[
        'fixed inset-0 z-[150] flex justify-center bg-[var(--surface-panel)] text-[color:var(--ink)] font-[family-name:var(--font-ui)] transition-opacity duration-200',
        open ? 'opacity-100' : 'opacity-0 pointer-events-none',
      ].join(' ')}
    >
      <div className="w-full max-w-[360px] min-h-0 flex flex-col px-[22px] pt-[14px] pb-5">
        <div
          className="grid items-center gap-2.5 pt-3.5 shrink-0"
          style={{ gridTemplateColumns: '32px 1fr 32px' }}
        >
          <IconAction onClick={onClose} label="Close date picker">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </IconAction>
          <span aria-hidden />
          {onShare ? (
            <IconAction onClick={onShare} label="Share">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                <polyline points="16 6 12 2 8 6" />
                <line x1="12" y1="2" x2="12" y2="15" />
              </svg>
            </IconAction>
          ) : (
            <span aria-hidden />
          )}
        </div>

        <div
          onClick={(e) => e.stopPropagation()}
          className="mt-2.5 flex-1 min-h-0 flex flex-col rounded-xl bg-[var(--surface-card)] border border-[var(--ink-border-subtle)] shadow-[var(--shadow-card)] overflow-hidden"
        >
          <button
            type="button"
            onClick={onClose}
            className="flex items-center justify-between px-3.5 py-[11px] border-b border-[var(--ink-border-subtle)] bg-transparent cursor-pointer hover:bg-[var(--ink-whisper)] transition-colors duration-150 shrink-0"
            style={{ WebkitTapHighlightColor: 'transparent' }}
          >
            <span
              className="italic text-[15px] tracking-[-0.01em] text-[color:var(--ink)] font-[family-name:var(--font-display)]"
              style={{ fontWeight: 600 }}
            >
              {formatSelected(selectedDate)}
            </span>
            <span
              className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.08em] text-[color:var(--ink-soft)] font-[family-name:var(--font-structure)]"
              style={{ fontWeight: 700 }}
            >
              Today
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="opacity-70">
                <path d="M18 15l-6-6-6 6" />
              </svg>
            </span>
          </button>

          <div
            ref={listRef}
            className="flex-1 min-h-0 overflow-y-auto px-3.5 pt-1 pb-2 [scrollbar-width:thin]"
            style={{
              WebkitMaskImage: 'linear-gradient(to bottom, black calc(100% - 14px), transparent 100%)',
              maskImage: 'linear-gradient(to bottom, black calc(100% - 14px), transparent 100%)',
            }}
          >
            {groups.map((group) => (
              <div key={group.label} className="pt-2 pb-1.5">
                <div
                  className="pt-0.5 pb-1.5 text-[9px] uppercase tracking-[0.1em] text-[color:var(--ink-soft)] font-[family-name:var(--font-structure)]"
                  style={{ fontWeight: 700 }}
                >
                  {group.label}
                </div>
                {group.entries.map((entry) => {
                  const iso = entry.date.toISOString().slice(0, 10);
                  return (
                    <DayCard
                      key={iso}
                      entry={entry}
                      iso={iso}
                      isToday={iso === todayDate}
                      disabled={disableMissed && entry.state !== 'completed'}
                      onClick={() => onSelect(iso)}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function IconAction({
  onClick,
  label,
  children,
}: {
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="w-8 h-8 flex items-center justify-center rounded-[10px] bg-transparent border-none cursor-pointer text-[color:var(--ink-soft)] hover:bg-[var(--ink-whisper)] hover:text-[color:var(--ink)] transition-colors duration-200 [&>svg]:w-4 [&>svg]:h-4"
      style={{ WebkitTapHighlightColor: 'transparent' }}
    >
      {children}
    </button>
  );
}

function DayCard({
  entry,
  iso,
  isToday,
  disabled,
  onClick,
}: {
  entry: DailyEntry;
  iso: string;
  isToday: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  const missed = entry.state !== 'completed';
  const wday = WEEKDAY_SHORT[entry.date.getDay()];
  const day = entry.date.getDate();
  const headline = isToday ? 'Today' : relativeHeadline(wday, iso);

  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      data-date={iso}
      className={[
        'relative grid items-center gap-5 p-2.5 rounded-lg w-full text-left cursor-pointer border-none transition-colors duration-150',
        missed
          ? 'bg-transparent opacity-60 hover:opacity-85 hover:bg-[var(--ink-whisper)]'
          : 'bg-[var(--ink-whisper)] hover:bg-[var(--ink-trace)]',
        disabled ? 'cursor-not-allowed' : '',
      ].join(' ')}
      style={{
        gridTemplateColumns: '42px 1fr auto',
        marginBottom: '4px',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      <DateSquare day={day} wday={wday} missed={missed} isToday={isToday} />
      <div className="flex flex-col gap-[3px] min-w-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <span
            className={[
              'italic text-[13px] tracking-[-0.01em] leading-[1.1] font-[family-name:var(--font-display)] truncate',
              missed ? 'text-[color:var(--ink-soft)]' : 'text-[color:var(--ink)]',
            ].join(' ')}
            style={{ fontWeight: 500 }}
          >
            {headline}
          </span>
          {isToday && (
            <span
              className="shrink-0 inline-flex items-center px-1.5 rounded-full bg-[var(--ink)] text-[color:var(--ink-inverse)] text-[8px] uppercase tracking-[0.08em] font-[family-name:var(--font-structure)]"
              style={{ fontWeight: 700, lineHeight: '1.4' }}
            >
              Now
            </span>
          )}
          <PlayerCount count={entry.playersCount} />
        </div>
        {missed ? (
          <div
            className="italic text-[12px] text-[color:var(--ink-faint)] font-[family-name:var(--font-display)]"
          >
            Didn't play
          </div>
        ) : (
          <div
            className="text-[10px] tabular-nums text-[color:var(--ink-soft)]"
            style={{ fontWeight: 500 }}
          >
            {entry.wordsFound} {entry.wordsFound === 1 ? 'word' : 'words'}
          </div>
        )}
      </div>
      {!missed ? (
        <div className="flex flex-col items-end gap-[2px]">
          <div
            className="text-[17px] leading-none tabular-nums tracking-[-0.02em] text-[color:var(--ink)] font-[family-name:var(--font-structure)]"
            style={{ fontWeight: 800 }}
          >
            {entry.points}
          </div>
          <div
            className="text-[7px] uppercase tracking-[0.08em] text-[color:var(--ink-soft)] font-[family-name:var(--font-structure)]"
            style={{ fontWeight: 700 }}
          >
            pts
          </div>
        </div>
      ) : (
        <span aria-hidden />
      )}
    </button>
  );
}

function PlayerCount({ count }: { count: number }) {
  return (
    <span
      className="shrink-0 flex items-center gap-[3px] text-[10px] tabular-nums text-[color:var(--ink-faint)] font-[family-name:var(--font-structure)]"
      style={{ fontWeight: 600 }}
      aria-label={`${count} ${count === 1 ? 'player' : 'players'}`}
    >
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M17 20v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 20v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
      {count}
    </span>
  );
}

function DateSquare({
  day,
  wday,
  missed,
  isToday,
}: {
  day: number;
  wday: string;
  missed: boolean;
  isToday: boolean;
}) {
  return (
    <div
      className={[
        'relative w-[42px] h-[42px] rounded-md flex flex-col items-center justify-center p-1 shrink-0 leading-none',
        missed
          ? 'bg-transparent border border-dashed border-[var(--ink-soft)] text-[color:var(--ink-soft)]'
          : 'bg-[color:var(--ink)] text-[color:var(--ink-inverse)]',
      ].join(' ')}
    >
      <span
        className="tabular-nums text-[18px] leading-none font-[family-name:var(--font-structure)]"
        style={{ fontWeight: 800, letterSpacing: '-0.02em' }}
      >
        {day}
      </span>
      <span
        className="uppercase tracking-[0.08em] text-[7px] mt-[3px] opacity-75 font-[family-name:var(--font-structure)]"
        style={{ fontWeight: 700 }}
      >
        {wday}
      </span>
      {isToday && (
        <span
          aria-hidden
          className="absolute rounded-[9px] border-[1.5px] border-[color:var(--ink)] pointer-events-none"
          style={{ inset: '-4px' }}
        />
      )}
      {!missed && (
        <span
          aria-hidden
          className={[
            'absolute w-[14px] h-[14px] rounded-full bg-[var(--completion)] text-[color:var(--ink-inverse)] flex items-center justify-center border-[1.5px] border-[var(--surface-card)] z-10',
          ].join(' ')}
          style={{
            // Today already carries an ink ring at -4px inset; push the
            // check outside the ring so the two affordances don't touch.
            top: isToday ? '-9px' : '-4px',
            right: isToday ? '-9px' : '-4px',
          }}
        >
          <svg width="7" height="7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </span>
      )}
    </div>
  );
}

function relativeHeadline(wday: string, iso: string): string {
  // "Yesterday" for the calendar day immediately before today; past that,
  // fall back to the short weekday name.
  const today = new Date();
  const asDate = new Date(iso + 'T12:00:00');
  const days = Math.round(
    (today.setHours(0, 0, 0, 0) - new Date(asDate).setHours(0, 0, 0, 0)) /
      (24 * 60 * 60 * 1000),
  );
  if (days === 1) return 'Yesterday';
  return wday;
}
