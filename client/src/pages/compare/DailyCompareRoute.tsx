import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useGame } from '../../GameContext';
import {
  fetchDailyCompare,
  type DailyCompareResponse,
  type DailyCompareError,
} from '../../shared/api/gameApi';
import { DailyComparePage } from './DailyComparePage';
import { DailyCompareUnavailable } from './DailyCompareUnavailable';
import { defaultCompare } from './__fixtures__/default';

type LoadState =
  | { status: 'loading' }
  | { status: 'ready'; data: DailyCompareResponse }
  | { status: 'error'; kind: DailyCompareError };

export function DailyCompareRoute() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { authReady, cachedDaily } = useGame();

  const date = searchParams.get('date') ?? cachedDaily?.date ?? '';
  const other = searchParams.get('user') ?? '';

  const mockFixture = import.meta.env.DEV
    ? searchParams.get('mock')
    : null;

  const [state, setState] = useState<LoadState>({ status: 'loading' });

  useEffect(() => {
    if (mockFixture === 'default') {
      setState({ status: 'ready', data: defaultCompare });
      return;
    }
    if (mockFixture === 'unplayed') {
      setState({ status: 'error', kind: 'unplayed' });
      return;
    }
    if (mockFixture === 'opponent-missing') {
      setState({ status: 'error', kind: 'opponent-missing' });
      return;
    }
    if (!authReady) return;
    if (!date || !other) {
      setState({ status: 'error', kind: 'unknown' });
      return;
    }

    let cancelled = false;
    fetchDailyCompare(date, other).then((result) => {
      if (cancelled) return;
      if (result.ok) setState({ status: 'ready', data: result.data });
      else setState({ status: 'error', kind: result.error });
    });
    return () => {
      cancelled = true;
    };
  }, [authReady, date, other, mockFixture]);

  const backToLeaderboard = () => {
    if (date) navigate(`/leaderboard?date=${date}`);
    else navigate('/leaderboard');
  };

  if (state.status === 'loading') {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-[var(--surface-panel)] text-[color:var(--ink)] font-[family-name:var(--font-ui)]" />
    );
  }

  if (state.status === 'ready') {
    return <DailyComparePage data={state.data} onBack={backToLeaderboard} />;
  }

  // Error states — tailored copy per kind.
  switch (state.kind) {
    case 'unplayed':
      return (
        <DailyCompareUnavailable
          title="Play today's daily first."
          body="You need to finish today's puzzle before you can compare with other players."
          primaryLabel="Play daily"
          onPrimary={() => navigate('/daily')}
          onBack={backToLeaderboard}
        />
      );
    case 'opponent-missing':
      return (
        <DailyCompareUnavailable
          title="Nothing to compare yet."
          body="That player hasn't posted a result for this puzzle."
          primaryLabel="Back to leaderboard"
          onPrimary={backToLeaderboard}
          onBack={backToLeaderboard}
        />
      );
    case 'forbidden':
      return (
        <DailyCompareUnavailable
          title="That's you."
          body="Pick someone else from the leaderboard to see a side-by-side comparison."
          primaryLabel="Back to leaderboard"
          onPrimary={backToLeaderboard}
          onBack={backToLeaderboard}
        />
      );
    default:
      return (
        <DailyCompareUnavailable
          title="Something went wrong."
          body="We couldn't load this comparison. Try again in a moment."
          primaryLabel="Back to leaderboard"
          onPrimary={backToLeaderboard}
          onBack={backToLeaderboard}
        />
      );
  }
}
