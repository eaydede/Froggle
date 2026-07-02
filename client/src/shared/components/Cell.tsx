import type { HTMLAttributes, ReactNode } from 'react';

export type CellState = 'default' | 'selected' | 'valid' | 'invalid' | 'duplicate';
export type CellSize = 'xxs' | 'xs' | 'sm' | 'md' | 'lg' | 'responsive';
export type CellMode = 'light' | 'dark';
export type CellVariant = 'simple' | 'dice';
export type CellAccent = 'hot' | null;

interface CellProps extends HTMLAttributes<HTMLDivElement> {
  letter: string;
  state?: CellState;
  size?: CellSize;
  mode?: CellMode;
  variant?: CellVariant;
  styleOverride?: React.CSSProperties;
  /** Adornment rendered in the bottom-right corner. Used by the gauntlet
   *  rare-letters round to show per-letter point values, Scrabble-style. */
  badge?: ReactNode;
  /** Visual emphasis on the cell itself. 'hot' draws an accent ring
   *  (used to flag the hot letter during a gauntlet hot-letter round). */
  accent?: CellAccent;
  /** Full-cell adornment layered over the tile — used by the On Thin Ice
   *  experimental mode to draw the frost + cracks (and the hollow broken
   *  state) of a breakable tile. Clipped to the cell's rounded corners and
   *  non-interactive so it never intercepts the drag path. */
  overlay?: ReactNode;
}

const SIZE_MAP: Record<string, string> = {
  xxs: '12px',
  xs: '24px',
  sm: '40px',
  md: '56px',
  lg: '72px',
};

const FONT_SIZE_MAP: Record<string, string> = {
  xxs: '8px',
  xs: '12px',
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
  styleOverride, className = '', badge, accent = null, overlay, ...props
}: CellProps) {
  const isResponsive = size === 'responsive';
  const dimension = isResponsive ? undefined : SIZE_MAP[size];
  const fontSize = isResponsive
    ? `calc(50cqi / var(--board-size, 4))`
    : FONT_SIZE_MAP[size];

  const stateStyle = STYLE_MAP[`${variant}-${mode}`][state];

  // Hot-letter accent applies only when the cell isn't already mid-feedback,
  // so the in-progress selection color stays the dominant signal. Recolors
  // the cell background and (for the dice variant) the edge stack so the
  // hot cells read as clearly different from the default beige without
  // borrowing any of the four feedback hues (blue / green / red / yellow).
  const accentStyle: React.CSSProperties =
    accent === 'hot' && state === 'default'
      ? variant === 'dice'
        ? {
            backgroundColor: 'var(--hot-letter-bg)',
            color: 'var(--hot-letter-fg)',
            boxShadow:
              '0 3px 0 0 var(--hot-letter-edge), 0 4px 0 0 var(--hot-letter-edge-deep), 0 6px 10px var(--hot-letter-glow)',
          }
        : {
            backgroundColor: 'var(--hot-letter-bg)',
            color: 'var(--hot-letter-fg)',
            boxShadow: '0 2px 8px var(--hot-letter-glow), 0 1px 2px rgba(0,0,0,0.04)',
          }
      : {};

  return (
    <div
      className={`relative flex items-center justify-center select-none transition-all duration-[50ms] ${isResponsive ? 'flex-1' : ''} ${className}`}
      style={{
        width: dimension,
        height: dimension,
        borderRadius: '12px',
        fontFamily: 'var(--font-cell)',
        fontWeight: 'var(--font-cell-weight)' as any,
        fontSize,
        ...stateStyle,
        ...accentStyle,
        ...styleOverride,
      }}
      {...props}
    >
      {letter}
      {overlay !== undefined && overlay !== null && (
        // Not clipped — overlays are expected to shape themselves (e.g. via
        // border-radius) so their box-shadows can escape the cell for outer
        // glow effects like the Golden Ticket wildcard tile.
        <span
          className="absolute inset-0 pointer-events-none"
          style={{ borderRadius: '12px' }}
        >
          {overlay}
        </span>
      )}
      {badge !== undefined && badge !== null && (
        <span
          className="absolute bottom-[6%] right-[8%] leading-none tabular-nums pointer-events-none"
          style={{
            fontSize: isResponsive
              ? `calc(18cqi / var(--board-size, 4))`
              : `calc(${fontSize} * 0.36)`,
            opacity: 0.6,
            fontWeight: 700,
          }}
        >
          {badge}
        </span>
      )}
    </div>
  );
}
