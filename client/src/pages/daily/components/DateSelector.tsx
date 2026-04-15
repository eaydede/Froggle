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

  // z-20 on the wrapper puts the trigger (and dropdown) above BlurOverlay
  // (z-10), so the current date stays legible while the rest of the page
  // blurs behind the dropdown.
  return (
    // pb-2.5 (instead of mb-2.5 on the trigger) so the wrapper's content box
    // includes the breathing room — which means `top-full` on the dropdown
    // lands 10px below the trigger text on any host layout.
    <div className="relative z-20 pb-2.5">
      {/* Date trigger */}
      <div className="flex items-center justify-center px-[18px] min-h-[20px]">
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

      {/* Dropdown picker — positioned just below the trigger in any layout. */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full flex justify-center px-[18px]">
          <div
            className="rounded-xl flex flex-col w-full p-2 overflow-y-auto"
            style={{
              background: "var(--card)",
              border: "0.5px solid var(--dot)",
              maxHeight: "60vh",
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
                    className="flex items-center justify-between w-full px-2 py-2.5 cursor-pointer bg-transparent border-none outline-none text-left rounded-lg min-h-[40px]"
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
    </div>
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
