import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useGame } from '../../GameContext';
import {
  fetchFreePlayChallenge,
  type FreePlayChallengeResponse,
  type FreePlayChallengeError,
} from '../../shared/api/gameApi';
import { ResultsView } from '../../shared/results/ResultsView';
import type {
  LoadOpponentResult,
  ResultsRosterEntry,
} from '../../shared/results/types';
import type { ScoredWord } from '../../shared/types';
import { findWordPath } from '../../shared/utils/findWordPath';
import { encodeGameLink } from '../../shared/utils/gameLink';
import { useShareText } from '../results/hooks/useShareText';
import { ActionButton } from '../../shared/results/components/ActionButton';
import { ChallengeUnavailable } from './ChallengeUnavailable';

export function ChallengeRoute() {
  const { authReady } = useGame();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const [state, setState] = useState<
    | { kind: 'loading' }
    | { kind: 'ok'; data: FreePlayChallengeResponse }
    | { kind: 'error'; error: FreePlayChallengeError }
  >({ kind: 'loading' });

  useEffect(() => {
    if (!authReady || !id) return;
    let cancelled = false;
    setState({ kind: 'loading' });
    fetchFreePlayChallenge(id)
      .then((result) => {
        if (cancelled) return;
        setState(
          result.ok
            ? { kind: 'ok', data: result.data }
            : { kind: 'error', error: result.error },
        );
      })
      .catch(() => {
        if (!cancelled) setState({ kind: 'error', error: 'unknown' });
      });
    return () => {
      cancelled = true;
    };
  }, [authReady, id]);

  // Challenges are reached from the history page (or a share link's
  // ConfigRoute redirect); both surface the result back into the history
  // list, so that's the right destination for the close affordance.
  const goBack = () => navigate('/history');
  const playAgain = () => navigate('/play');

  if (!id) {
    return <ChallengeUnavailable variant="not-found" onBack={goBack} />;
  }
  if (state.kind === 'loading') return null;
  if (state.kind === 'error') {
    return <ChallengeUnavailable variant={state.error} onBack={goBack} />;
  }
  return (
    <ChallengeResultsView
      data={state.data}
      compareParam={searchParams.get('compare')}
      onBack={goBack}
      onPlayAgain={playAgain}
    />
  );
}

function ChallengeResultsView({
  data,
  compareParam,
  onBack,
  onPlayAgain,
}: {
  data: FreePlayChallengeResponse;
  compareParam: string | null;
  onBack: () => void;
  onPlayAgain: () => void;
}) {
  const me = useMemo(
    () => data.players.find((p) => p.isYou) ?? data.players[0],
    [data.players],
  );

  // Server returns paths for the viewer's missed words and nothing else;
  // every other path (own found words, any opponent word the user taps)
  // is solved against the board up front. Pre-computing keeps tap
  // interactions instant.
  const pathByWord = useMemo(() => {
    const map = new Map<string, ReturnType<typeof findWordPath>>();
    for (const w of data.missedWords) {
      map.set(w.word.toUpperCase(), w.path);
    }
    const allWords = new Set<string>();
    for (const p of data.players) {
      for (const w of p.foundWords) allWords.add(w.word.toUpperCase());
    }
    for (const word of allWords) {
      if (map.has(word)) continue;
      const path = findWordPath(data.board, word);
      if (path) map.set(word, path);
    }
    return map;
  }, [data]);

  const myFoundScored: ScoredWord[] = useMemo(
    () =>
      me.foundWords.map((w) => ({
        word: w.word,
        score: w.score,
        path: pathByWord.get(w.word.toUpperCase()) ?? [],
      })),
    [me.foundWords, pathByWord],
  );
  const myMissedScored: ScoredWord[] = useMemo(
    () =>
      data.missedWords.map((w) => ({ word: w.word, score: w.score, path: w.path })),
    [data.missedWords],
  );

  const roster: ResultsRosterEntry[] = useMemo(
    () =>
      data.players.map((p) => ({
        id: p.sessionId,
        rank: p.rank,
        displayName: p.displayName,
        points: p.points,
        isYou: p.sessionId === me.sessionId,
      })),
    [data.players, me.sessionId],
  );

  const loadOpponent = useMemo(
    () =>
      async (sessionId: string): Promise<LoadOpponentResult> => {
        const player = data.players.find((p) => p.sessionId === sessionId);
        if (!player) return { ok: false, error: 'opponent-missing' };
        return {
          ok: true,
          opponent: {
            id: player.sessionId,
            displayName: player.displayName,
            points: player.points,
            wordCount: player.wordCount,
            foundWords: player.foundWords,
          },
        };
      },
    [data.players],
  );

  // ?compare=owner — challenge recipients land in the compare view
  // against the originator without an extra tap. Solo and owner-on-self
  // cases short-circuit cleanly.
  const initialOpponentId = useMemo(() => {
    if (compareParam !== 'owner') return null;
    const owner = data.players.find((p) => p.isOwner);
    if (!owner || owner.sessionId === me.sessionId) return null;
    return owner.sessionId;
  }, [compareParam, data.players, me.sessionId]);

  const { share, copied } = useShareText(() => {
    if (data.seed == null) return 'Froggle challenge';
    return `Froggle challenge — ${encodeGameLink({
      boardSize: data.config.boardSize,
      seed: data.seed,
      timer: data.config.timeLimit,
      minWordLength: data.config.minWordLength,
      challengeId: data.challengeId,
    })}`;
  });

  return (
    <ResultsView
      me={{
        displayName: me.displayName,
        points: me.points,
        wordCount: me.wordCount,
        foundWords: myFoundScored,
        missedWords: myMissedScored,
      }}
      board={data.board}
      config={data.config}
      roster={roster}
      loadOpponent={loadOpponent}
      initialOpponentId={initialOpponentId}
      standingsHeader="Standings"
      compareSourceLabel="standings"
      topbarLabel=""
      topbarOnClose={onBack}
      topbarOnShare={share}
      topbarShareCopied={copied}
      bottomActions={
        <div className="grid grid-cols-2 gap-2">
          <ActionButton
            onClick={share}
            label={copied ? 'Copied' : 'Share'}
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
          <ActionButton
            onClick={onPlayAgain}
            label="Play again"
            primary
            icon={
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 4v6h6" />
                <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
              </svg>
            }
          />
        </div>
      }
    />
  );
}
