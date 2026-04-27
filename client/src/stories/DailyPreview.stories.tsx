import { useCallback, useEffect, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Board } from '../pages/game/components/Board';
import type { FeedbackType } from '../pages/game/components/Board';
import type { Position } from 'models';

// Hits the server's dev-only /api/daily/preview endpoint, which returns
// `{ seed, config, board }` for any seed without spoiling future dailies.
// Storybook runs on its own port, so we go straight to the server rather
// than relying on a proxy.
const PREVIEW_URL = 'http://localhost:3000/api/daily/preview';

interface PreviewResponse {
  seed: number;
  config: { boardSize: number; minWordLength: number; timeLimit: number };
  board: string[][];
}

function DailyPreview({ initialSeed }: { initialSeed: string }) {
  const [seedInput, setSeedInput] = useState(initialSeed);
  const [data, setData] = useState<PreviewResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: FeedbackType; path: Position[] } | null>(null);

  const load = useCallback(async (seed: string) => {
    if (!seed) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${PREVIEW_URL}?seed=${encodeURIComponent(seed)}`);
      if (!res.ok) throw new Error(`Server returned ${res.status} (is the dev server running on :3000?)`);
      setData(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(initialSeed);
  }, [initialSeed, load]);

  const randomize = () => {
    const next = String(Math.floor(Math.random() * 1_000_000));
    setSeedInput(next);
    load(next);
  };

  const handleSubmitWord = useCallback((path: Position[]) => {
    setFeedback({ type: 'valid', path });
    setTimeout(() => setFeedback(null), 800);
  }, []);

  return (
    <div className="flex flex-col gap-6 max-w-md">
      <div className="flex gap-2 items-center">
        <input
          type="text"
          value={seedInput}
          onChange={(e) => setSeedInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') load(seedInput);
          }}
          placeholder="seed (numeric or string)"
          className="flex-1 px-3 py-2 border border-[var(--border)] rounded text-sm"
        />
        <button
          onClick={() => load(seedInput)}
          className="px-3 py-2 border border-[var(--border)] rounded text-sm"
          disabled={loading}
        >
          Load
        </button>
        <button
          onClick={randomize}
          className="px-3 py-2 border border-[var(--border)] rounded text-sm"
          disabled={loading}
        >
          🎲
        </button>
      </div>

      {error && (
        <div className="text-sm text-red-600">{error}</div>
      )}

      {data && (
        <>
          <div className="grid grid-cols-3 gap-2 text-center">
            {[
              { label: 'Board', value: `${data.config.boardSize}×${data.config.boardSize}` },
              { label: 'Min word', value: `${data.config.minWordLength} letters` },
              { label: 'Time', value: `${data.config.timeLimit}s` },
            ].map(({ label, value }) => (
              <div key={label} className="px-3 py-2 border border-[var(--border)] rounded">
                <div className="text-xs text-[var(--text-muted)] uppercase tracking-wider">{label}</div>
                <div className="text-base font-semibold">{value}</div>
              </div>
            ))}
          </div>

          <div
            style={{ '--board-size': data.config.boardSize, width: 360 } as React.CSSProperties}
          >
            <Board
              board={data.board}
              onSubmitWord={handleSubmitWord}
              feedback={feedback}
            />
          </div>

          <div className="text-xs text-[var(--text-muted)]">
            Resolved seed: <code>{data.seed}</code>
          </div>
        </>
      )}
    </div>
  );
}

const meta: Meta<typeof DailyPreview> = {
  title: 'Daily/Randomized Config Preview',
  component: DailyPreview,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Live preview of the randomized daily config rotation. Calls the dev-only ' +
          '`GET /api/daily/preview?seed=...` endpoint and renders the resulting board, ' +
          'board size, min word length, and time limit. Try the dice button to roll ' +
          'across combos without burning real puzzle dates.',
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof DailyPreview>;

export const Interactive: Story = {
  args: { initialSeed: '1231' },
};
