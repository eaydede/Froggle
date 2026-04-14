import type { DailyEntry } from "../types";
import { formatFullDate, formatShortDate } from "../utils";
import { PerformanceStamp } from "./PerformanceStamp";

interface DateSelectorProps {
  entries: DailyEntry[];
  currentIndex: number;
  isOpen: boolean;
  onToggle: () => void;
  onSelect: (index: number) => void;
}

export function DateSelector({
  entries,
  currentIndex,
  isOpen,
  onToggle,
  onSelect,
}: DateSelectorProps) {
  const currentEntry = entries[currentIndex];
  const isToday = currentIndex === entries.length - 1;

  return (
    <>
      {/* Date trigger */}
      <div className="flex items-center justify-center px-[18px] mb-2.5 relative">
        <button
          type="button"
          className="text-[15px] cursor-pointer flex items-center gap-1.5 bg-transparent border-none outline-none p-0"
          style={{
            color: "var(--text)",
            fontFamily: "var(--font-sans)",
            fontWeight: 600,
          }}
          onClick={onToggle}
        >
          <span>{formatFullDate(currentEntry.date)}</span>
          {isToday && <TodayBadge />}
          <svg
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            className={`w-3 h-3 transition-transform duration-200 ${
              isOpen ? "rotate-180" : ""
            }`}
          >
            <path d="M4 6l4 4 4-4" />
          </svg>
        </button>
      </div>

      {/* Dropdown picker */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-[80px] z-11 flex justify-center px-[18px] mt-[36px]">
          <div
            className="rounded-xl flex flex-col w-full min-w-[360px] p-2"
            style={{
              background: "var(--card)",
              border: "0.5px solid var(--dot)",
            }}
          >
            {[...entries].reverse().map((_entry, reversedIdx) => {
              const realIdx = entries.length - 1 - reversedIdx;
              const entry = entries[realIdx];
              const isActive = realIdx === currentIndex;
              const entryIsToday = realIdx === entries.length - 1;

              return (
                <div key={entry.puzzleNumber}>
                  <button
                    type="button"
                    className="flex items-center justify-between w-full px-2 py-2.5 cursor-pointer bg-transparent border-none outline-none text-left rounded-lg"
                    style={{
                      background: isActive ? "var(--track)" : "transparent",
                    }}
                    onClick={() => onSelect(realIdx)}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="text-[15px]"
                        style={{
                          color: "var(--text)",
                          fontFamily: "var(--font-sans)",
                          fontWeight: 600,
                        }}
                      >
                        {formatShortDate(entry.date)}
                      </span>
                      <span
                        className="text-[13px]"
                        style={{
                          color: "var(--text-muted)",
                          fontFamily: "var(--font-sans)",
                        }}
                      >
                        #{entry.puzzleNumber}
                      </span>
                      {entryIsToday && <TodayBadge />}
                    </div>

                    <div className="flex items-center gap-2">
                      <PickerEntryStatus entry={entry} />
                    </div>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}

/** "Today" pill badge used in the date trigger and picker rows */
function TodayBadge() {
  return (
    <span
      className="text-[11px] px-2 py-0.5 rounded-md"
      style={{
        color: "var(--accent)",
        background: "color-mix(in srgb, var(--accent) 12%, var(--page-bg) 88%)",
        border: "1px solid color-mix(in srgb, var(--accent) 25%, transparent 75%)",
        fontFamily: "var(--font-sans)",
        fontWeight: 600,
      }}
    >
      Today
    </span>
  );
}

/** Right side of each picker row — score + badges or missed/not played label */
function PickerEntryStatus({ entry }: { entry: DailyEntry }) {
  if (entry.state === "completed") {
    return (
      <>
        <span
          className="text-sm"
          style={{
            color: "var(--text)",
            fontFamily: "var(--font-sans)",
            fontWeight: 600,
          }}
        >
          {entry.points} pts
        </span>
        <PerformanceStamp tier={entry.stampTier} size="sm" />
      </>
    );
  }

  return (
    <span
      className="text-[13px] italic"
      style={{
        color: "var(--text-muted)",
        fontFamily: "var(--font-sans)",
      }}
    >
      {entry.state === "unplayed" ? "Not played" : "Missed"}
    </span>
  );
}
