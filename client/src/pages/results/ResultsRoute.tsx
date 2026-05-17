import { useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '../../GameContext';
import { ResultsView } from '../../shared/results/ResultsView';
import type { ResultsRosterEntry } from '../../shared/results/types';
import { encodeGameLink } from '../../shared/utils/gameLink';
import { createFreePlayChallenge } from '../../shared/api/gameApi';
import { useShareText } from './hooks/useShareText';
import { ActionButton } from '../../shared/results/components/ActionButton';

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
  // — once they've finished they land on the multi-player results for
  // the challenge they were invited to. We DON'T pre-select the owner as
  // an opponent: the standings are visible and the user picks who to
  // compare against (or not).
  useEffect(() => {
    if (!activeChallengeId) return;
    if (!results || !game) return;
    navigatingRef.current = true;
    const target = activeChallengeId;
    setActiveChallengeId(null);
    navigate(`/freeplay/challenge/${target}`, { replace: true });
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
  // Hold a blank surface while the challenge redirect kicks in on the
  // next tick — without this guard the solo results would flash before
  // ChallengeRoute mounts.
  if (activeChallengeId) return null;

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
            onClick={handlePlayAgain}
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
