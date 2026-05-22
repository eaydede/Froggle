import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { GauntletRoundConfig } from 'models/gauntlet';
import { GAUNTLET_ROUND_COUNT } from 'models/gauntlet';
import { useGame } from '../../GameContext';
import { GauntletConfirmPage } from './GauntletConfirmPage';
import {
  fetchGauntletStatus,
  fetchGauntletPreview,
  startGauntletRound,
} from '../../shared/api/gauntletApi';

function formatLongDate(dateIso: string): string {
  const d = new Date(dateIso + 'T12:00:00');
  const weekday = d.toLocaleString('en-US', { weekday: 'long' });
  const month = d.toLocaleString('en-US', { month: 'long' });
  return `${weekday} · ${month} ${d.getDate()}`;
}

export function GauntletConfirmRoute() {
  const { round } = useParams<{ round: string }>();
  const navigate = useNavigate();
  const { authReady } = useGame();
  const roundIndex = Number(round);
  const [config, setConfig] = useState<GauntletRoundConfig | null>(null);
  const [date, setDate] = useState<string | null>(null);
  const [puzzleNumber, setPuzzleNumber] = useState<number>(0);
  const [alreadyEnded, setAlreadyEnded] = useState(false);
  const [locked, setLocked] = useState(false);
  const [completedRounds, setCompletedRounds] = useState<number[]>([]);

  useEffect(() => {
    if (!authReady || !Number.isFinite(roundIndex)) return;
    let cancelled = false;
    (async () => {
      const status = await fetchGauntletStatus();
      if (cancelled) return;
      setDate(status.date);
      setPuzzleNumber(status.puzzleNumber);
      setCompletedRounds(
        status.entry.rounds
          .map((r, i) => (r?.endedAt ? i : -1))
          .filter((i) => i >= 0),
      );

      const summary = status.entry.rounds[roundIndex];
      if (summary?.endedAt) {
        setAlreadyEnded(true);
      }

      // Round is playable if it's the next round (or already in progress).
      // Otherwise it's locked behind earlier rounds.
      if (status.nextRoundIndex !== null && status.nextRoundIndex < roundIndex && !summary) {
        setLocked(true);
      }

      // Prefer the live modifier from the user's started round (it carries
      // the picked hot letter and any chosen values). Fall back to the
      // upcoming-config from the hub, then to a fresh preview if neither
      // is available (deep-link without prior status fetch).
      if (summary) {
        setConfig({
          index: summary.index,
          kind: summary.kind,
          boardSize: summary.boardSize,
          timeLimit: summary.timeLimit,
          minWordLength: summary.minWordLength,
          modifier: summary.modifier,
        });
        return;
      }
      const upcoming = status.upcomingConfigs[roundIndex];
      if (upcoming) {
        setConfig(upcoming);
        return;
      }
      try {
        const preview = await fetchGauntletPreview(status.date);
        if (!cancelled) setConfig(preview.rounds[roundIndex]?.config ?? null);
      } catch {
        // leave config null; loading state stays
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authReady, roundIndex]);

  if (locked) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-[var(--surface-panel)] text-[color:var(--ink)] font-[family-name:var(--font-ui)] text-small text-[color:var(--ink-muted)] p-6 text-center">
        Finish the earlier rounds first.
      </div>
    );
  }

  if (!config || !date) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-[var(--surface-panel)] text-[color:var(--ink)] font-[family-name:var(--font-ui)]" />
    );
  }

  const handleStart = async () => {
    const result = await startGauntletRound(date, roundIndex);
    if ('error' in result) {
      // Server-side gate caught a stale UI state. Bounce to hub so the
      // user can see why.
      navigate('/daily/gauntlet');
      return;
    }
    navigate(`/daily/gauntlet/round/${roundIndex}/play`);
  };

  return (
    <GauntletConfirmPage
      dateLabel={formatLongDate(date)}
      puzzleNumber={puzzleNumber}
      totalRounds={GAUNTLET_ROUND_COUNT}
      config={config}
      completedRounds={completedRounds}
      alreadyEnded={alreadyEnded}
      onStart={handleStart}
      onSeeResult={() => navigate(`/daily/gauntlet/round/${roundIndex}/results`)}
      onViewRoundResult={(index) =>
        navigate(`/daily/gauntlet/round/${index}/results`)
      }
      onBack={() => navigate('/')}
    />
  );
}
