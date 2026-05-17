import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { GameState, type Game } from 'models';
import { useGame } from '../../GameContext';
import {
  createFreePlayChallenge,
  fetchFreePlaySession,
  type FreePlaySessionResponse,
} from '../../shared/api/gameApi';
import type { GameResults } from '../../shared/types';
import { ChallengePage } from '../challenge/ChallengePage';
import { synthesizeSoloChallenge } from '../../shared/utils/synthesizeChallenge';

// Renders the unified challenge results page from a persisted free-play
// row. Same UI as the live post-game results — solo or compare,
// depending on player count.
export function HistoricResultsRoute() {
  const { authReady, createGame } = useGame();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<FreePlaySessionResponse | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!authReady || !id) return;
    let cancelled = false;
    setData(null);
    setFailed(false);
    fetchFreePlaySession(id)
      .then((res) => {
        if (cancelled) return;
        if (res) setData(res);
        else setFailed(true);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [authReady, id]);

  if (failed) {
    navigate('/history', { replace: true });
    return null;
  }
  if (!data) return null;

  const game: Game = {
    board: data.board,
    startedAt: 0,
    status: GameState.Finished,
    config: {
      durationSeconds: data.config.timeLimit,
      boardSize: data.config.boardSize,
      minWordLength: data.config.minWordLength,
    },
  };

  const results: GameResults = {
    board: data.board,
    foundWords: data.foundWords,
    missedWords: data.missedWords,
    freePlaySessionId: data.sessionId,
  };

  const challengeData = synthesizeSoloChallenge({
    results,
    game,
    seed: data.seed,
    sessionId: data.sessionId,
  });

  const handlePlayAgain = async () => {
    await createGame();
    navigate('/play');
  };

  return (
    <ChallengePage
      data={challengeData}
      onBack={() => navigate('/history')}
      onPlayAgain={handlePlayAgain}
      onShareMint={async () => {
        const minted = await createFreePlayChallenge(data.sessionId);
        return minted?.challengeId ?? null;
      }}
    />
  );
}
