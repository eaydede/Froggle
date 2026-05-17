import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useGame } from '../../GameContext';
import { fetchFreePlayChallenge, type FreePlayChallengeResponse, type FreePlayChallengeError } from '../../shared/api/gameApi';
import { ChallengePage } from './ChallengePage';
import { ChallengeUnavailable } from './ChallengeUnavailable';

export function ChallengeRoute() {
  const { authReady } = useGame();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
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
        setState(result.ok ? { kind: 'ok', data: result.data } : { kind: 'error', error: result.error });
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
  return <ChallengePage data={state.data} onBack={goBack} onPlayAgain={playAgain} />;
}
