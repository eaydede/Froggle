import { useState, useRef, useEffect } from 'react';

export type RankingType = 'points' | 'words' | 'rarity';

interface RankingSelectorProps {
  value: RankingType;
  onChange: (type: RankingType) => void;
}

const OPTIONS: { value: RankingType; label: string }[] = [
  { value: 'points', label: 'Points' },
  { value: 'words', label: 'Words' },
  { value: 'rarity', label: 'Rarity' },
];

export function RankingSelector({ value, onChange }: RankingSelectorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pillStyle, setPillStyle] = useState<{ left: number; width: number }>({ left: 0, width: 0 });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const index = OPTIONS.findIndex((o) => o.value === value);
    const buttons = container.querySelectorAll<HTMLButtonElement>('button');
    const btn = buttons[index];
    if (btn) {
      setPillStyle({ left: btn.offsetLeft, width: btn.offsetWidth });
    }
  }, [value]);

  return (
    <div>
    <div
      ref={containerRef}
      className="relative flex rounded-xl"
      style={{
        backgroundColor: 'var(--track)',
        padding: '4px',
      }}
    >
      {/* Sliding pill */}
      <div
        className="absolute rounded-lg"
        style={{
          top: '4px',
          bottom: '4px',
          left: `${pillStyle.left}px`,
          width: `${pillStyle.width}px`,
          backgroundColor: 'var(--card)',
          boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
          transition: 'left 0.3s cubic-bezier(0.4, 0, 0.2, 1), width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      />

      {OPTIONS.map((option) => {
        const isActive = value === option.value;
        return (
          <button
            key={option.value}
            onClick={() => onChange(option.value)}
            className="relative z-10 flex-1 border-none cursor-pointer rounded-lg bg-transparent"
            style={{
              padding: '6px 0',
              fontSize: '0.75rem',
              fontFamily: 'var(--font-label)',
              fontWeight: 'var(--font-label-weight)' as any,
              color: isActive ? 'var(--text)' : 'var(--text-muted)',
              transition: 'color 0.2s ease',
            }}
          >
            {option.label}
          </button>
        );
      })}
    </div>
    <div
      style={{
        overflow: 'hidden',
        maxHeight: value === 'rarity' ? '24px' : '0px',
        opacity: value === 'rarity' ? 1 : 0,
        transition: 'max-height 0.25s ease, opacity 0.2s ease',
      }}
    >
      <p
        className="text-center"
        style={{
          margin: '6px 0 0',
          fontSize: '0.6rem',
          fontFamily: 'var(--font-body)',
          fontWeight: 500,
          color: 'var(--text-muted)',
        }}
      >
        Words fewer players found score higher.
      </p>
    </div>
    </div>
  );
}
