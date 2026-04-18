import type { ScoredWord } from '../../../shared/types';

const SCORE_SQUARE_STYLES: Record<number, React.CSSProperties> = {
  1: { backgroundColor: 'var(--score-1)' },
  2: { backgroundColor: 'var(--score-2)' },
  3: { background: 'linear-gradient(135deg, var(--score-3-from), var(--score-3-to))' },
  5: { background: 'linear-gradient(135deg, var(--score-5-from), var(--score-5-to))', boxShadow: '0 0 3px var(--score-5-shadow)' },
  11: { background: 'linear-gradient(135deg, var(--score-11-from), var(--score-11-to))', boxShadow: '0 0 4px var(--score-11-shadow)', animation: 'gold-glow-square 3s ease-in-out infinite', position: 'relative', overflow: 'visible' },
};

interface ScoreSquaresProps {
  words: ScoredWord[];
  highlightedWord: string | null;
}

export function ScoreSquares({ words, highlightedWord }: ScoreSquaresProps) {
  return (
    <div className="flex items-start gap-1.5 mt-2">
      <div className="flex flex-wrap gap-1">
        {words.map((w) => (
          <div
            key={w.word}
            className="h-[12px] w-[12px] rounded-[2px] transition-transform duration-200"
            style={{
              ...(SCORE_SQUARE_STYLES[w.score] || { backgroundColor: 'var(--score-fallback)' }),
              ...(highlightedWord === w.word ? { transform: 'scale(1.2)', zIndex: 1 } : {}),
            }}
          />
        ))}
      </div>
    </div>
  );
}
