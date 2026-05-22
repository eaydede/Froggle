import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '../../GameContext';
import { GauntletHubPage } from './GauntletHubPage';
import {
  fetchGauntletStatus,
  type GauntletStatusResponse,
} from '../../shared/api/gauntletApi';

function formatLongDate(dateIso: string): string {
  const d = new Date(dateIso + 'T12:00:00');
  const weekday = d.toLocaleString('en-US', { weekday: 'long' });
  const month = d.toLocaleString('en-US', { month: 'long' });
  return `${weekday} · ${month} ${d.getDate()}`;
}

// /daily/gauntlet is a smart entry: it only shows the hub when the gauntlet
// is *unplayed*. A partial gauntlet skips the hub and lands the player on
// the next round's confirm; a completed gauntlet jumps to the aggregate
// standings. This keeps the hub from being an unnecessary interstitial in
// the play loop — the player sees it once on first entry and then moves
// straight through rounds.
export function GauntletHubRoute() {
  const navigate = useNavigate();
  const { authReady } = useGame();
  const [status, setStatus] = useState<GauntletStatusResponse | null>(null);

  useEffect(() => {
    if (!authReady) return;
    let cancelled = false;
    fetchGauntletStatus()
      .then((s) => {
        if (cancelled) return;
        if (s.entry.state === 'partial' && s.nextRoundIndex !== null) {
          navigate(`/daily/gauntlet/round/${s.nextRoundIndex}`, { replace: true });
          return;
        }
        if (s.entry.state === 'completed') {
          navigate('/daily/gauntlet/results', { replace: true });
          return;
        }
        setStatus(s);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [authReady, navigate]);

  if (!status) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-[var(--surface-panel)] text-[color:var(--ink)] font-[family-name:var(--font-ui)]" />
    );
  }

  return (
    <GauntletHubPage
      dateLabel={formatLongDate(status.date)}
      puzzleNumber={status.puzzleNumber}
      roundKinds={status.roundKinds}
      onStart={() => navigate('/daily/gauntlet/round/0')}
      onBack={() => navigate('/')}
    />
  );
}
