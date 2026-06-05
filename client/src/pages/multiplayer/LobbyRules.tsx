import type { GameConfig } from 'models';

interface LobbyRulesProps {
  config: GameConfig;
  disabled: boolean;
  onChange: (patch: Partial<GameConfig>) => void;
}

interface SegOption {
  value: number;
  label: string;
  sub: string;
}

const BOARD_OPTIONS: SegOption[] = [
  { value: 4, label: '4×4', sub: 'Classic' },
  { value: 5, label: '5×5', sub: 'Big' },
  { value: 6, label: '6×6', sub: 'Mega' },
];

// No Zen/∞ option here: a multiplayer round needs a finite timer to act as
// the backstop that ends the board if players drop. The solo free-play flow
// still offers Zen.
const TIMER_OPTIONS: SegOption[] = [
  { value: 60, label: '1:00', sub: 'Sprint' },
  { value: 120, label: '2:00', sub: 'Standard' },
  { value: 180, label: '3:00', sub: 'Chill' },
];

const MIN_OPTIONS: SegOption[] = [
  { value: 3, label: '3', sub: 'Easy' },
  { value: 4, label: '4', sub: 'Normal' },
  { value: 5, label: '5', sub: 'Hard' },
];

// "The Rules" card from the mock — board / timer / min-letters as three
// segmented controls. Built fresh (rather than reusing the shared
// SegmentedControl) so the selected pill can take the bright ink fill
// the mock specifies without restyling the control used on the daily and
// shared-board pages. Host drives it; everyone else sees it read-only.
export function LobbyRules({ config, disabled, onChange }: LobbyRulesProps) {
  return (
    <div className="lobby-card px-4 pt-3 pb-3.5 flex flex-col gap-2.5">
      <span
        className="text-caption uppercase tracking-[0.14em] text-[color:var(--ink)] font-[family-name:var(--font-structure)]"
        style={{ fontWeight: 700 }}
      >
        The Rules
      </span>

      <SegRow
        label="Board"
        options={BOARD_OPTIONS}
        value={config.boardSize}
        disabled={disabled}
        onChange={(v) => onChange({ boardSize: v })}
      />
      <SegRow
        label="Timer"
        options={TIMER_OPTIONS}
        value={config.durationSeconds}
        disabled={disabled}
        onChange={(v) => onChange({ durationSeconds: v })}
      />
      <SegRow
        label="Min. Letters"
        options={MIN_OPTIONS}
        value={config.minWordLength}
        disabled={disabled}
        onChange={(v) => onChange({ minWordLength: v })}
      />
    </div>
  );
}

interface SegRowProps {
  label: string;
  options: SegOption[];
  value: number;
  disabled: boolean;
  onChange: (value: number) => void;
}

function SegRow({ label, options, value, disabled, onChange }: SegRowProps) {
  const selectedIndex = Math.max(0, options.findIndex((o) => o.value === value));
  const count = options.length;

  return (
    <div>
      <div
        className="text-label-xs uppercase tracking-[0.14em] text-[color:var(--ink-soft)] mb-1.5 font-[family-name:var(--font-structure)]"
        style={{ fontWeight: 700 }}
      >
        {label}
      </div>
      <div
        className="relative grid rounded-xl p-[3px]"
        style={{
          gridTemplateColumns: `repeat(${count}, minmax(0, 1fr))`,
          background: 'var(--surface-bg)',
          border: '1px solid var(--ink-border-subtle)',
        }}
      >
        {/* Sliding pill */}
        <div
          className="absolute top-[3px] bottom-[3px] rounded-[9px] z-0 transition-[left] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]"
          style={{
            width: `calc(${100 / count}% - 2px)`,
            left: `calc(${(selectedIndex / count) * 100}% + 1px)`,
            background: 'var(--ink)',
            boxShadow: 'var(--shadow-toggle)',
          }}
        />
        {options.map((opt) => {
          const isSelected = opt.value === value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => !disabled && onChange(opt.value)}
              disabled={disabled}
              className="relative z-[1] bg-transparent border-0 flex flex-col items-center justify-center rounded-[9px] py-[0.34rem] px-1 font-[family-name:var(--font-structure)] transition-colors duration-200 active:scale-[0.96]"
              style={{
                color: isSelected ? 'var(--ink-inverse)' : 'var(--ink-muted)',
                opacity: disabled && !isSelected ? 0.4 : 1,
                cursor: disabled ? 'default' : 'pointer',
                WebkitTapHighlightColor: 'transparent',
                fontWeight: 700,
              }}
            >
              <span className="text-[13px] leading-[1.1] tabular-nums">{opt.label}</span>
              <span
                className="text-[8px] uppercase tracking-[0.06em] mt-0.5"
                style={{ fontWeight: 600 }}
              >
                {opt.sub}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
