import { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { GameState } from 'models';
import { useGame } from '../../GameContext';
import { decodeGameParams } from '../../shared/utils/gameLink';
import {
  fetchFreePlayChallengePreview,
  type FreePlayChallengePreview,
} from '../../shared/api/gameApi';
import { createMultiplayerRoom } from '../../shared/api/multiplayerApi';
import { ChallengeConfirmPage } from '../challenge/ChallengeConfirmPage';

// The /play entry is a dispatcher, not a config screen. There is no longer
// a standalone config page — settings live in the lobby. Three kinds of
// arrival route to three surfaces:
//   • challenge link  (?c=…&ch=…) → the challenge-accept screen → /game
//   • bare board link (?c=…)      → straight into /game on the shared board
//   • plain free play (/play)     → a freshly minted room (the lobby)
export function ConfigRoute() {
  const {
    game,
    authReady,
    startGame,
    cancelGame,
    createGame,
    setActiveChallengeId,
  } = useGame();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [challengePreview, setChallengePreview] = useState<FreePlayChallengePreview | null>(null);
  const initRef = useRef(false);

  const sharedGame = useMemo(() => decodeGameParams(searchParams), [searchParams]);
  const challengeId = sharedGame?.challengeId;

  useEffect(() => {
    if (initRef.current) return;
    // A challenge preview must go out with our token so the server can tell
    // whether we've already played; wait for auth before that one branch.
    if (challengeId && !authReady) return;
    initRef.current = true;

    const init = async () => {
      // Challenge link → show who challenged us before committing.
      if (challengeId && sharedGame) {
        const preview = await fetchFreePlayChallengePreview(challengeId);
        if (preview?.alreadyPlayed) {
          navigate(`/freeplay/challenge/${challengeId}`, { replace: true });
          return;
        }
        if (preview) {
          setChallengePreview(preview);
          return;
        }
        // Preview fetch failed (deleted/unknown challenge) — fall through
        // and just play the board the link encodes.
      }

      // Bare board link → the board is fully specified by the params, so
      // there's nothing to configure; drop straight into the game.
      if (sharedGame) {
        // /api/game/start only accepts a Config-state session; a leftover
        // Finished game from a prior round would be rejected, so mint a fresh
        // one unless the current session is already startable.
        if (!game || game.status !== GameState.Config) await createGame();
        await startGame(
          sharedGame.timer,
          sharedGame.boardSize,
          sharedGame.minWordLength,
          undefined,
          sharedGame.seed,
          sharedGame.challengeId,
        );
        if (sharedGame.challengeId) setActiveChallengeId(sharedGame.challengeId);
        navigate('/game', { replace: true });
        return;
      }

      // Plain free play → mint a room and hand off to the merged lobby.
      try {
        const room = await createMultiplayerRoom();
        navigate(`/play/room/${room.code}`, { replace: true });
      } catch {
        // Room backend unreachable — still let free play work by starting a
        // default solo game rather than stranding the user on a dead route.
        // /api/game/start only accepts a Config-state session; a leftover
        // Finished game from a prior round would be rejected, so mint a fresh
        // one unless the current session is already startable.
        if (!game || game.status !== GameState.Config) await createGame();
        await startGame(60, 4, 3);
        navigate('/game', { replace: true });
      }
    };

    init();
  }, [authReady, challengeId]);

  // Challenge accept screen: shown when a recipient lands via a share link
  // and hasn't played yet. A distinct page from anything config-related, so
  // the link's purpose is obvious. Start runs the established single-player
  // engine, then routes the post-game compare view via activeChallengeId.
  if (challengePreview && sharedGame) {
    return (
      <ChallengeConfirmPage
        ownerDisplayName={challengePreview.ownerDisplayName}
        boardSize={challengePreview.config.boardSize}
        timeLimit={challengePreview.config.timeLimit}
        minWordLength={challengePreview.config.minWordLength}
        playerCount={challengePreview.playerCount}
        onStart={async () => {
          // Same Config-state requirement as the auto-start paths above.
          if (!game || game.status !== GameState.Config) await createGame();
          await startGame(
            sharedGame.timer,
            sharedGame.boardSize,
            sharedGame.minWordLength,
            undefined,
            sharedGame.seed,
            sharedGame.challengeId,
          );
          if (sharedGame.challengeId) setActiveChallengeId(sharedGame.challengeId);
          navigate('/game');
        }}
        onBack={async () => {
          setActiveChallengeId(null);
          await cancelGame();
          navigate('/');
        }}
      />
    );
  }

  // Every other arrival redirects or auto-starts from the effect above; hold
  // a blank surface until that navigation lands.
  return null;
}
