import { GameState } from 'models';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ChallengeConfirmPage } from '../../challenges/ChallengeConfirmPage';
import { fetchFreePlayChallengePreview, type FreePlayChallengePreview } from '../../challenges/api';
import { useIdentity } from '../../identity/Identity';
import { createMultiplayerRoom } from '../../rooms/api';
import { useFreePlay } from '../FreePlay';
import { decodeGameParams } from '../links';

type Arrival = { destination: string; } | { preview: FreePlayChallengePreview; };

// The existing /play URL accepts both compact shared boards and room entry.
export function ConfigRoute() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const shared = useMemo(() => decodeGameParams(params), [params]);
  const { authReady } = useIdentity();
  const freePlay = useFreePlay();
  const [preview, setPreview] = useState<FreePlayChallengePreview | null>(null);
  const arrival = useRef<Promise<Arrival> | null>(null);

  const startSharedBoard = async () => {
    if (!shared) return;
    await freePlay.startGame(shared.timer, shared.boardSize, shared.minWordLength, undefined, shared.seed, shared.challengeId);
  };
  useEffect(() => {
    if (!authReady || !freePlay.ready) return;
    let current = true;
    if (!arrival.current) {
      arrival.current = (async (): Promise<Arrival> => {
        if (freePlay.game?.status === GameState.InProgress) return { destination: '/game' };
        if (shared?.challengeId) {
          const invitation = await fetchFreePlayChallengePreview(shared.challengeId);
          if (invitation?.alreadyPlayed) return { destination: `/freeplay/challenge/${shared.challengeId}` };
          if (invitation) return { preview: invitation };
        }
        if (shared) {
          await startSharedBoard();
          return { destination: '/game' };
        }
        try {
          const room = await createMultiplayerRoom();
          return { destination: `/play/room/${room.code}` };
        } catch {
          await freePlay.startGame(60, 4, 3);
          return { destination: '/game' };
        }
      })();
    }
    arrival.current.then(result => {
      if (!current) return;
      if ('destination' in result) navigate(result.destination, { replace: true });
      else setPreview(result.preview);
    }).catch(error => { console.warn('Could not open free play:', error); });
    return () => { current = false; };
  }, [authReady, freePlay.ready, shared, navigate]);

  if (!preview || !shared) return null;
  return <ChallengeConfirmPage
    ownerDisplayName={preview.ownerDisplayName}
    boardSize={preview.config.boardSize}
    timeLimit={preview.config.timeLimit}
    minWordLength={preview.config.minWordLength}
    playerCount={preview.playerCount}
    onStart={async () => { await startSharedBoard(); navigate('/game'); }}
    onBack={async () => { await freePlay.cancelGame(); navigate('/'); }}
  />;
}
