import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { EXPERIMENTAL_MODES, type ExperimentalModeKey } from 'models/experimental';
import { useGame } from '../../GameContext';
import { ExperimentalOverviewPage } from './ExperimentalOverviewPage';
import {
  fetchExperimentalSession,
  fetchExperimentalStatus,
  startExperimentalSession,
} from '../../shared/api/dailyExperimentalApi';

function todayPST(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' });
}

function formatLongDate(dateIso: string): string {
  const d = new Date(dateIso + 'T12:00:00');
  const weekday = d.toLocaleString('en-US', { weekday: 'long' });
  const month = d.toLocaleString('en-US', { month: 'long' });
  return `${weekday} · ${month} ${d.getDate()}`;
}

export function ExperimentalOverviewRoute() {
  const { mode } = useParams<{ mode: string }>();
  const navigate = useNavigate();
  const { authReady } = useGame();
  const modeKey = mode as ExperimentalModeKey;
  const valid = !!mode && Object.prototype.hasOwnProperty.call(EXPERIMENTAL_MODES, mode);

  const [state, setState] = useState<'unplayed' | 'in-progress' | 'completed'>('unplayed');
  const [puzzleNumber, setPuzzleNumber] = useState(0);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!valid) {
      navigate('/daily/experimental', { replace: true });
    }
  }, [valid, navigate]);

  useEffect(() => {
    if (!authReady || !valid) return;
    let cancelled = false;
    Promise.all([
      fetchExperimentalSession(modeKey, todayPST()),
      fetchExperimentalStatus().catch(() => null),
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
  }, [authReady, valid, modeKey]);

  // Once a mode has been played, the "how it works" intro is just a speed bump
  // between the hub and the result — skip straight to the results screen.
  useEffect(() => {
    if (loaded && valid && state === 'completed') {
      navigate(`/daily/experimental/${modeKey}/results`, { replace: true });
    }
  }, [loaded, valid, state, modeKey, navigate]);

  if (!valid || !loaded || state === 'completed') {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-[var(--surface-panel)] text-[color:var(--ink)] font-[family-name:var(--font-ui)]" />
    );
  }

  const meta = EXPERIMENTAL_MODES[modeKey];
  const date = todayPST();

  const onStart = async () => {
    const session = await startExperimentalSession(modeKey, date);
    if (!session) return;
    navigate(`/daily/experimental/${modeKey}/play`);
  };

  return (
    <ExperimentalOverviewPage
      dateLabel={formatLongDate(date)}
      puzzleNumber={puzzleNumber}
      meta={meta}
      state={state}
      onStart={onStart}
      onResume={() => navigate(`/daily/experimental/${modeKey}/play`)}
      onSeeResults={() => navigate(`/daily/experimental/${modeKey}/results`)}
      onBack={() => navigate('/daily/experimental')}
    />
  );
}
