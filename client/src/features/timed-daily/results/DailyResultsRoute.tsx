import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useFreePlay } from '../../free-play/FreePlay';
import { useIdentity } from '../../identity/Identity';
import { useTimedDaily } from '../TimedDaily';

import { scoreWord } from '../../../gameplay/score';
import { formatDateLabel } from '../../../platform/time/formatDate';
import { DateChip } from '../../../ui/DateChip';
import { DateTimelinePicker } from '../../../ui/DateTimelinePicker';
import { IconAction } from '../../../ui/IconAction';
import { useShareText } from '../../results/hooks/useShareText';
import { generateShareText } from '../../results/utils/shareResults';
import { ActionButton } from '../../results/view/components/ActionButton';
import { ResultsView } from '../../results/view/ResultsView';
import type {
  LoadOpponentResult,
  ResultsRosterEntry,
} from '../../results/view/types';
import { fetchDailyCompare, fetchDailyResult, fetchDailyStats, fetchLeaderboard, type DailyResultResponse, type DailyStatsDay, type DailyStatsResponse, type LeaderboardResponse } from '../api';
import type { DailyEntry } from '../types';

function getTodayPST(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' });
}

export function DailyResultsRoute() {
  const { selectedPuzzle: dailyInfo, selectPuzzle: setDailyInfo, puzzle, run, ready } = useTimedDaily();
  const { authReady } = useIdentity();
  const { cancelGame, game } = useFreePlay();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const fromSource = searchParams.get('from');
  const initialOpponentId = searchParams.get('compare');

  const urlDate = searchParams.get('date');
  const targetDate = urlDate ?? dailyInfo?.date ?? run?.date ?? puzzle?.date ?? null;

  const [serverResult, setServerResult] = useState<DailyResultResponse | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardResponse | null>(null);
  const [stats, setStats] = useState<DailyStatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const fetchedForRef = useRef<string | null>(null);

  useEffect(() => {
    if (!authReady || !ready) return;
    if (!targetDate) {
      if (!fetchedForRef.current) navigate('/');
      return;
    }
    if (fetchedForRef.current === targetDate) return;
    fetchedForRef.current = targetDate;

    setLoading(true);
    setServerResult(null);

    const fetchResult = fetchDailyResult(targetDate);

    fetchResult
      .then((result) => {
        if (!result) {
          navigate('/');
          return;
        }
        setServerResult(result);
        setLoading(false);
      })
      .catch(() => {
        navigate('/');
        setLoading(false);
      });
  }, [targetDate, authReady, ready, navigate]);

  useEffect(() => {
    if (!targetDate || !authReady || !ready) return;
    fetchLeaderboard(targetDate).then(setLeaderboard).catch(() => setLeaderboard(null));
  }, [targetDate, authReady, ready]);

  useEffect(() => {
    fetchDailyStats()
      .then(setStats)
      .catch(() => {
        // Non-fatal: picker falls back to empty entries.
      });
  }, []);

  const pickerEntries: DailyEntry[] = useMemo(() => {
    if (!stats) return [];
    return stats.days.map((d: DailyStatsDay) => ({
      puzzleNumber: d.puzzleNumber,
      date: new Date(d.date + 'T12:00:00'),
      state: d.state,
      points: d.points ?? undefined,
      wordsFound: d.wordsFound ?? undefined,
      longestWord: d.longestWord ?? undefined,
      longestWordDefinition: d.longestWordDefinition,
      stampTier: d.stampTier,
      playersCount: d.playersCount,
      config: d.config,
    }));
  }, [stats]);

  const handleClose = async () => {
    const backToLeaderboard = fromSource === 'leaderboard' && targetDate;
    const backTarget = backToLeaderboard ? `/leaderboard?date=${targetDate}` : '/';
    setDailyInfo(null);
    if (game) await cancelGame();
    navigate(backTarget);
  };

  const handleHome = async () => {
    setDailyInfo(null);
    if (game) await cancelGame();
    navigate('/');
  };

  const handleOpenLeaderboard = () => {
    if (!targetDate) return;
    navigate(`/leaderboard?date=${targetDate}`);
  };

  const handleChangeDate = (iso: string) => {
    const next = new URLSearchParams(searchParams);
    next.set('date', iso);
    setSearchParams(next, { replace: true });
  };

  const displayed = (serverResult
    ? {
        board: serverResult.board,
        foundWords: serverResult.found_words.map((word) => ({
          word,
          path: [] as { row: number; col: number }[],
          score: scoreWord(word),
        })),
        missedWords: (serverResult.missed_words ?? []).map((m) => ({
          word: m.word,
          path: m.path,
          score: m.score,
        })),
      }
    : null);

  const totalPoints = displayed
    ? displayed.foundWords.reduce((sum, w) => sum + w.score, 0)
    : 0;

  const roster: ResultsRosterEntry[] = useMemo(() => {
    if (!leaderboard) return [];
    return leaderboard.rankings.points.map((e) => ({
      id: e.userId,
      rank: e.rank,
      displayName: e.displayName,
      points: e.value,
      isYou: e.isCurrentUser,
    }));
  }, [leaderboard]);

  const loadOpponent = useMemo(
    () =>
      async (userId: string): Promise<LoadOpponentResult> => {
        if (!targetDate) return { ok: false, error: 'unknown' };
        const result = await fetchDailyCompare(targetDate, userId);
        if (!result.ok) return { ok: false, error: result.error };
        return {
          ok: true,
          opponent: {
            id: userId,
            displayName: result.data.them.displayName,
            points: result.data.them.points,
            wordCount: result.data.them.wordCount,
            foundWords: result.data.them.foundWords,
          },
        };
      },
    [targetDate],
  );

  const { share, copied } = useShareText(() =>
    displayed ? generateShareText(displayed.foundWords, { daily: { number: 0 } }) : '',
  );

  if (loading || !targetDate || !displayed) return null;

  const dateLabel = `Timed Daily · ${formatDateLabel(targetDate)}`;

  return (
    <>
      <ResultsView
        me={{
          displayName: 'You',
          points: totalPoints,
          wordCount: displayed.foundWords.length,
          foundWords: displayed.foundWords,
          missedWords: displayed.missedWords,
        }}
        board={displayed.board}
        config={{
          boardSize: displayed.board.length,
          minWordLength: serverResult?.config?.minWordLength ?? dailyInfo?.config.minWordLength ?? 3,
          timeLimit: serverResult?.config?.timeLimit ?? dailyInfo?.config.timeLimit ?? 120,
        }}
        roster={roster}
        loadOpponent={loadOpponent}
        initialOpponentId={initialOpponentId}
        standingsHeader="Leaderboard"
        compareSourceLabel="leaderboard"
        findPercents={serverResult?.find_percents}
        popularityStyle={serverResult?.find_percents ? 'inline' : undefined}
        soloPlaceholderVariant="wait"
        topbar={
          <DailyTopbar
            label={dateLabel}
            onClose={handleClose}
            onShare={share}
            shareCopied={copied}
            onLabelClick={() => setDatePickerOpen(true)}
          />
        }
        bottomActions={<DailyBottomActions onHome={handleHome} onLeaderboard={handleOpenLeaderboard} />}
      />
      <DateTimelinePicker
        open={datePickerOpen}
        onClose={() => setDatePickerOpen(false)}
        onSelect={(iso) => {
          setDatePickerOpen(false);
          handleChangeDate(iso);
        }}
        entries={pickerEntries}
        selectedDate={targetDate}
        todayDate={getTodayPST()}
        disableMissed
        onShare={share}
      />
    </>
  );
}

function DailyTopbar({
  label,
  onClose,
  onShare,
  shareCopied,
  onLabelClick,
}: {
  label: string;
  onClose: () => void;
  onShare: () => void;
  shareCopied: boolean;
  onLabelClick?: () => void;
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
        <DateChip label={label} onClick={onLabelClick} />
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

function DailyBottomActions({
  onHome,
  onLeaderboard,
}: {
  onHome: () => void;
  onLeaderboard: () => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <ActionButton
        onClick={onHome}
        label="Home"
        icon={
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 11l9-8 9 8" />
            <path d="M5 10v10h14V10" />
            <path d="M9 20v-6h6v6" />
          </svg>
        }
      />
      <ActionButton
        onClick={onLeaderboard}
        label="Leaderboard"
        primary
        icon={
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 20V10" />
            <path d="M10 20V4" />
            <path d="M16 20v-7" />
            <path d="M22 20H2" />
          </svg>
        }
      />
    </div>
  );
}
