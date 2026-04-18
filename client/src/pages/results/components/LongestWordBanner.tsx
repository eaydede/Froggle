import type { Position } from 'models';
import { Cell } from '../../../shared/components/Cell';

interface LongestWordBannerProps {
  word: string;
  path: Position[];
  score: number;
  highlighted: boolean;
  onToggle: () => void;
}

export function LongestWordBanner({ word, highlighted, onToggle }: LongestWordBannerProps) {
  return (
    <div
      className="flex items-center justify-center gap-1.5 mt-2 cursor-pointer select-none transition-opacity duration-150 hover:opacity-80"
      style={{ WebkitTapHighlightColor: 'transparent' }}
      onClick={onToggle}
    >
      <span className="text-[length:var(--text-caption)]" style={{ color: 'var(--accent-gold)' }}>★</span>
      <div className="flex gap-0.5">
        {word.split('').map((letter, i) => (
          <Cell
            key={i}
            letter={letter}
            state={highlighted ? 'selected' : 'default'}
            size="xxs"
            variant="simple"
            styleOverride={{ width: '13px', height: '13px', fontSize: '10px', borderRadius: '2px' }}
          />
        ))}
      </div>
      <span className="text-[length:var(--text-caption)]" style={{ color: 'var(--accent-gold)' }}>★</span>
    </div>
  );
}
