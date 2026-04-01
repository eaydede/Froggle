import { usePillPosition } from "../use-pill-position";
import type { TimerOption } from "../types";

const OPTIONS: { value: TimerOption; label: string; sub: string }[] = [
  { value: 60, label: "1:00", sub: "Sprint" },
  { value: 120, label: "2:00", sub: "Standard" },
  { value: -1, label: "∞", sub: "Zen Mode" },
];

interface TimerConfigProps {
  value: TimerOption;
  onChange: (timer: TimerOption) => void;
}

export function TimerConfig({ value, onChange }: TimerConfigProps) {
  const selectedIndex = OPTIONS.findIndex((o) => o.value === value);
  const { trackRef, pillLeft } = usePillPosition(selectedIndex, OPTIONS.length);

  return (
    <div className="flex items-center gap-3">
      <div
        className="text-[0.68rem] text-[var(--label-color)] uppercase tracking-[0.06em] shrink-0 w-[4.5rem]"
        style={{ fontFamily: 'var(--font-label)', fontWeight: 'var(--font-label-weight)' as any }}
      >
        Timer
      </div>
      <div
        ref={trackRef}
        className="flex-1 grid grid-cols-3 bg-[var(--track)] rounded-xl p-[3px] relative"
      >
        <div
          className="seg-pill absolute top-[3px] h-[calc(100%-6px)] bg-[var(--card)] rounded-[10px] pointer-events-none z-0"
          style={{
            width: `calc(33.333% - 2px)`,
            left: pillLeft,
            boxShadow:
              "0 1px 3px rgba(0,0,0,0.08), 0 1px 1px rgba(0,0,0,0.04)",
          }}
        />

        {OPTIONS.map((opt) => {
          const isSelected = opt.value === value;
          return (
            <button
              key={String(opt.value)}
              type="button"
              onClick={() => onChange(opt.value)}
              className={`
                seg-btn relative z-1 bg-transparent border-none rounded-[10px]
                cursor-pointer flex flex-col items-center justify-center text-center
                select-none
                py-[0.6rem] px-[0.2rem] gap-[0.04rem]
                transition-colors duration-250
                ${isSelected ? "text-[var(--text)]" : "text-[var(--text-muted)]"}
              `}
              style={{ WebkitTapHighlightColor: "transparent", fontFamily: 'var(--font-option)', fontWeight: 'var(--font-option-weight)' as any }}
            >
              <span className="text-[1.15rem] leading-[1.1]">
                {opt.label}
              </span>
              <span
                className={`
                  text-[0.52rem] transition-colors duration-250
                  ${isSelected ? "text-[var(--accent)]" : "text-[var(--text-muted)]"}
                `}
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
