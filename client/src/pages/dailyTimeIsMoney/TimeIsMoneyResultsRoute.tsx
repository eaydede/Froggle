import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { timeSurvivedSeconds } from 'models/timeIsMoney';
import { useGame } from '../../GameContext';
import { ResultsView } from '../../shared/results/ResultsView';
import { ActionButton } from '../../shared/results/components/ActionButton';
import { findWordPath } from '../../shared/utils/findWordPath';
import { scoreWord } from '../../shared/utils/score';
import type { ResultsRosterEntry } from '../../shared/results/types';
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
      bottomActions={
        <ActionButton
          onClick={() => navigate('/')}
          label="Back"
          primary
          icon={
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          }
        />
      }
    />
  );
}
