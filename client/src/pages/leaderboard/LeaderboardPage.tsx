import { useState } from 'react';
import { Podium, type PodiumEntry } from './components/Podium';
import { InlineStats } from './components/InlineStats';
import { LeaderboardList, type LbListEntry } from './components/LeaderboardList';
import { DateTimelinePicker } from '../../shared/components/DateTimelinePicker';
import type { DailyEntry } from '../daily/types';

interface LeaderboardPageProps {
  dateLabel: string;
  entries: DailyEntry[];
  selectedDate: string;
  todayDate: string;
  onChangeDate: (dateIso: string) => void;
  podium: PodiumEntry[];
  rankings: LbListEntry[];
  totalPlayers: number;
  avgScore: number;
  youTopPercent?: number | null;
  youFallback?: string;
  onBack: () => void;
  onShare: () => void;
  onCompare?: (userId: string) => void;
  /** Fires when tapping the current user's own row/podium pillar —
   *  routes to their results page. */
  onSelfClick?: () => void;
}

export function LeaderboardPage({
  dateLabel,
  entries,
  selectedDate,
  todayDate,
  onChangeDate,
  podium,
  rankings,
  totalPlayers,
  avgScore,
  youTopPercent,
  youFallback,
  onBack,
  onShare,
  onCompare,
  onSelfClick,
}: LeaderboardPageProps) {
  const [pickerOpen, setPickerOpen] = useState(false);

  const handlePickerSelect = (iso: string) => {
    onChangeDate(iso);
    setPickerOpen(false);
  };

  return (
    <div className="fixed inset-0 flex justify-center bg-[var(--surface-panel)] text-[color:var(--ink)] font-[family-name:var(--font-ui)] overflow-hidden">
      <div className="relative w-full max-w-[360px] min-h-0 flex flex-col px-[22px] pt-[14px] pb-5">
        <div
          className="grid items-center gap-2.5 pt-3.5"
          style={{ gridTemplateColumns: '32px 1fr 32px' }}
        >
          <IconAction label="Back" onClick={onBack}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </IconAction>
          <div
            className="text-center italic text-[16px] tracking-[-0.01em] text-[color:var(--ink)] font-[family-name:var(--font-display)]"
            style={{ fontWeight: 600 }}
          >
            Leaderboard
          </div>
          <IconAction label="Share" onClick={onShare}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
              <polyline points="16 6 12 2 8 6" />
              <line x1="12" y1="2" x2="12" y2="15" />
            </svg>
          </IconAction>
        </div>

        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          className="mx-auto mt-2.5 px-3.5 py-1.5 flex items-center gap-1.5 bg-[var(--ink-whisper)] border border-[var(--ink-border-subtle)] rounded-full text-[11px] tracking-[0.04em] text-[color:var(--ink-muted)] hover:text-[color:var(--ink)] hover:border-[var(--ink-border)] cursor-pointer transition-colors duration-200 flex-shrink-0 font-[family-name:var(--font-structure)]"
          style={{ fontWeight: 600, WebkitTapHighlightColor: 'transparent' }}
        >
          {dateLabel}
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="opacity-60">
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>

        <Podium entries={podium} onCompare={onCompare} onSelfClick={onSelfClick} />
        <InlineStats
          totalPlayers={totalPlayers}
          avgScore={avgScore}
          youTopPercent={youTopPercent}
          youFallback={youFallback}
        />
        <LeaderboardList entries={rankings} onCompare={onCompare} onSelfClick={onSelfClick} />
      </div>

      <DateTimelinePicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={handlePickerSelect}
        entries={entries}
        selectedDate={selectedDate}
        todayDate={todayDate}
        onShare={onShare}
      />
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
