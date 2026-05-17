import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '../../GameContext';
import { fetchFreePlayHistory, type FreePlayHistoryEntry } from '../../shared/api/gameApi';
import { HistoryPage } from './HistoryPage';

export function HistoryRoute() {
  const { authReady } = useGame();
  const navigate = useNavigate();
  const [entries, setEntries] = useState<FreePlayHistoryEntry[] | null>(null);

  useEffect(() => {
    if (!authReady) return;
    let cancelled = false;
    fetchFreePlayHistory()
      .then((data) => {
        if (!cancelled) setEntries(data.entries);
      })
      .catch(() => {
        if (!cancelled) setEntries([]);
      });
    return () => {
      cancelled = true;
    };
  }, [authReady]);

  return (
    <HistoryPage
      entries={entries}
      onBack={() => navigate('/')}
      // One tap target per row — route to the standings/compare view
      // when someone else has joined, otherwise the solo results page.
      onOpenEntry={(entry) => {
        if (entry.challengeId && entry.playerCount > 1) {
          navigate(`/freeplay/challenge/${entry.challengeId}`);
        } else {
          navigate(`/freeplay/results/${entry.sessionId}`);
        }
      }}
    />
  );
}
