import { useState } from 'react';
import type { Position, Game } from 'models';
import type { GameResults } from '../../shared/types';
import { InkButton } from '../../shared/components/InkButton';
import { HeroScore } from './components/HeroScore';
import { MiniBoard } from './components/MiniBoard';
import { ConfigChips } from './components/ConfigChips';
import { WordsCard } from './components/WordsCard';
import { WordDefinitionPanel } from './components/WordDefinitionPanel';
import { LeaderboardTeaser, type LeaderboardTeaserEntry } from './components/LeaderboardTeaser';
import { useShareText } from './hooks/useShareText';
import { generateShareText } from './utils/shareResults';
import { encodeGameLink } from '../../shared/utils/gameLink';
import { DateTimelinePicker } from '../../shared/components/DateTimelinePicker';
import type { DailyEntry } from '../daily/types';

export interface DailyResultsExtras {
  /** Formatted date label shown in the topbar chip, e.g. "Tuesday, Apr 21". */
  dateLabel: string;
  leaderboardTop: LeaderboardTeaserEntry[];
  leaderboardYou: LeaderboardTeaserEntry | null;
  onOpenLeaderboard: () => void;
  /** Populated when historical date navigation is available — tapping the
   *  date chip in the topbar opens the timeline picker. */
  pickerEntries?: DailyEntry[];
  onPickerSelect?: (iso: string) => void;
  todayDate?: string;
  selectedDate?: string;
}

interface ResultsPageProps {
  results: GameResults;
  game: Game;
  gameSeed?: number | null;
  onClose: () => void;
  onPlayAgain: () => void;
  /** Present only on daily results; swaps the Play again button for the
   *  leaderboard teaser and the center label for the date chip. */
  daily?: DailyResultsExtras;
}

export function ResultsPage({
  results,
  game,
  gameSeed,
  onClose,
  onPlayAgain,
  daily,
}: ResultsPageProps) {
  const [highlightedWord, setHighlightedWord] = useState<string | null>(null);
  const [highlightPath, setHighlightPath] = useState<Position[] | null>(null);
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  const pickerAvailable =
    !!daily?.pickerEntries &&
    !!daily.onPickerSelect &&
    !!daily.todayDate &&
    !!daily.selectedDate;

  const totalPoints = results.foundWords.reduce((sum, w) => sum + w.score, 0);
  const totalWords = results.foundWords.length;

  const { share, copied } = useShareText(() => {
    if (daily) {
      return generateShareText(results.foundWords, { daily: { number: 0 } });
    }
    const link =
      gameSeed != null
        ? encodeGameLink({
            boardSize: game.config.boardSize,
            seed: gameSeed,
            timer: game.config.durationSeconds,
            minWordLength: game.config.minWordLength,
          })
        : undefined;
    return generateShareText(results.foundWords, { gameLink: link });
  });

  const handleHighlight = (word: string | null, path: Position[] | null) => {
    setHighlightedWord(word);
    setHighlightPath(path);
  };

  return (
    <div className="fixed inset-0 flex justify-center bg-[var(--surface-panel)] text-[color:var(--ink)] font-[family-name:var(--font-ui)] overflow-hidden">
      <div className="w-full max-w-[360px] min-h-0 flex flex-col px-[22px] pt-[14px] pb-5">
        <Topbar
          onClose={onClose}
          onShare={share}
          shareCopied={copied}
          dateLabel={daily?.dateLabel}
          onChangeDate={pickerAvailable ? () => setDatePickerOpen(true) : undefined}
        />

        <HeroScore points={totalPoints} words={totalWords} />

        <div
          className="grid gap-2.5 flex-1 min-h-0 px-0.5"
          style={{ gridTemplateColumns: '5fr 6fr', gridTemplateRows: '1fr' }}
        >
          <div className="flex flex-col gap-2 min-w-0 min-h-0">
            <MiniBoard board={results.board} highlightPath={highlightPath} />
            <ConfigChips
              boardSize={game.config.boardSize}
              timeLimit={game.config.durationSeconds}
              minWordLength={game.config.minWordLength}
            />
            {highlightedWord ? (
              <WordDefinitionPanel word={highlightedWord} />
            ) : (
              !daily && (
                <div
                  className="text-[10px] italic text-center text-[color:var(--ink-soft)] font-[family-name:var(--font-display)] leading-[1.3] mt-0.5"
                >
                  Tap a word to highlight it
                </div>
              )
            )}
          </div>

          <WordsCard
            foundWords={results.foundWords}
            missedWords={results.missedWords}
            showMissedTab={results.missedWords.length > 0}
            highlightedWord={highlightedWord}
            onHighlightWord={handleHighlight}
          />
        </div>

        {daily ? (
          <LeaderboardTeaser
            top={daily.leaderboardTop}
            you={daily.leaderboardYou}
            onClick={daily.onOpenLeaderboard}
          />
        ) : (
          <div className="mt-3.5 flex flex-col">
            <InkButton onClick={onPlayAgain}>
              Play again
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="transition-transform duration-200 group-hover:rotate-[-90deg]"
              >
                <path d="M1 4v6h6" />
                <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
              </svg>
            </InkButton>
          </div>
        )}
      </div>

      {pickerAvailable && daily && (
        <DateTimelinePicker
          open={datePickerOpen}
          onClose={() => setDatePickerOpen(false)}
          onSelect={(iso) => {
            setDatePickerOpen(false);
            daily.onPickerSelect!(iso);
          }}
          entries={daily.pickerEntries!}
          selectedDate={daily.selectedDate!}
          todayDate={daily.todayDate!}
          disableMissed
          onShare={share}
        />
      )}
    </div>
  );
}

