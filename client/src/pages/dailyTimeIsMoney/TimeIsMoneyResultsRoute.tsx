import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { timeSurvivedSeconds } from 'models/timeIsMoney';
import { useGame } from '../../GameContext';
import { ResultsView } from '../../shared/results/ResultsView';
import { ActionButton } from '../../shared/results/components/ActionButton';
import { findWordPath } from '../../shared/utils/findWordPath';
import { scoreWord } from '../../shared/utils/score';
import type { ResultsRosterEntry } from '../../shared/results/types';
import { useShareText } from '../results/hooks/useShareText';
import { generateShareText } from '../results/utils/shareResults';
import { TimeSurvivedHero } from './components/TimeSurvivedHero';
import { formatClock } from './timeIsMoneyUtils';
import { TIME_IS_MONEY_RESULT_FIXTURES } from './__fixtures__';
import { fetchTimeIsMoneyResult, type TimeIsMoneyResultResponse } from '../../shared/api/timeIsMoneyApi';

function todayPST(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' });
}

export function TimeIsMoneyResultsRoute() {
  const navigate = useNavigate();
  const { authReady, displayName } = useGame();

  // Dev-only fixture injection so the finalized-results screen is reachable
  // without a played session — `?mock=solo|standings`. See __fixtures__/.
  const [searchParams] = useSearchParams();
  const mockKey = import.meta.env.DEV ? searchParams.get('mock') : null;

  const [result, setResult] = useState<TimeIsMoneyResultResponse | null>(null);
  const [loaded, setLoaded] = useState(false);
  const date = todayPST();

  useEffect(() => {
    if (mockKey) return;
    if (!authReady) return;
    let cancelled = false;
    fetchTimeIsMoneyResult(date)
      .then((r) => {
        if (cancelled) return;
        setResult(r);
        setLoaded(true);
      })
      .catch(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [authReady, date, mockKey]);

  useEffect(() => {
    if (mockKey) return;
    if (loaded && !result) navigate('/', { replace: true });
  }, [mockKey, loaded, result, navigate]);

  const activeResult = mockKey ? TIME_IS_MONEY_RESULT_FIXTURES[mockKey] ?? null : result;

  // Declared before the loading early-return so the hook order stays stable.
  // The text is built at click time, by which point activeResult is set.
  const { copied, share } = useShareText(() =>
    activeResult
      ? generateShareText(
          activeResult.found_words.map((word) => ({
            word,
            score: scoreWord(word),
            path: findWordPath(activeResult.board, word) ?? [],
          })),
          { daily: { number: activeResult.number, mode: 'time-is-money' } },
        )
      : '',
  );

  if ((!mockKey && !loaded) || !activeResult) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-[var(--surface-panel)] text-[color:var(--ink)] font-[family-name:var(--font-ui)]" />
    );
  }

  const foundWords = activeResult.found_words.map((word) => ({
    word,
    path: findWordPath(activeResult.board, word) ?? [],
    score: scoreWord(word),
  }));
  const missedWords = activeResult.missed_words.map((m) => ({
    word: m.word,
    path: m.path,
    score: m.score,
  }));

  const roster: ResultsRosterEntry[] =
    activeResult.roster.length > 0
      ? activeResult.roster.map((r) => ({
          id: r.userId,
          rank: r.rank,
          displayName: r.isYou ? displayName || r.displayName || 'You' : r.displayName,
          points: r.points,
          isYou: r.isYou,
        }))
      : [
          {
            id: 'me',
            rank: 1,
            displayName: displayName || 'You',
            points: activeResult.points,
            isYou: true,
          },
        ];

  return (
    <ResultsView
      me={{
        displayName: displayName || 'You',
        points: activeResult.points,
        wordCount: foundWords.length,
        foundWords,
        missedWords,
      }}
      board={activeResult.board}
      config={activeResult.config}
      roster={roster}
      standingsHeader="Standings"
      soloPlaceholderVariant="wait"
      soloHero={
        <TimeSurvivedHero
          seconds={timeSurvivedSeconds(activeResult.config.timeLimit, activeResult.points)}
          points={activeResult.points}
          words={foundWords.length}
        />
      }
      standingsFormatValue={(points) =>
        formatClock(timeSurvivedSeconds(activeResult.config.timeLimit, points))
      }
      topbarLabel="Time is Money"
      topbarOnClose={() => navigate('/')}
      topbarOnShare={share}
      topbarShareCopied={copied}
      bottomActions={<TimeIsMoneyBottomActions onHome={() => navigate('/')} onShare={share} copied={copied} />}
    />
  );
}

// Bottom action pair, same shape as the timed and zen dailies: secondary on
// the left to leave, primary on the right for the forward action. Those two
// put their per-mode leaderboard on the right; Time is Money has no separate
// leaderboard page — the day's standings are already on this screen — so
// Share takes the primary slot.
function TimeIsMoneyBottomActions({
  onHome,
  onShare,
  copied,
}: {
  onHome: () => void;
  onShare: () => void;
  copied: boolean;
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
        onClick={onShare}
        label={copied ? 'Copied' : 'Share'}
        primary
        icon={
          copied ? (
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          ) : (
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
              <polyline points="16 6 12 2 8 6" />
              <line x1="12" y1="2" x2="12" y2="15" />
            </svg>
          )
        }
      />
    </div>
  );
}
