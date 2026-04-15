import { useState } from 'react';
import {
  RankingSelector,
  type RankingType,
  TopThree,
  type TopThreeEntry,
  Rankings,
  type RankingEntry,
  MyResultsCard,
} from './components';
import { DateSelector, BlurOverlay } from '../daily/components';
import type { DailyEntry } from '../daily/types';

interface LeaderboardPageProps {
  title: string;
  entries: DailyEntry[];
  currentIndex: number;
  onChangeIndex: (index: number) => void;
  rankingType: RankingType;
  onRankingTypeChange: (type: RankingType) => void;
  topThree: TopThreeEntry[];
  rankings: RankingEntry[];
  onMyResults: () => void;
  onBack: () => void;
}

export function LeaderboardPage({
  title,
  entries,
  currentIndex,
  onChangeIndex,
  rankingType,
  onRankingTypeChange,
  topThree,
  rankings,
  onMyResults,
  onBack,
}: LeaderboardPageProps) {
  const [pickerOpen, setPickerOpen] = useState(false);

  function handlePickerSelect(index: number) {
    onChangeIndex(index);
    setPickerOpen(false);
  }
  return (
    <div
      className="relative flex-1 flex flex-col"
      style={{
        fontFamily: 'var(--font-body)',
      }}
    >
      <BlurOverlay visible={pickerOpen} onClick={() => setPickerOpen(false)} />

      <div
        className="flex flex-col w-full"
        style={{
          margin: '0 auto',
          height: '100%',
          gap: '10px',
        }}
      >

      {/* Header */}
      <div className="flex items-center justify-center relative">
        <button
          type="button"
          className="absolute left-[18px] top-1/2 -translate-y-1/2 text-lg cursor-pointer leading-none flex bg-transparent border-none"
          style={{ color: "var(--text-muted)" }}
          onClick={onBack}
        >
          &#8249;
        </button>
        <h1
          className="m-0"
          style={{
            fontSize: '1.35rem',
            fontFamily: 'var(--font-heading)',
            fontWeight: 'var(--font-heading-weight)' as any,
            color: 'var(--text)',
            letterSpacing: '-0.025em',
          }}
        >
          {title}
        </h1>
      </div>

      {/* Date selector (matches the daily page) */}
      {entries.length > 0 && (
        <DateSelector
          entries={entries}
          currentIndex={currentIndex}
          isOpen={pickerOpen}
          onToggle={() => setPickerOpen((v) => !v)}
          onSelect={handlePickerSelect}
        />
      )}

      {/* Ranking type selector */}
      <RankingSelector value={rankingType} onChange={onRankingTypeChange} />

      {/* Top 3 */}
      <TopThree entries={topThree} />

      {/* Rankings list — fills remaining space */}
      <div className="flex-1" style={{ minHeight: 0 }}>
        <Rankings entries={rankings} />
      </div>

      {/* My results button */}
      <MyResultsCard onClick={onMyResults} />
      </div>
    </div>
  );
}
