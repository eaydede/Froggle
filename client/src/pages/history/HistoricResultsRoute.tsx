import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useGame } from '../../GameContext';
import {
  createFreePlayChallenge,
  fetchFreePlaySession,
  type FreePlaySessionResponse,
} from '../../shared/api/gameApi';
import { ResultsView } from '../../shared/results/ResultsView';
import type { ResultsRosterEntry } from '../../shared/results/types';
import { encodeGameLink } from '../../shared/utils/gameLink';
import { useShareText } from '../results/hooks/useShareText';
import { InkButton } from '../../shared/components/InkButton';

// Renders the unified results page from a persisted free-play row.
// Always shows the viewer in solo state — a session that has been
// promoted to a challenge with multiple finishers is reached via
// /freeplay/challenge/:id instead, which renders the full standings.
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

  const totalPoints = useMemo(
    () => (data ? data.foundWords.reduce((sum, w) => sum + w.score, 0) : 0),
    [data],
  );

  const roster: ResultsRosterEntry[] = useMemo(
    () =>
      data
        ? [
            {
              id: data.sessionId,
              rank: 1,
              displayName: 'You',
              points: totalPoints,
              isYou: true,
            },
          ]
        : [],
    [data, totalPoints],
  );

  const { share, copied } = useShareText(async () => {
    if (!data || data.seed == null) return 'Froggle challenge';
    const minted = await createFreePlayChallenge(data.sessionId);
    if (!minted?.challengeId) return 'Froggle challenge';
    return `Froggle challenge — ${encodeGameLink({
      boardSize: data.config.boardSize,
      seed: data.seed,
      timer: data.config.timeLimit,
      minWordLength: data.config.minWordLength,
      challengeId: minted.challengeId,
    })}`;
  });

  if (failed) {
    navigate('/history', { replace: true });
    return null;
  }
  if (!data) return null;

  const handlePlayAgain = async () => {
    await createGame();
    navigate('/play');
  };

  return (
    <ResultsView
      me={{
        displayName: 'You',
        points: totalPoints,
        wordCount: data.foundWords.length,
        foundWords: data.foundWords,
        missedWords: data.missedWords,
      }}
      board={data.board}
      config={data.config}
      roster={roster}
      topbarLabel=""
      topbarOnClose={() => navigate('/history')}
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
