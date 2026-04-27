import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '../../GameContext';
import {
  fetchDailyRelaxedResult,
  type DailyRelaxedResultResponse,
} from '../../shared/api/gameApi';
import { scoreWord } from '../../shared/utils/score';
import { InkButton } from '../../shared/components/InkButton';

export function RelaxedResultsRoute() {
  const navigate = useNavigate();
  const { cachedDailyRelaxed, dailyRelaxedLoaded, authReady } = useGame();
  const [result, setResult] = useState<DailyRelaxedResultResponse | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!authReady || !dailyRelaxedLoaded || !cachedDailyRelaxed) return;
    let cancelled = false;
    fetchDailyRelaxedResult(cachedDailyRelaxed.date)
      .then((r) => {
        if (cancelled) return;
        setResult(r);
        setLoaded(true);
      })
      .catch(() => {
        if (cancelled) return;
        setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [authReady, dailyRelaxedLoaded, cachedDailyRelaxed]);

  if (!loaded || !cachedDailyRelaxed) {
    return <div className="fixed inset-0 bg-[var(--surface-panel)]" />;
  }

  // No finalized result for today — bounce back to the landing card so the
  // user can resume or start.
  if (!result) {
    navigate('/', { replace: true });
    return null;
  }

  const longest = result.found_words.reduce(
    (best, w) => (w.length > best.length ? w : best),
    '',
  );
  const points = result.found_words.reduce((sum, w) => sum + scoreWord(w), 0);

  return (
    <div className="fixed inset-0 flex items-start justify-center bg-[var(--surface-panel)] text-[color:var(--ink)] font-[family-name:var(--font-ui)] overflow-y-auto">
      <div className="w-full max-w-[420px] min-h-full flex flex-col px-[22px] pt-[24px] pb-[22px]">
        <div className="text-center mt-4 mb-6">
          <div
            className="text-caption uppercase tracking-[0.08em] text-[color:var(--ink-soft)] leading-none mb-3 font-[family-name:var(--font-structure)]"
            style={{ fontWeight: 700 }}
          >
            Daily Relaxed #{cachedDailyRelaxed.number}
          </div>
          <div
            className="text-display-sm italic leading-[1.1] tracking-[-0.015em] font-[family-name:var(--font-display)]"
            style={{ fontWeight: 500 }}
          >
            {result.ended_by_player ? 'Nicely done.' : 'Day ended.'}
          </div>
        </div>

        <div className="rounded-2xl bg-[var(--surface-card)] border border-[var(--ink-border-subtle)] shadow-[var(--shadow-card)] p-5 mb-4">
          <div className="flex items-end justify-between mb-3">
            <div className="flex items-baseline gap-[5px]">
              <span
                className="text-display-lg leading-none font-[family-name:var(--font-structure)] tracking-[-0.03em] tabular-nums"
                style={{ fontWeight: 800 }}
              >
                {points}
              </span>
              <span className="text-small text-[color:var(--ink-muted)]" style={{ fontWeight: 600 }}>
                pts
              </span>
            </div>
            <div className="flex flex-col items-end gap-0.5 text-right">
              <span className="text-small text-[color:var(--ink-muted)] tabular-nums" style={{ fontWeight: 500 }}>
                {result.found_words.length} {result.found_words.length === 1 ? 'word' : 'words'}
              </span>
              {longest && (
                <span
                  className="text-small uppercase tracking-[0.04em] text-[color:var(--ink)] font-[family-name:var(--font-structure)]"
                  style={{ fontWeight: 700 }}
                >
                  {longest}
                </span>
              )}
            </div>
          </div>
        </div>

        <Section
          title={`Words you found (${result.found_words.length})`}
          empty={result.found_words.length === 0 ? 'None this round.' : undefined}
        >
          <WordChips words={result.found_words} variant="found" />
        </Section>

        {result.missed_words.length > 0 && (
          <Section title={`Words you missed (${result.missed_words.length})`}>
            <WordChips
              words={result.missed_words.slice(0, 30).map((w) => w.word)}
              variant="missed"
            />
            {result.missed_words.length > 30 && (
              <p
                className="text-small text-[color:var(--ink-soft)] mt-2"
                style={{ fontWeight: 500 }}
              >
                + {result.missed_words.length - 30} more
              </p>
            )}
          </Section>
        )}

        <div className="flex flex-col gap-2 mt-4">
          <InkButton
            onClick={() => navigate(`/daily/relaxed/leaderboard?date=${cachedDailyRelaxed.date}`)}
          >
            See leaderboard
          </InkButton>
          <button
            type="button"
            onClick={() => navigate('/')}
            className="bg-transparent border-none py-3 text-small text-[color:var(--ink-soft)] hover:text-[color:var(--ink)] cursor-pointer text-center transition-colors duration-200 font-[family-name:var(--font-ui)]"
            style={{ fontWeight: 500, WebkitTapHighlightColor: 'transparent' }}
          >
            Back to home
          </button>
        </div>
      </div>
    </div>
  );
}

function Section({
  title,
  children,
  empty,
}: {
  title: string;
  children: React.ReactNode;
  empty?: string;
}) {
  return (
    <div className="mb-4">
      <div
        className="text-caption uppercase tracking-[0.06em] text-[color:var(--ink-soft)] mb-2 font-[family-name:var(--font-structure)]"
        style={{ fontWeight: 700 }}
      >
        {title}
      </div>
      {empty ? (
        <div className="text-small text-[color:var(--ink-muted)]" style={{ fontWeight: 500 }}>
          {empty}
        </div>
      ) : (
        children
      )}
    </div>
  );
}

function WordChips({ words, variant }: { words: string[]; variant: 'found' | 'missed' }) {
  if (words.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {words.map((w) => (
        <span
          key={w}
          className={
            variant === 'found'
              ? 'text-xs px-2 py-1 rounded-md bg-[var(--ink-whisper)] text-[color:var(--ink)] tabular-nums font-[family-name:var(--font-structure)]'
              : 'text-xs px-2 py-1 rounded-md border border-[var(--ink-border-subtle)] text-[color:var(--ink-muted)] tabular-nums font-[family-name:var(--font-structure)]'
          }
          style={{ fontWeight: 600, letterSpacing: '0.02em' }}
        >
          {w.toUpperCase()}
        </span>
      ))}
    </div>
  );
}
