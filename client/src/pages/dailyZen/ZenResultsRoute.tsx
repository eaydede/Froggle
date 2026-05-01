import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import type { Position } from 'models';
import { useGame } from '../../GameContext';
import {
  fetchDailyZenResult,
  fetchDailyZenStats,
  type DailyStatsDay,
  type DailyZenResultResponse,
  type DailyZenStatsResponse,
} from '../../shared/api/gameApi';
import { InkButton } from '../../shared/components/InkButton';
import { IconAction } from '../../shared/components/IconAction';
import { DateChip } from '../../shared/components/DateChip';
import { DateTimelinePicker } from '../../shared/components/DateTimelinePicker';
import type { DailyEntry } from '../daily/types';
import { WordsCard } from '../results/components/WordsCard';
import { MiniBoard } from '../results/components/MiniBoard';
import { ConfigChips } from '../results/components/ConfigChips';
import { HeroScore } from '../results/components/HeroScore';
import { WordDefinitionPanel } from '../results/components/WordDefinitionPanel';
import { useShareText } from '../results/hooks/useShareText';
import { generateShareText } from '../results/utils/shareResults';
import { formatDateLabel } from '../../shared/utils/formatDate';
import { ZenModeBadge } from './components/ZenModeBadge';

function getTodayPST(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' });
}

function adaptDay(day: DailyStatsDay): DailyEntry {
  return {
    puzzleNumber: day.puzzleNumber,
    date: new Date(day.date + 'T12:00:00'),
    state: day.state,
    points: day.points ?? undefined,
    wordsFound: day.wordsFound ?? undefined,
    longestWord: day.longestWord ?? undefined,
    longestWordDefinition: day.longestWordDefinition,
    stampTier: day.stampTier,
    playersCount: day.playersCount,
    config: day.config,
  };
}

export function ZenResultsRoute() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { cachedDailyZen, dailyZenLoaded, authReady } = useGame();
  const urlDate = searchParams.get('date');
  const targetDate = urlDate ?? cachedDailyZen?.date ?? null;

  const [result, setResult] = useState<DailyZenResultResponse | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [highlightedWord, setHighlightedWord] = useState<string | null>(null);
  const [highlightPath, setHighlightPath] = useState<Position[] | null>(null);

  const [stats, setStats] = useState<DailyZenStatsResponse | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    if (!authReady || !dailyZenLoaded || !targetDate) return;
    let cancelled = false;
    setLoaded(false);
    setResult(null);
    fetchDailyZenResult(targetDate)
      .then((r) => {
        if (cancelled) return;
        setResult(r);
        setLoaded(true);
      })
      .catch(() => {
        if (cancelled) return;
        setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [authReady, dailyZenLoaded, targetDate]);

  useEffect(() => {
    if (!authReady) return;
    fetchDailyZenStats()
      .then(setStats)
      .catch(() => {
        // Non-fatal: picker falls back to empty entries.
      });
  }, [authReady]);

  const pickerEntries: DailyEntry[] = useMemo(() => {
    return stats?.days.map(adaptDay) ?? [];
  }, [stats]);

  const handleChangeDate = (iso: string) => {
    const next = new URLSearchParams(searchParams);
    next.set('date', iso);
    setSearchParams(next, { replace: true });
  };

  const puzzleNumber = useMemo(() => {
    if (!targetDate || !stats) return cachedDailyZen?.number ?? 0;
    const day = stats.days.find((d) => d.date === targetDate);
    return day?.puzzleNumber ?? cachedDailyZen?.number ?? 0;
  }, [targetDate, stats, cachedDailyZen]);

  const totals = useMemo(() => {
    if (!result) return { points: 0, words: 0 };
    return {
      points: result.found_words.reduce((sum, w) => sum + w.score, 0),
      words: result.found_words.length,
    };
  }, [result]);

  const handleHighlight = (word: string | null, path: Position[] | null) => {
    setHighlightedWord(word);
    setHighlightPath(path);
  };

  const { copied, share } = useShareText(() =>
    result
      ? generateShareText(result.found_words, {
          daily: { number: puzzleNumber, mode: 'zen' },
        })
      : '',
  );

  if (!loaded || !targetDate) {
    return <div className="fixed inset-0 bg-[var(--surface-panel)]" />;
  }

  // No finalized result for the target date — bounce back to the landing card.
  if (!result) {
    navigate('/', { replace: true });
    return null;
  }

  return (
    <div className="fixed inset-0 flex justify-center bg-[var(--surface-panel)] text-[color:var(--ink)] font-[family-name:var(--font-ui)] overflow-hidden">
      <div className="w-full max-w-[360px] min-h-0 flex flex-col px-[22px] pt-[14px] pb-5">
        <div
          className="grid items-center gap-2.5 pt-3.5 shrink-0"
          style={{ gridTemplateColumns: '32px 1fr 32px' }}
        >
          <IconAction onClick={() => navigate('/')} label="Close">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </IconAction>
          <div className="flex justify-center">
            <DateChip
              label={`Zen Daily · ${formatDateLabel(targetDate)}`}
              onClick={() => setPickerOpen(true)}
            />
          </div>
          <IconAction onClick={share} label={copied ? 'Copied to clipboard' : 'Share'}>
            {copied ? (
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

        <HeroScore
          points={totals.points}
          words={totals.words}
          primary="words"
          accessory={<ZenModeBadge isCompetitive={result.is_competitive} />}
        />

        <div
          className="grid gap-2.5 flex-1 min-h-0 px-0.5"
          style={{ gridTemplateColumns: '5fr 6fr', gridTemplateRows: '1fr' }}
        >
          <div className="flex flex-col gap-2 min-w-0 min-h-0">
            <MiniBoard board={result.board} highlightPath={highlightPath} />
            <ConfigChips
              boardSize={result.board.length}
              timeLimit={0}
              minWordLength={cachedDailyZen?.config.minWordLength ?? 4}
            />
            {highlightedWord ? (
              <WordDefinitionPanel word={highlightedWord} />
            ) : (
              <div
                className="text-[10px] italic text-center text-[color:var(--ink-soft)] font-[family-name:var(--font-display)] leading-[1.3] mt-0.5"
              >
                Tap a word to trace it
              </div>
            )}
          </div>

          <WordsCard
            foundWords={result.found_words}
            missedWords={result.missed_words}
            showMissedTab={result.missed_words.length > 0}
            highlightedWord={highlightedWord}
            onHighlightWord={handleHighlight}
          />
        </div>

        <div className="flex flex-col gap-2 mt-3.5 shrink-0">
          <InkButton
            onClick={() => navigate(`/daily/zen/leaderboard?date=${targetDate}`)}
          >
            See leaderboard
          </InkButton>
        </div>
      </div>

      <DateTimelinePicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={(iso) => {
          setPickerOpen(false);
          handleChangeDate(iso);
        }}
        entries={pickerEntries}
        selectedDate={targetDate}
        todayDate={getTodayPST()}
        disableMissed
      />
    </div>
  );
}
