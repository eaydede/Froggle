import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ExperimentalModeKey } from 'models/experimental';
import { useGame } from '../../GameContext';
import { ExperimentalHubPage } from './ExperimentalHubPage';
import {
  fetchExperimentalStatus,
  type ExperimentalStatusResponse,
  type ExperimentalTileStatus,
} from '../../shared/api/dailyExperimentalApi';

function formatLongDate(dateIso: string): string {
  const d = new Date(dateIso + 'T12:00:00');
  const weekday = d.toLocaleString('en-US', { weekday: 'long' });
  const month = d.toLocaleString('en-US', { month: 'long' });
  return `${weekday} · ${month} ${d.getDate()}`;
}

export function ExperimentalHubRoute() {
  const navigate = useNavigate();
  const { authReady } = useGame();
  const [status, setStatus] = useState<ExperimentalStatusResponse | null>(null);

  useEffect(() => {
    if (!authReady) return;
    let cancelled = false;
    fetchExperimentalStatus()
      .then((s) => {
        if (!cancelled) setStatus(s);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [authReady]);

  if (!status) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-[var(--surface-panel)] text-[color:var(--ink)] font-[family-name:var(--font-ui)]" />
    );
  }

  // A played mode has nothing new to explain — jump past the overview straight
  // to its result. Unplayed / in-progress modes still land on the overview.
  const onSelect = (mode: ExperimentalModeKey, state: ExperimentalTileStatus['state']) =>
    navigate(
      state === 'completed'
        ? `/daily/experimental/${mode}/results`
        : `/daily/experimental/${mode}`,
    );

  return (
    <ExperimentalHubPage
      dateLabel={formatLongDate(status.date)}
      puzzleNumber={status.number}
      statuses={status.modes}
      onSelect={onSelect}
      onBack={() => navigate('/')}
    />
  );
}
