import type { DailyEntry } from "../types";
import { formatConfig } from "../utils";
import { PerformanceStamp } from "./PerformanceStamp";
import { DefinitionArea } from "./DefinitionArea";

interface CompletedCardProps {
  entry: DailyEntry;
  expanded: boolean;
  onExpandChange: (expanded: boolean) => void;
}

/** Fixed parchment color used for the card background and fade gradient */
const CARD_BG = "#e6e0d2";
const CARD_BORDER = "#d4cec0";
const CARD_TEXT = "#2c2820";
const CARD_TEXT_MUTED = "#8a8378";
const TEAR_COLOR = "#cdc5b4";

export function CompletedCard({
  entry,
  expanded,
  onExpandChange,
}: CompletedCardProps) {
  const { boardLabel, timerLabel, lettersLabel } = formatConfig(entry.config);

  return (
    <div
      className="rounded-[14px] flex-1 flex flex-col"
      style={{
        background: CARD_BG,
        border: `0.5px solid ${CARD_BORDER}`,
      }}
    >
      {/* Header: puzzle number, player count, stamps */}
      <div className="px-4 pt-3.5 pb-2.5 min-h-[165px]">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2" style={{fontFamily:"var(--font-sans)"}}>
            <span
              className="text-xs"
              style={{
                color: CARD_TEXT_MUTED,
                fontWeight: 600,
              }}
            >
              #{entry.puzzleNumber}
            </span>
            <span
              className="text-[10px] flex items-center gap-[3px]"
              style={{ color: CARD_TEXT_MUTED }}
            >
              <svg
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                className="w-2.5 h-2.5"
              >
                <circle cx="8" cy="5" r="3" />
                <path d="M2 14c0-3 2.5-5 6-5s6 2 6 5" />
              </svg>
              {entry.playersCount}
            </span>
          </div>
          <PerformanceStamp tier={entry.stampTier} />
        </div>

        {/* Word showcase */}
        <div
          className="text-[11px] mb-1.5"
          style={{
            color: CARD_TEXT_MUTED,
            fontFamily: "var(--font-sans)",
          }}
        >
          Longest word
        </div>
        <div
          className="text-[26px] mb-1"
          style={{
            color: CARD_TEXT,
            fontFamily: "var(--font-heading)",
            fontWeight: 700,
          }}
        >
          {entry.longestWord}
        </div>

        {/* Expandable definition */}
        <DefinitionArea
          word={entry.longestWord ?? ""}
          definition={entry.longestWordDefinition ?? ""}
          expanded={expanded}
          onExpandChange={onExpandChange}
          color={CARD_TEXT_MUTED}
        />
      </div>

      {/* Tear line */}
      <div
        className="mx-3.5"
        style={{ borderTop: `2px dashed ${TEAR_COLOR}` }}
      />

      {/* Stats row */}
      <div
        className="flex justify-around py-3 px-4 text-center"
        style={{
            color: CARD_TEXT,
            fontFamily: "var(--font-sans)",
            fontWeight: 600,
        }}>
        <div className="flex-1">
          <div
            className="text-xl"
            style={{
              fontWeight: 600,
            }}
          >
            {entry.points}
          </div>
          <div
            className="text-[10px] mt-0.5"
            style={{ color: CARD_TEXT_MUTED, fontWeight: 400 }}
          >
            points
          </div>
        </div>
        <div className="flex-1">
          <div
            className="text-xl"
            style={{
              fontWeight: 600,
            }}
          >
            {entry.wordsFound}
          </div>
          <div
            className="text-[10px] mt-0.5"
            style={{ color: CARD_TEXT_MUTED, fontWeight: 400 }}
          >
            words found
          </div>
        </div>
      </div>

      {/* Config footer */}
      <div
        className="px-4 py-2 text-[11px] mt-auto flex items-center justify-center gap-[3px]"
        style={{
          borderTop: `0.5px solid ${CARD_BORDER}`,
          color: CARD_TEXT_MUTED,
          fontFamily: "var(--font-sans)",
        }}
      >
        <span>{boardLabel}</span>
        <span>&middot;</span>
        <span>{timerLabel}</span>
        <span>&middot;</span>
        <span>{lettersLabel}</span>
      </div>
    </div>
  );
}