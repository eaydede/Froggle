import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { Game } from 'models';
import type { Position } from 'models';
import type { DailyCompareError, DailyCompareResponse } from '../../shared/api/gameApi';
import type { GameResults } from '../../shared/types';
import { IconAction } from '../../shared/components/IconAction';
import { DateChip } from '../../shared/components/DateChip';
import { DateTimelinePicker } from '../../shared/components/DateTimelinePicker';
import { findWordPath } from '../../shared/utils/findWordPath';
import { HeroScore } from './components/HeroScore';
import { WordsCard } from './components/WordsCard';
import { WordDefinitionPanel } from './components/WordDefinitionPanel';
import { ChallengeBoard } from '../challenge/components/ChallengeBoard';
import { ChallengeHero } from '../challenge/components/ChallengeHero';
import { ChallengePlaceholders } from '../challenge/components/ChallengePlaceholders';
import { WordList, type DisplayWordRow } from '../challenge/components/WordList';
import type { LeaderboardTeaserEntry } from './components/LeaderboardTeaser';
import type { DailyEntry } from '../daily/types';

type CompareLoadResult =
  | { ok: true; data: DailyCompareResponse }
  | { ok: false; error: DailyCompareError };

export interface DailyCompareRankEntry {
  userId: string;
  rank: number;
  isCurrentUser: boolean;
}

interface DailyCompactPreviewPageProps {
  mode: 'timed' | 'zen';
  dateLabel: string;
  results: GameResults;
  game: Game;
  leaderboardTop: LeaderboardTeaserEntry[];
  leaderboardYou: LeaderboardTeaserEntry | null;
  /** Full point-ranking list, used to look up ranks for the versus hero
   *  when comparing against an opponent. The teaser only carries the top
   *  rows, so an arbitrary selected opponent may not appear there. */
  pointsRankings?: DailyCompareRankEntry[];
  totalPlayers?: number;
  findPercents?: Record<string, number>;
  popularityStyle?: 'inline';
  onClose: () => void;
  onHome?: () => void;
  onShare: () => void;
  shareCopied?: boolean;
  onOpenLeaderboard: () => void;
  onLoadComparePlayer?: (userId: string) => Promise<CompareLoadResult>;
  initialCompareUserId?: string | null;
  onChangeDate?: () => void;
  pickerEntries?: DailyEntry[];
  onPickerSelect?: (iso: string) => void;
  todayDate?: string;
  selectedDate?: string;
  heroAccessory?: ReactNode;
  heroCrown?: ReactNode;
}

