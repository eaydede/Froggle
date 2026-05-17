import { useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '../../GameContext';
import { ChallengePage } from '../challenge/ChallengePage';
import { synthesizeSoloChallenge } from '../../shared/utils/synthesizeChallenge';
import { createFreePlayChallenge } from '../../shared/api/gameApi';

export function ResultsRoute() {
  const { game, results, gameSeed, createGame, cancelGame, activeChallengeId, setActiveChallengeId } = useGame();
  const navigate = useNavigate();
  const navigatingRef = useRef(false);

  // Recipients of a shared challenge skip the solo results page entirely
  // — once they've finished the originator's already there to compare
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

  const challengeData = useMemo(() => {
    if (!results || !game) return null;
    return synthesizeSoloChallenge({
      results,
      game,
      seed: gameSeed,
      sessionId: results.freePlaySessionId ?? null,
    });
  }, [results, game, gameSeed]);

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

  if (!challengeData) return null;

  return (
    <ChallengePage
      data={challengeData}
      onBack={handleClose}
      onPlayAgain={handlePlayAgain}
      onShareMint={async () => {
        const sessionId = results.freePlaySessionId;
        if (!sessionId) return null;
        const minted = await createFreePlayChallenge(sessionId);
        return minted?.challengeId ?? null;
      }}
    />
  );
}
