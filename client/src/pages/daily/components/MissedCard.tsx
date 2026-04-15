interface MissedCardProps {
  puzzleNumber: number;
  playersCount: number;
}

export function MissedCard({ puzzleNumber, playersCount }: MissedCardProps) {
  return (
    <div
      className="rounded-[14px] flex-1 flex flex-col items-center justify-center px-4 py-6"
      style={{
        background: "color-mix(in srgb, var(--page-bg) 90%, var(--text) 5%)",
        border: "1px dashed var(--dot)",
        fontFamily: "var(--font-sans)"
      }}
    >
      <div
        className="text-xs mb-2"
        style={{
          color: "var(--text-muted)",
          fontFamily: "var(--font-sans)",
          fontWeight: 600,
        }}
      >
        #{puzzleNumber}
      </div>
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center mx-auto mb-2"
        style={{ background: "var(--dot)" }}
      >
        <svg
          viewBox="0 0 16 16"
          fill="none"
          stroke="var(--text-muted)"
          strokeWidth="1.5"
          strokeLinecap="round"
          className="w-4 h-4"
        >
          <path d="M4 4l8 8m0-8l-8 8" />
        </svg>
      </div>
      <div
        className="text-sm mb-0.5"
        style={{ color: "var(--text-mid)" }}
      >
        You didn&apos;t play this one
      </div>
      <div
        className="text-xs"
        style={{ color: "var(--text-muted)" }}
      >
        {playersCount} played
      </div>
    </div>
  );
}