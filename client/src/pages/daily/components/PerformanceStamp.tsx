import type { StampTier } from "../types";

interface PerformanceStampProps {
  tier: StampTier;
  /** "md" (default) for the completed card, "sm" for inline use like the date picker */
  size?: "md" | "sm";
}

const TIER_CONFIG: Record<
  Exclude<StampTier, null>,
  { label: string; borderColor: string; textColor: string; bg: string }
> = {
  first: {
    label: "1ST",
    borderColor: "#c4a44a",
    textColor: "#a08a30",
    bg: "rgba(196, 164, 74, 0.40)",
  },
  second: {
    label: "2ND",
    borderColor: "#9a9a9a",
    textColor: "#7a7a7a",
    bg: "rgba(154, 154, 154, 0.40)",
  },
  third: {
    label: "3RD",
    borderColor: "#b87a4a",
    textColor: "#9a6a3a",
    bg: "rgba(184, 122, 74, 0.40)",
  },
  top30: {
    label: "TOP 30%",
    borderColor: "rgb(133, 183, 235)",
    textColor: "rgb(42, 125, 214)",
    bg: "rgba(24, 95, 165, 0.30)",
  },
};

const SIZE_CONFIG = {
  md: {
    gap: "gap-1.5",
    badgeHeight: "h-[22px]",
    badgePx: "px-2",
    badgeText: "text-[9px]",
    badgeBorder: 1.5,
    badgeRotate: "-rotate-[4deg]",
    checkSize: "w-[25px] h-[25px]",
    checkIcon: "w-3 h-3",
    checkStroke: 2,
  },
  sm: {
    gap: "gap-1.5",
    badgeHeight: "h-4",
    badgePx: "px-2",
    badgeText: "text-[8px]",
    badgeBorder: 1,
    badgeRotate: "",
    checkSize: "w-4 h-4",
    checkIcon: "w-2.5 h-2.5",
    checkStroke: 2.5,
  },
} as const;

export function PerformanceStamp({ tier, size = "md" }: PerformanceStampProps) {
  const tierConfig = tier ? TIER_CONFIG[tier] : null;
  const s = SIZE_CONFIG[size];

  return (
    <div className={`flex items-center ${s.gap}`}>
      {tierConfig && (
        <div
          className={`${s.badgeHeight} rounded-full ${s.badgePx} flex items-center ${s.badgeText} tracking-wide ${s.badgeRotate}`}
          style={{
            fontWeight: 600,
            fontFamily: "var(--font-sans)",
            border: `${s.badgeBorder}px solid ${tierConfig.borderColor}`,
            color: tierConfig.textColor,
            background: tierConfig.bg,
          }}
        >
          {tierConfig.label}
        </div>
      )}
      <div
        className={`${s.checkSize} rounded-full flex items-center justify-center bg-[#c5dac5]`}
      >
        <svg
          viewBox="0 0 16 16"
          fill="none"
          stroke="#3a6a3e"
          strokeWidth={s.checkStroke}
          strokeLinecap="round"
          strokeLinejoin="round"
          className={s.checkIcon}
        >
          <path d="M3.5 8.5l3 3 6-7" />
        </svg>
      </div>
    </div>
  );
}