interface TopbarProps {
  onClose: () => void;
  onShare: () => void;
  shareCopied: boolean;
  dateLabel?: string;
  onChangeDate?: () => void;
}

function Topbar({ onClose, onShare, shareCopied, dateLabel, onChangeDate }: TopbarProps) {
  return (
    <div className="grid items-center gap-2.5 pt-3.5" style={{ gridTemplateColumns: '32px 1fr 32px' }}>
      <IconAction onClick={onClose} label="Close">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </IconAction>
      {dateLabel ? (
        <DateChip label={dateLabel} onClick={onChangeDate} />
      ) : (
        <div
          className="text-center text-[11px] uppercase tracking-[0.1em] text-[color:var(--ink-soft)] font-[family-name:var(--font-structure)]"
          style={{ fontWeight: 700 }}
        >
          Results
        </div>
      )}
      <IconAction onClick={onShare} label={shareCopied ? 'Copied to clipboard' : 'Share'}>
        {shareCopied ? (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
            <polyline points="16 6 12 2 8 6" />
            <line x1="12" y1="2" x2="12" y2="15" />
          </svg>
        )}
      </IconAction>
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

function DateChip({ label, onClick }: { label: string; onClick?: () => void }) {
  const interactive = !!onClick;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!interactive}
      className="flex items-center justify-center gap-1.5 py-[7px] px-3.5 rounded-[10px] bg-[var(--surface-card)] border border-[var(--ink-border-subtle)] shadow-[0_1px_2px_rgba(34,32,28,0.03)] cursor-pointer disabled:cursor-default hover:border-[var(--ink-border)] transition-colors duration-200 font-[family-name:var(--font-ui)]"
      style={{ WebkitTapHighlightColor: 'transparent' }}
    >
      <span
        className="text-[13px] text-[color:var(--ink)] tabular-nums"
        style={{ fontWeight: 600, letterSpacing: '-0.005em' }}
      >
        {label}
      </span>
      {interactive && (
        <span className="flex items-center text-[color:var(--ink-faint)]">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 9l6 6 6-6" />
          </svg>
        </span>
      )}
    </button>
  );
}
