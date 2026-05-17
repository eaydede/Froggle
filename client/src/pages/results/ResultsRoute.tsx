import { useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '../../GameContext';
import { ResultsView } from '../../shared/results/ResultsView';
import type { ResultsRosterEntry } from '../../shared/results/types';
import { encodeGameLink } from '../../shared/utils/gameLink';
import { createFreePlayChallenge } from '../../shared/api/gameApi';
import { useShareText } from './hooks/useShareText';
import { InkButton } from '../../shared/components/InkButton';

export function ResultsRoute() {
  const {
    game,
    results,
    gameSeed,
    createGame,
    cancelGame,
    activeChallengeId,
    setActiveChallengeId,
  } = useGame();
  const navigate = useNavigate();
  const navigatingRef = useRef(false);

  // Recipients of a shared challenge skip the solo results page entirely
  // — once they've finished, the originator's already there to compare
  // against, so jumping straight to the compare view is the right
  // first-time UX.
  useEffect(() => {
    if (!activeChallengeId) return;
    if (!results || !game) return;
    navigatingRef.current = true;
    const target = activeChallengeId;
    setActiveChallengeId(null);
    navigate(`/freeplay/challenge/${target}?compare=owner`, { replace: true });
  }, [activeChallengeId, results, game, navigate, setActiveChallengeId]);

  useEffect(() => {
    if (activeChallengeId) return;
    if ((!results || !game) && !navigatingRef.current) navigate('/');
  }, [results, game, navigate, activeChallengeId]);

  const totalPoints = useMemo(
    () => (results ? results.foundWords.reduce((sum, w) => sum + w.score, 0) : 0),
    [results],
  );

  const roster: ResultsRosterEntry[] = useMemo(
    () =>
      results
        ? [
            {
              id: results.freePlaySessionId ?? 'you',
              rank: 1,
              displayName: 'You',
              points: totalPoints,
              isYou: true,
            },
          ]
        : [],
    [results, totalPoints],
  );

  // Solo share: mint a challenge id server-side so the link recipients
  // hit resolves to a real row. Falls back to a friendly plaintext if
  // the session isn't promotable.
  const { share, copied } = useShareText(async () => {
    if (!results || !game || gameSeed == null) return 'Froggle challenge';
    const sessionId = results.freePlaySessionId;
    if (!sessionId) return 'Froggle challenge';
    const minted = await createFreePlayChallenge(sessionId);
    if (!minted?.challengeId) return 'Froggle challenge';
    return `Froggle challenge — ${encodeGameLink({
      boardSize: game.config.boardSize,
      seed: gameSeed,
      timer: game.config.durationSeconds,
      minWordLength: game.config.minWordLength,
      challengeId: minted.challengeId,
    })}`;
  });

  if (!results || !game) return null;

  const handlePlayAgain = async () => {
    navigatingRef.current = true;
    navigate('/play');
    await createGame();
  };

  const handleClose = async () => {
    navigatingRef.current = true;
    if (game) await cancelGame();
    navigate('/');
  };

  return (
    <ResultsView
      me={{
        displayName: 'You',
        points: totalPoints,
        wordCount: results.foundWords.length,
        foundWords: results.foundWords,
        missedWords: results.missedWords,
      }}
      board={results.board}
      config={{
        boardSize: game.config.boardSize,
        minWordLength: game.config.minWordLength,
        timeLimit: game.config.durationSeconds,
      }}
      roster={roster}
      topbarLabel=""
      topbarOnClose={handleClose}
      topbarOnShare={share}
      topbarShareCopied={copied}
      bottomActions={
        <InkButton onClick={handlePlayAgain}>
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
          >
            <path d="M1 4v6h6" />
            <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
          </svg>
        </InkButton>
      }
    />
  );
}