export function DailyCompactPreviewPage({
  dateLabel,
  results,
  game,
  leaderboardTop,
  leaderboardYou,
  pointsRankings,
  totalPlayers,
  findPercents,
  popularityStyle,
  onClose,
  onHome,
  onShare,
  shareCopied = false,
  onOpenLeaderboard,
  onLoadComparePlayer,
  initialCompareUserId,
  onChangeDate,
  pickerEntries,
  onPickerSelect,
  todayDate,
  selectedDate,
  heroAccessory,
  heroCrown,
}: DailyCompactPreviewPageProps) {
  const [highlightedWord, setHighlightedWord] = useState<string | null>(null);
  const [highlightPath, setHighlightPath] = useState<Position[] | null>(null);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [compareUserId, setCompareUserId] = useState<string | null>(null);
  const [compareData, setCompareData] = useState<DailyCompareResponse | null>(null);
  const [compareLoading, setCompareLoading] = useState(false);
  const [compareError, setCompareError] = useState<DailyCompareError | null>(null);
  const loadedInitialCompareRef = useRef<string | null>(null);

  const totalPoints = results.foundWords.reduce((sum, w) => sum + w.score, 0);
  const totalWords = results.foundWords.length;

  const versusHero = useMemo(() => {
    if (!compareData) return null;
    const myRank =
      pointsRankings?.find((r) => r.isCurrentUser)?.rank ??
      leaderboardYou?.rank ??
      leaderboardTop.find((e) => e.isCurrentUser)?.rank ??
      null;
    const oppRank =
      pointsRankings?.find((r) => r.userId === compareData.them.userId)?.rank ??
      leaderboardTop.find((e) => e.userId === compareData.them.userId)?.rank ??
      null;
    if (myRank === null || oppRank === null) return null;
    const total = totalPlayers ?? pointsRankings?.length ?? 0;
    return {
      me: {
        displayName: 'You',
        points: compareData.me.points,
        wordCount: compareData.me.wordCount,
      },
      myRank,
      opponent: {
        displayName: compareData.them.displayName,
        points: compareData.them.points,
        wordCount: compareData.them.wordCount,
      },
      oppRank,
      totalPlayers: total,
    };
  }, [compareData, pointsRankings, totalPlayers, leaderboardTop, leaderboardYou]);
  const pickerAvailable =
    !!pickerEntries &&
    !!onPickerSelect &&
    !!todayDate &&
    !!selectedDate;

  const handleHighlight = (word: string | null, path: Position[] | null) => {
    setHighlightedWord(word ? word.toUpperCase() : null);
    setHighlightPath(path);
  };

  const comparePathByWord = useMemo(
    () => (compareData ? buildComparePathMap(compareData) : null),
    [compareData],
  );

  const activeHighlightPath = useMemo(() => {
    if (!compareData || !comparePathByWord || !highlightedWord) return highlightPath;
    return comparePathByWord.get(highlightedWord) ?? null;
  }, [compareData, comparePathByWord, highlightedWord, highlightPath]);

  const youCompareRows = useMemo(
    () => (compareData ? alignedRows(compareData, 'you', highlightedWord) : null),
    [compareData, highlightedWord],
  );
  const oppCompareRows = useMemo(
    () => (compareData ? alignedRows(compareData, 'opp', highlightedWord) : null),
    [compareData, highlightedWord],
  );
  const scrollSync = useScrollSync(!!compareData);

  const clearCompare = () => {
    setCompareUserId(null);
    setCompareData(null);
    setCompareError(null);
    setCompareLoading(false);
    setHighlightedWord(null);
    setHighlightPath(null);
  };

  const handleComparePlayer = async (userId: string) => {
    if (!onLoadComparePlayer) return;
    if (compareUserId === userId) {
      clearCompare();
      return;
    }

    // Keep the previous opponent's compareData visible while loading so the
    // versus hero and aligned word lists don't collapse to the solo view
    // for a frame between selections.
    setCompareUserId(userId);
    setCompareError(null);
    setCompareLoading(true);
    setHighlightedWord(null);
    setHighlightPath(null);

    const loaded = await onLoadComparePlayer(userId);
    setCompareLoading(false);
    if (loaded.ok) {
      setCompareData(loaded.data);
    } else {
      setCompareData(null);
      setCompareError(loaded.error);
    }
  };

  const handleCompareWordTap = (word: string) => {
    const normalized = word.toUpperCase();
    setHighlightedWord((prev) => (prev === normalized ? null : normalized));
    setHighlightPath(null);
  };

  useEffect(() => {
    if (!initialCompareUserId || !onLoadComparePlayer) return;
    if (loadedInitialCompareRef.current === initialCompareUserId) return;
    loadedInitialCompareRef.current = initialCompareUserId;
    void handleComparePlayer(initialCompareUserId);
    // `handleComparePlayer` intentionally stays local; this effect is keyed
    // only by the URL-provided player and loader availability.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialCompareUserId, onLoadComparePlayer]);

  return (
    <div className="fixed inset-0 flex justify-center bg-[var(--surface-panel)] text-[color:var(--ink)] font-[family-name:var(--font-ui)] overflow-hidden">
      <main
        className="w-full max-w-[360px] box-border flex flex-col p-4 gap-3"
        style={{ height: '100dvh', maxHeight: '100dvh', overflow: 'hidden' }}
      >
        <Topbar
          dateLabel={dateLabel}
          onClose={onClose}
          onShare={onShare}
          shareCopied={shareCopied}
          onChangeDate={
            onChangeDate ??
            (pickerAvailable ? () => setDatePickerOpen(true) : undefined)
          }
        />

        {versusHero ? (
          <ChallengeHero
            me={versusHero.me}
            myRank={versusHero.myRank}
            totalPlayers={versusHero.totalPlayers}
            opponent={versusHero.opponent}
            oppRank={versusHero.oppRank}
            compact
          />
        ) : (
          <div className="shrink-0 pt-2 pb-1 h-[82px] box-border flex items-center justify-center">
            <HeroScore
              points={totalPoints}
              words={totalWords}
              primary="points"
              accessory={heroAccessory}
              crown={heroCrown}
            />
          </div>
        )}

        <section className="flex items-stretch gap-2 shrink-0 box-border">
          <DailyLeaderboardPanel
            top={leaderboardTop}
            you={leaderboardYou}
            selectedUserId={compareUserId}
            onComparePlayer={onLoadComparePlayer ? handleComparePlayer : undefined}
          />
          <ChallengeBoard
            board={results.board}
            highlightPath={activeHighlightPath}
            config={{
              boardSize: game.config.boardSize,
              minWordLength: game.config.minWordLength,
              timeLimit: game.config.durationSeconds,
            }}
            compact
          />
        </section>

        <section className="flex justify-between items-stretch gap-2 flex-1 min-h-0 box-border">
          <div className="w-1/2 flex flex-col min-h-0">
            {compareData && youCompareRows ? (
              <WordList
                side="you"
                headerLabel={`You · ${compareData.me.wordCount}`}
                headerTrail={String(compareData.me.points)}
                rows={youCompareRows}
                onWordTap={handleCompareWordTap}
                scrollSync={scrollSync.left}
                compact
              />
            ) : (
              <WordsCard
                foundWords={results.foundWords}
                missedWords={results.missedWords}
                showMissedTab={results.missedWords.length > 0}
                highlightedWord={highlightedWord}
                onHighlightWord={handleHighlight}
                findPercents={findPercents}
                popularityStyle={popularityStyle}
              />
            )}
          </div>
          <div className="w-1/2 flex flex-col min-h-0">
            {compareData && oppCompareRows ? (
              <WordList
                side="opp"
                headerLabel={`${compareData.them.displayName} · ${compareData.them.wordCount}`}
                headerTrail={String(compareData.them.points)}
                footer={{
                  label: 'Stop',
                  arrow: '›',
                  onClick: clearCompare,
                }}
                rows={oppCompareRows}
                onWordTap={handleCompareWordTap}
                scrollSync={scrollSync.right}
                compact
              />
            ) : (
              <ChallengePlaceholders
                variant="compare"
                compact
                compareSourceLabel="leaderboard"
                definitionSlot={
                  compareLoading ? (
                    <InlineStatus label="Loading comparison" />
                  ) : compareError ? (
                    <InlineStatus label={compareErrorLabel(compareError)} />
                  ) : highlightedWord ? (
                    <WordDefinitionPanel word={highlightedWord} fitContainer />
                  ) : undefined
                }
              />
            )}
          </div>
        </section>

        <div className="grid grid-cols-2 gap-2 shrink-0">
          <BarButton onClick={onHome ?? onClose} label="Home" icon="home" />
          <BarButton onClick={onOpenLeaderboard} label="Leaderboard" icon="leaderboard" primary />
        </div>
      </main>

      {pickerAvailable && (
        <DateTimelinePicker
          open={datePickerOpen}
          onClose={() => setDatePickerOpen(false)}
          onSelect={(iso) => {
            setDatePickerOpen(false);
            onPickerSelect!(iso);
          }}
          entries={pickerEntries!}
          selectedDate={selectedDate!}
          todayDate={todayDate!}
          disableMissed
          onShare={onShare}
        />
      )}
    </div>
  );
}

function Topbar({
  dateLabel,
  onClose,
  onShare,
  shareCopied,
  onChangeDate,
}: {
  dateLabel: string;
  onClose: () => void;
  onShare: () => void;
  shareCopied: boolean;
  onChangeDate?: () => void;
}) {
  return (
    <header
      className="grid items-center gap-2 shrink-0"
      style={{ gridTemplateColumns: '32px 1fr 32px' }}
    >
      <IconAction onClick={onClose} label="Close">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </IconAction>
      <div className="flex justify-center min-w-0">
        <DateChip label={dateLabel} onClick={onChangeDate} />
      </div>
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
    </header>
  );
}

function DailyLeaderboardPanel({
  top,
  you,
  selectedUserId,
  onComparePlayer,
}: {
  top: LeaderboardTeaserEntry[];
  you: LeaderboardTeaserEntry | null;
  selectedUserId: string | null;
  onComparePlayer?: (userId: string) => void;
}) {
  const rows = you ? [...top, { ...you, isCurrentUser: true }] : top;
  return (
    <div className="flex-1 min-w-0 flex flex-col min-h-0">
      <div
        className="flex justify-between items-center pb-2 uppercase font-[family-name:var(--font-structure)] text-label-xs tracking-[0.1em] leading-none text-[color:var(--ink)] shrink-0"
        style={{
          fontWeight: 700,
          borderBottom: '1px solid var(--ink-trace)',
        }}
      >
        <span>Leaderboard</span>
        <span
          className="tabular-nums text-[color:var(--ink-soft)]"
          style={{ fontWeight: 700 }}
        >
          {rows.length}
        </span>
      </div>

      <div
        className="flex-1 min-h-0 overflow-hidden pt-1"
        style={{
          maxHeight: '190px',
          WebkitMaskImage:
            'linear-gradient(to bottom, transparent 0, black 12px, black calc(100% - 12px), transparent 100%)',
          maskImage:
            'linear-gradient(to bottom, transparent 0, black 12px, black calc(100% - 12px), transparent 100%)',
        }}
      >
        {rows.map((entry) => {
          const canCompare = !!entry.userId && !entry.isCurrentUser && !!onComparePlayer;
          const isSelected = !!entry.userId && entry.userId === selectedUserId;
          return (
          <button
            type="button"
            key={`${entry.isCurrentUser ? 'you' : 'top'}-${entry.rank}`}
            onClick={canCompare ? () => onComparePlayer(entry.userId!) : undefined}
            className="relative w-full flex items-center gap-2 rounded-md border-0 text-left transition-colors duration-150"
            style={{
              padding: '9px 5px 9px 12px',
              minHeight: '34px',
              cursor: canCompare ? 'pointer' : 'default',
              background: entry.isCurrentUser
                ? 'var(--you-accent-soft)'
                : isSelected
                  ? 'var(--opp-accent-soft)'
                  : 'transparent',
              WebkitTapHighlightColor: 'transparent',
            }}
            aria-label={
              canCompare
                ? `Compare with ${entry.name}`
                : entry.isCurrentUser
                  ? 'Your result'
                  : undefined
            }
          >
            <span
              aria-hidden
              className="absolute left-0"
              style={{
                top: '6px',
                bottom: '6px',
                width: '3px',
                borderRadius: '0 2px 2px 0',
                background: isSelected
                  ? 'var(--opp-accent)'
                  : entry.isCurrentUser
                    ? 'var(--you-accent)'
                    : rankColor(entry.rank),
              }}
            />
            <span
              className="tabular-nums font-[family-name:var(--font-structure)] shrink-0 text-label-xs text-[color:var(--ink-soft)]"
              style={{ fontWeight: 700, width: '16px' }}
            >
              {entry.rank}
            </span>
            <span
              className="truncate text-xs text-[color:var(--ink)] flex-1 min-w-0"
              style={{ fontWeight: entry.isCurrentUser ? 700 : 600 }}
            >
              {entry.isCurrentUser ? 'You' : entry.name}
            </span>
            <span
              className="tabular-nums font-[family-name:var(--font-structure)] shrink-0 text-xs text-[color:var(--ink-muted)]"
              style={{ fontWeight: 700 }}
            >
              {entry.score}
            </span>
          </button>
          );
        })}
      </div>
    </div>
  );
}

function InlineStatus({ label }: { label: string }) {
  return (
    <div
      className="w-full h-full flex items-center justify-center text-center rounded-xl px-3 py-2 text-[10px] italic leading-[1.35] text-[color:var(--ink-soft)] font-[family-name:var(--font-display)]"
      style={{
        border: '1.5px dashed var(--ink-faint)',
        background: 'transparent',
      }}
    >
      {label}
    </div>
  );
}

function compareErrorLabel(error: DailyCompareError): string {
  if (error === 'unplayed') return "Finish today's puzzle first.";
  if (error === 'opponent-missing') return "That player doesn't have a result yet.";
  if (error === 'forbidden') return 'Pick another player to compare.';
  return "Couldn't load that comparison.";
}

function buildComparePathMap(data: DailyCompareResponse): Map<string, Position[]> {
  const map = new Map<string, Position[]>();
  const allWords = new Set<string>();
  for (const w of data.me.foundWords) allWords.add(w.word.toUpperCase());
  for (const w of data.them.foundWords) allWords.add(w.word.toUpperCase());
  for (const word of allWords) {
    const path = findWordPath(data.board, word);
    if (path) map.set(word, path);
  }
  return map;
}

function alignedRows(
  data: DailyCompareResponse,
  side: 'you' | 'opp',
  highlightedWord: string | null,
): DisplayWordRow[] {
  const youMap = new Map(data.me.foundWords.map((w) => [w.word.toUpperCase(), w]));
  const oppMap = new Map(data.them.foundWords.map((w) => [w.word.toUpperCase(), w]));
  const union = new Set<string>([...youMap.keys(), ...oppMap.keys()]);

  const entries = Array.from(union).map((word) => {
    const youWord = youMap.get(word);
    const oppWord = oppMap.get(word);
    const score = Math.max(youWord?.score ?? 0, oppWord?.score ?? 0);
    return { word, score, youWord, oppWord };
  });
  entries.sort((a, b) => b.score - a.score || a.word.localeCompare(b.word));

  return entries.map((e) => {
    const onThisSide = side === 'you' ? e.youWord : e.oppWord;
    const onOtherSide = side === 'you' ? e.oppWord : e.youWord;
    if (!onThisSide) {
      return { key: `${side}:${e.word}`, word: null, score: e.score };
    }
    return {
      key: `${side}:${e.word}`,
      word: e.word,
      score: e.score,
      unique: !onOtherSide,
      highlighted: highlightedWord === e.word,
    };
  });
}

function useScrollSync(active: boolean) {
  const leftRef = useRef<HTMLDivElement | null>(null);
  const rightRef = useRef<HTMLDivElement | null>(null);
  const syncingRef = useRef(false);

  const sync = (source: 'left' | 'right') => {
    if (!active || syncingRef.current) return;
    const from = source === 'left' ? leftRef.current : rightRef.current;
    const to = source === 'left' ? rightRef.current : leftRef.current;
    if (!from || !to) return;
    syncingRef.current = true;
    to.scrollTop = from.scrollTop;
    requestAnimationFrame(() => {
      syncingRef.current = false;
    });
  };

  return {
    left: {
      register: (el: HTMLDivElement | null) => {
        if (leftRef.current) leftRef.current.onscroll = null;
        leftRef.current = el;
        if (el) el.onscroll = () => sync('left');
      },
    },
    right: {
      register: (el: HTMLDivElement | null) => {
        if (rightRef.current) rightRef.current.onscroll = null;
        rightRef.current = el;
        if (el) el.onscroll = () => sync('right');
      },
    },
  };
}

function BarButton({
  onClick,
  label,
  icon,
  primary = false,
}: {
  onClick: () => void;
  label: string;
  icon: 'home' | 'leaderboard';
  primary?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'h-12 rounded-xl border-none flex items-center justify-center gap-2 cursor-pointer select-none transition-all duration-[180ms] ease-[cubic-bezier(0.22,1,0.36,1)] active:scale-[0.98] font-[family-name:var(--font-ui)]',
        primary
          ? 'bg-[var(--ink)] text-[color:var(--ink-inverse)] shadow-[var(--shadow-btn-primary)] hover:-translate-y-px hover:shadow-[var(--shadow-btn-primary-hover)]'
          : 'bg-[var(--ink-whisper)] text-[color:var(--ink-muted)] hover:bg-[var(--ink-trace)] hover:text-[color:var(--ink)]',
      ].join(' ')}
      style={{
        fontWeight: 700,
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      {icon === 'home' ? (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 11l9-8 9 8" />
          <path d="M5 10v10h14V10" />
          <path d="M9 20v-6h6v6" />
        </svg>
      ) : (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 20V10" />
          <path d="M10 20V4" />
          <path d="M16 20v-7" />
          <path d="M22 20H2" />
        </svg>
      )}
      <span>{label}</span>
    </button>
  );
}

function rankColor(rank: number): string {
  if (rank === 1) return 'var(--podium-gold)';
  if (rank === 2) return 'var(--podium-silver)';
  if (rank === 3) return 'var(--podium-bronze)';
  return 'transparent';
}
