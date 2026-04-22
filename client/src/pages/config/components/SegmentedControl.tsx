import type { ReactNode } from "react";
import { usePillPosition } from "../hooks/usePillPosition";
import { useDisabledShake } from "../hooks/useDisabledShake";

export interface SegmentedOption<T extends string | number> {
  value: T;
  label: ReactNode;
  sub: string;
}

interface SegmentedControlProps<T extends string | number> {
  label: string;
  value: T;
  options: SegmentedOption<T>[];
  onChange: (value: T) => void;
  disabled?: boolean;
  /** Fine-tune primary-label size for this control (e.g. 1:00 sits tighter than a single digit). */
  labelSize?: "lg" | "md";
}

export function SegmentedControl<T extends string | number>({
  label,
  value,
  options,
  onChange,
  disabled,
  labelSize = "lg",
}: SegmentedControlProps<T>) {
  const selectedIndex = options.findIndex((o) => o.value === value);
  const { trackRef, pillLeft } = usePillPosition(selectedIndex, options.length);
  const { shakeKey, shakeStyle, triggerShake } = useDisabledShake();
  const primary = labelSize === "lg" ? "text-[1.15rem]" : "text-[1.1rem]";

  return (
    <div>
      <div
        className="text-caption uppercase tracking-[0.06em] text-[color:var(--ink-muted)] leading-none mb-2.5 font-[family-name:var(--font-structure)]"
        style={{ fontWeight: 700 }}
      >
        {label}
      </div>

      <div
        ref={trackRef}
        key={shakeKey}
        className="grid grid-cols-3 bg-[var(--surface-bg)] rounded-xl p-[3px] relative"
        style={shakeStyle}
      >
        <div
          className="seg-pill absolute top-[3px] h-[calc(100%-6px)] bg-[var(--surface-card)] rounded-[10px] pointer-events-none z-0 shadow-[var(--shadow-card)]"
          style={{
            width: `calc(33.333% - 2px)`,
            left: pillLeft,
          }}
        />

        {options.map((opt) => {
          const isSelected = opt.value === value;
          return (
            <button
              key={String(opt.value)}
              type="button"
              onClick={() => (disabled ? triggerShake() : onChange(opt.value))}
              className={[
                "seg-btn relative z-1 bg-transparent border-none rounded-[10px] flex flex-col items-center justify-center text-center select-none py-[0.55rem] px-[0.2rem] gap-[0.05rem] transition-colors duration-250 active:scale-[0.96] active:transition-transform active:duration-[60ms] font-[family-name:var(--font-structure)]",
                disabled ? "cursor-default" : "cursor-pointer",
                isSelected ? "text-[color:var(--ink)]" : "text-[color:var(--ink-soft)]",
                disabled && isSelected ? "opacity-70" : "",
                disabled && !isSelected ? "opacity-30" : "",
              ].join(" ")}
              style={{ WebkitTapHighlightColor: "transparent", fontWeight: 700 }}
            >
              <span className={`${primary} leading-[1.1] tabular-nums tracking-[-0.01em]`}>
                {opt.label}
              </span>
              <span
                className={[
                  "text-label-xs uppercase tracking-[0.04em] transition-colors duration-250",
                  isSelected ? "text-[color:var(--ink-muted)]" : "text-[color:var(--ink-soft)]",
                ].join(" ")}
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
