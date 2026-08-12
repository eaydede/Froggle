import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '../../GameContext';
import { TimeIsMoneyOverviewPage } from './TimeIsMoneyOverviewPage';
import {
  fetchTimeIsMoneySession,
  fetchTimeIsMoneyStatus,
  startTimeIsMoneySession,
} from '../../shared/api/timeIsMoneyApi';

function todayPST(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' });
}

function formatLongDate(dateIso: string): string {
  const d = new Date(dateIso + 'T12:00:00');
  const weekday = d.toLocaleString('en-US', { weekday: 'long' });
  const month = d.toLocaleString('en-US', { month: 'long' });
  return `${weekday} · ${month} ${d.getDate()}`;
}

export function TimeIsMoneyOverviewRoute() {
  const navigate = useNavigate();
  const { authReady } = useGame();

  const [state, setState] = useState<'unplayed' | 'in-progress' | 'completed'>('unplayed');
  const [puzzleNumber, setPuzzleNumber] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const date = todayPST();

  useEffect(() => {
    if (!authReady) return;
    let cancelled = false;
    Promise.all([
      fetchTimeIsMoneySession(todayPST()),
      fetchTimeIsMoneyStatus().catch(() => null),
    ])
      .then(([session, status]) => {
        if (cancelled) return;
        if (!session) setState('unplayed');
        else if (session.ended_at) setState('completed');
        else setState('in-progress');
        if (status) setPuzzleNumber(status.number);
        setLoaded(true);
      })
      .catch(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [authReady]);

  // Once the day's run is done, the "how it works" intro is just a speed bump
  // between the landing page and the result — skip straight to the results.
  useEffect(() => {
    if (loaded && state === 'completed') {
      navigate('/daily/time-is-money/results', { replace: true });
    }
  }, [loaded, state, navigate]);

  if (!loaded || state === 'completed') {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-[var(--surface-panel)] text-[color:var(--ink)] font-[family-name:var(--font-ui)]" />
    );
  }

  const onStart = async () => {
    const session = await startTimeIsMoneySession(date);
    if (!session) return;
    navigate('/daily/time-is-money/play');
  };

  return (
    <TimeIsMoneyOverviewPage
      dateLabel={formatLongDate(date)}
      puzzleNumber={puzzleNumber}
      state={state}
      onStart={onStart}
      onResume={() => navigate('/daily/time-is-money/play')}
      onSeeResults={() => navigate('/daily/time-is-money/results')}
      onBack={() => navigate('/')}
    />
  );
}
