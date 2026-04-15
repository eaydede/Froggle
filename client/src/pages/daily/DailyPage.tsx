import { useState, useCallback } from "react";
import type { DailyEntry, DailyStats } from "./types";
import { BlurOverlay } from "./components/BlurOverlay";
import { DateSelector } from "./components/DateSelector";
import { CardCarousel } from "./components/CardCarousel";
import { StreakCard } from "./components/StreakCard";
import { StatsCard } from "./components/StatsCard";

export interface DailyPageProps {
  entries: DailyEntry[];
  stats: DailyStats;
  currentIndex: number;
  nextPuzzleCountdown: string;
  onChangeIndex: (index: number) => void;
  onStartPuzzle: () => void;
  onViewResults: (puzzleNumber: number) => void;
  onViewLeaderboard: (puzzleNumber: number) => void;
  getShareText: (puzzleNumber: number) => Promise<string>;
  onBack: () => void;
}

export function DailyPage({
  entries,
  stats,
  currentIndex,
  nextPuzzleCountdown,
  onChangeIndex,
  onStartPuzzle,
  onViewResults,
  onViewLeaderboard,
  getShareText,
  onBack,
}: DailyPageProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [defExpanded, setDefExpanded] = useState(false);

  const currentEntry = entries[currentIndex];
  const showOverlay = pickerOpen || defExpanded;

  function handleOverlayClick() {
    if (pickerOpen) setPickerOpen(false);
    if (defExpanded) setDefExpanded(false);
  }

  function handlePickerToggle() {
    if (defExpanded) setDefExpanded(false);
    setPickerOpen((prev) => !prev);
  }

  function handlePickerSelect(index: number) {
    onChangeIndex(index);
    setPickerOpen(false);
  }

  function handleIndexChange(index: number) {
    setDefExpanded(false);
    setPickerOpen(false);
    onChangeIndex(index);
  }

  const handleDefinitionExpand = useCallback((expanded: boolean) => {
    setDefExpanded(expanded);
  }, []);

  if (!currentEntry) return null;

  return (
    <div
      // className="relative rounded-2xl pt-5.5 pb-4 overflow-hidden min-h-[580px]"
      style={{ background: "var(--page-bg)" }}
    >
      <BlurOverlay visible={showOverlay} onClick={handleOverlayClick} />

      {/* Header */}
      <div className="text-center mb-4.5 relative">
        <button
          type="button"
          className="absolute top-1/2 -translate-y-1/2 text-lg cursor-pointer leading-none flex bg-transparent border-none"
          style={{ color: "var(--text-muted)" }}
          onClick={onBack}
        >
          &#8249;
        </button>
        <h2
          className="text-[22px]"
          style={{
            color: "var(--text)",
            fontFamily: "var(--font-heading)",
            fontWeight: "var(--font-heading-weight)",
          }}
        >
          Daily #{currentEntry.puzzleNumber}
        </h2>
      </div>

      {/* Date selector + picker dropdown */}
      <DateSelector
        entries={entries}
        currentIndex={currentIndex}
        isOpen={pickerOpen}
        onToggle={handlePickerToggle}
        onSelect={handlePickerSelect}
      />

      {/* Card carousel */}
      <CardCarousel
        entries={entries}
        currentIndex={currentIndex}
        defExpanded={defExpanded}
        onChangeIndex={handleIndexChange}
        onStartPuzzle={onStartPuzzle}
        onViewResults={onViewResults}
        onViewLeaderboard={onViewLeaderboard}
        getShareText={getShareText}
        onDefinitionExpand={handleDefinitionExpand}
        disabled={pickerOpen}
      />

      {/* Divider */}
      <div
        className="mt-3 mb-3"
        style={{ borderTop: "0.5px solid var(--dot)" }}
      />

      {/* Streak */}
      <StreakCard stats={stats} />

      {/* 7 day average */}
      <StatsCard stats={stats} />

      {/* Footer */}
      <div
        className="text-center text-[11px] mt-2.5"
        style={{
          color: "var(--text-muted)",
          fontFamily: "var(--font-sans)",
        }}
      >
        Next puzzle in {nextPuzzleCountdown}
      </div>
    </div>
  );
}