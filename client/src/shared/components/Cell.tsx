import type { HTMLAttributes } from 'react';

export type CellState = 'default' | 'selected' | 'valid' | 'invalid' | 'duplicate';
export type CellSize = 'sm' | 'md' | 'lg' | 'responsive';
export type CellMode = 'light' | 'dark';
export type CellVariant = 'simple' | 'dice';

interface CellProps extends HTMLAttributes<HTMLDivElement> {
  letter: string;
  state?: CellState;
  size?: CellSize;
  mode?: CellMode;
  variant?: CellVariant;
  styleOverride?: React.CSSProperties;
}

const SIZE_MAP: Record<string, string> = {
  sm: '40px',
  md: '56px',
  lg: '72px',
};

const FONT_SIZE_MAP: Record<string, string> = {
  sm: '16px',
  md: '22px',
  lg: '28px',
};

// --- Simple variant ---

const SIMPLE_LIGHT: Record<CellState, React.CSSProperties> = {
  default: {
    backgroundColor: 'var(--cell-bg)',
    color: 'var(--cell-text)',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)',
  },
  selected: {
    backgroundColor: 'var(--color-selected)',
    color: 'white',
    boxShadow: 'inset 3px 3px 6px rgba(0,0,0,0.15), inset -3px -3px 6px rgba(255,255,255,0.1)',
    transform: 'scale(1.02)',
  },
  valid: {
    backgroundColor: 'var(--color-valid)',
    color: 'white',
    transform: 'scale(1.05)',
  },
  invalid: {
    backgroundColor: 'var(--color-invalid)',
    color: 'white',
    transform: 'scale(1.05)',
  },
  duplicate: {
    backgroundColor: 'var(--color-duplicate)',
    color: 'white',
    transform: 'scale(1.05)',
  },
};

const SIMPLE_DARK: Record<CellState, React.CSSProperties> = {
  default: {
    backgroundColor: 'var(--cell-bg)',
    color: 'var(--cell-text)',
    boxShadow: '0 2px 8px rgba(0,0,0,0.20), 0 1px 2px rgba(0,0,0,0.10)',
  },
  selected: {
    backgroundColor: 'var(--color-selected)',
    color: 'white',
    boxShadow: 'inset 3px 3px 6px rgba(0,0,0,0.3), inset -3px -3px 6px rgba(255,255,255,0.05)',
    transform: 'scale(1.02)',
  },
  valid: {
    backgroundColor: 'var(--color-valid)',
    color: 'white',
    transform: 'scale(1.05)',
  },
  invalid: {
    backgroundColor: 'var(--color-invalid)',
    color: 'white',
    transform: 'scale(1.05)',
  },
  duplicate: {
    backgroundColor: 'var(--color-duplicate)',
    color: 'white',
    transform: 'scale(1.05)',
  },
};

// --- Dice variant ---

const DICE_LIGHT: Record<CellState, React.CSSProperties> = {
  default: {
    backgroundColor: 'var(--cell-bg)',
    color: 'var(--cell-text)',
    boxShadow: '0 3px 0 0 var(--cell-edge), 0 4px 0 0 var(--cell-edge-deep), 0 6px 10px rgba(0,0,0,0.15)',
  },
  selected: {
    backgroundColor: 'var(--color-selected)',
    color: 'white',
    boxShadow: '0 1px 0 0 hsl(207, 45%, 44%), 0 2px 4px rgba(0,0,0,0.12)',
    transform: 'scale(0.96) translateY(2px)',
  },
  valid: {
    backgroundColor: 'var(--color-valid)',
    color: 'white',
    boxShadow: '0 3px 0 0 hsl(122, 29%, 44%), 0 4px 0 0 hsl(122, 29%, 38%), 0 6px 10px rgba(0,0,0,0.18)',
    transform: 'scale(1.05)',
  },
  invalid: {
    backgroundColor: 'var(--color-invalid)',
    color: 'white',
    boxShadow: '0 3px 0 0 hsl(4, 55%, 50%), 0 4px 0 0 hsl(4, 50%, 44%), 0 6px 10px rgba(0,0,0,0.18)',
    transform: 'scale(1.05)',
  },
  duplicate: {
    backgroundColor: 'var(--color-duplicate)',
    color: 'white',
    boxShadow: '0 3px 0 0 hsl(45, 55%, 47%), 0 4px 0 0 hsl(45, 50%, 41%), 0 6px 10px rgba(0,0,0,0.18)',
    transform: 'scale(1.05)',
  },
};

const DICE_DARK: Record<CellState, React.CSSProperties> = {
  default: {
    backgroundColor: 'var(--cell-bg)',
    color: 'var(--cell-text)',
    boxShadow: '0 3px 0 0 var(--cell-edge), 0 4px 0 0 var(--cell-edge-deep), 0 6px 10px rgba(0,0,0,0.30)',
  },
  selected: {
    backgroundColor: 'var(--color-selected)',
    color: 'white',
    boxShadow: '0 1px 0 0 hsl(207, 45%, 36%), 0 2px 4px rgba(0,0,0,0.20)',
    transform: 'scale(0.96) translateY(2px)',
  },
  valid: {
    backgroundColor: 'var(--color-valid)',
    color: 'white',
    boxShadow: '0 3px 0 0 hsl(122, 29%, 38%), 0 4px 0 0 hsl(122, 29%, 32%), 0 6px 10px rgba(0,0,0,0.35)',
    transform: 'scale(1.05)',
  },
  invalid: {
    backgroundColor: 'var(--color-invalid)',
    color: 'white',
    boxShadow: '0 3px 0 0 hsl(4, 50%, 42%), 0 4px 0 0 hsl(4, 45%, 36%), 0 6px 10px rgba(0,0,0,0.35)',
    transform: 'scale(1.05)',
  },
  duplicate: {
    backgroundColor: 'var(--color-duplicate)',
    color: 'white',
    boxShadow: '0 3px 0 0 hsl(45, 50%, 40%), 0 4px 0 0 hsl(45, 45%, 34%), 0 6px 10px rgba(0,0,0,0.35)',
    transform: 'scale(1.05)',
  },
};

const STYLE_MAP = {
  'simple-light': SIMPLE_LIGHT,
  'simple-dark': SIMPLE_DARK,
  'dice-light': DICE_LIGHT,
  'dice-dark': DICE_DARK,
};

export function getCellStateStyle(state: CellState, variant: CellVariant = 'simple', mode: CellMode = 'light'): React.CSSProperties {
  return STYLE_MAP[`${variant}-${mode}`][state];
}

export function Cell({
  letter, state = 'default', size = 'md', mode = 'light', variant = 'simple',
  styleOverride, className = '', ...props
}: CellProps) {
  const isResponsive = size === 'responsive';
  const dimension = isResponsive ? undefined : SIZE_MAP[size];
  const fontSize = isResponsive
    ? `calc(50cqi / var(--board-size, 4))`
    : FONT_SIZE_MAP[size];

  const stateStyle = STYLE_MAP[`${variant}-${mode}`][state];

  return (
    <div
      className={`flex items-center justify-center select-none transition-all duration-[50ms] ${isResponsive ? 'flex-1' : ''} ${className}`}
      style={{
        width: dimension,
        height: dimension,
        borderRadius: '12px',
        fontFamily: 'var(--font-cell)',
        fontWeight: 'var(--font-cell-weight)' as any,
        fontSize,
        ...stateStyle,
        ...styleOverride,
      }}
      {...props}
    >
      {letter}
    </div>
  );
}
