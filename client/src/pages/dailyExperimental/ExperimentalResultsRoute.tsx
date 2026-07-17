import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  EXPERIMENTAL_MODES,
  goldenCell,
  type ExperimentalModeKey,
  type VoteSentiment,
} from 'models/experimental';
import { useGame } from '../../GameContext';
import { ResultsView } from '../../shared/results/ResultsView';
import { ActionButton } from '../../shared/results/components/ActionButton';
import { findWordPath } from '../../shared/utils/findWordPath';
import { scoreWord } from '../../shared/utils/score';
import type { ResultsRosterEntry } from '../../shared/results/types';
import { TimeSurvivedHero } from './components/TimeSurvivedHero';
import { VoteControl } from './components/VoteControl';
import { VoteTallyBar } from './components/VoteTallyBar';
import { GoldenTileOverlay } from './components/GoldenTileOverlay';
import { findGoldenWordPath, formatClock, timeSurvivedSeconds } from './experimentalUtils';
import { EXPERIMENTAL_RESULT_FIXTURES } from './__fixtures__';
import {
  castExperimentalVote,
  fetchExperimentalResult,
  type ExperimentalResultResponse,
  type ExperimentalVoteTallies,
} from '../../shared/api/dailyExperimentalApi';

function todayPST(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' });
}

export function ExperimentalResultsRoute() {
  const { mode } = useParams<{ mode: string }>();
  const navigate = useNavigate();
  const modeKey = mode as ExperimentalModeKey;
  const valid = !!mode && Object.prototype.hasOwnProperty.call(EXPERIMENTAL_MODES, mode);
  const { authReady, displayName } = useGame();

  // Dev-only fixture injection so the finalized-results screen is reachable
  // without a played session — `?mock=money|golden`. See __fixtures__/.
  const [searchParams] = useSearchParams();
  const mockKey = import.meta.env.DEV ? searchParams.get('mock') : null;

  const [result, setResult] = useState<ExperimentalResultResponse | null>(null);
  const [vote, setVote] = useState<VoteSentiment | null>(null);
  const [voteTallies, setVoteTallies] = useState<ExperimentalVoteTallies | null>(null);
  const [loaded, setLoaded] = useState(false);
  const date = todayPST();

  useEffect(() => {
    if (mockKey) return;
    if (!authReady || !valid) return;
    let cancelled = false;
    fetchExperimentalResult(modeKey, date)
      .then((r) => {
        if (cancelled) return;
        setResult(r);
        setVote(r?.vote ?? null);
        setVoteTallies(r?.voteTallies ?? null);
        setLoaded(true);
      })
      .catch(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [authReady, valid, modeKey, date, mockKey]);

  useEffect(() => {
    if (mockKey) return;
    if (loaded && (!valid || !result)) {
      navigate('/daily/experimental', { replace: true });
    }
  }, [mockKey, loaded, valid, result, navigate]);

  // Seed vote + tallies from the fixture when mocking — the network path
  // does this inside its own load effect, and that effect bails on mocks.
  useEffect(() => {
    if (!mockKey) return;
    const fixture = EXPERIMENTAL_RESULT_FIXTURES[mockKey];
    if (!fixture) return;
    setVote(fixture.vote);
    setVoteTallies(fixture.voteTallies);
  }, [mockKey]);

  const activeResult = mockKey ? EXPERIMENTAL_RESULT_FIXTURES[mockKey] ?? null : result;

  if ((!mockKey && !loaded) || !activeResult) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-[var(--surface-panel)] text-[color:var(--ink)] font-[family-name:var(--font-ui)]" />
    );
  }

  const meta = EXPERIMENTAL_MODES[modeKey];
  const isMoney = meta.heroStat === 'timeSurvived';
  const isGolden = modeKey === 'golden-ticket';

  // Golden Ticket found words might have been reached via the wildcard, so
  // fall through the golden-aware path finder — it tries each A..Z at the
  // center when a plain trace fails. Other modes use the plain finder.
  const foundWords = activeResult.found_words.map((word, i) => ({
    word,
    path: (isGolden
      ? findGoldenWordPath(activeResult.board, word)
      : findWordPath(activeResult.board, word)) ?? [],
    score: scoreWord(word),
    timeSeconds: activeResult.word_times?.[i] ?? null,
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

  const handleVote = async (sentiment: VoteSentiment) => {
    setVote(sentiment);
    // Optimistically bump our own count so the tally bar animates the moment
    // the user taps — the POST response will replace this with the true
    // aggregate a beat later. If the user is switching votes, decrement the
    // previous choice as well so counts stay balanced.
    setVoteTallies((prev) => {
      const base: ExperimentalVoteTallies = prev ?? { up: 0, meh: 0, down: 0 };
      const next = { ...base, [sentiment]: base[sentiment] + 1 };
      if (vote && vote !== sentiment) next[vote] = Math.max(0, base[vote] - 1);
      return next;
    });
    const response = await castExperimentalVote(modeKey, date, sentiment);
    if (response) setVoteTallies(response.voteTallies);
  };

  // Golden Ticket: overlay the wildcard tile on the preview board so the
  // affordance carries all the way through to results.
  const boardCellOverlay = isGolden
    ? (r: number, c: number) => {
        const center = goldenCell(activeResult.config.boardSize);
        if (r === center.row && c === center.col) return <GoldenTileOverlay />;
        return null;
      }
    : undefined;

  const timeSurvived = timeSurvivedSeconds(meta.timeLimit, activeResult.points);

  return (
    <ResultsView
      me={{
        displayName: displayName || 'You',
        points: activeResult.points,
        wordCount: foundWords.length,
        foundWords,
        missedWords,
        invalidSubmissions: activeResult.invalid_submissions,
      }}
      board={activeResult.board}
      boardCellOverlay={boardCellOverlay}
      config={activeResult.config}
      roster={roster}
      standingsHeader="Standings"
      soloPlaceholderVariant="wait"
      soloHero={
        isMoney ? (
          <TimeSurvivedHero
            seconds={timeSurvived}
            points={activeResult.points}
            words={foundWords.length}
          />
        ) : undefined
      }
      standingsFormatValue={
        isMoney ? (points) => formatClock(timeSurvivedSeconds(meta.timeLimit, points)) : undefined
      }
      topbarLabel={meta.name}
      topbarOnClose={() => navigate('/daily/experimental')}
      bottomActions={
        <div className="grid grid-cols-2 items-center gap-3">
          <ActionButton
            onClick={() => navigate('/daily/experimental')}
            label="Back"
            primary
            icon={
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            }
          />
          <div className="flex flex-col items-center gap-1.5">
            <VoteControl value={vote} onVote={handleVote} />
            {/* Reserved slot for the tally bar so the results layout doesn't
                shift up/down when the user's first vote reveals it. The wrapper
                matches the bar's fixed height (6px) whether it's populated or
                not. */}
            <div className="h-[6px]">
              {voteTallies && <VoteTallyBar tallies={voteTallies} own={vote} />}
            </div>
          </div>
        </div>
      }
    />
  );
}
