import { useState } from 'react';
import {
  DailyNav,
  type DailyNavEntry,
  PlayerCard,
  type PlayerCardProps,
  RankingSelector,
  type RankingType,
  TopThree,
  type TopThreeEntry,
  Rankings,
  type RankingEntry,
  MyResultsCard,
} from './components';

interface LeaderboardPageProps {
  title: string;
  dailyEntries: DailyNavEntry[];
  selectedDate: string;
  onSelectDate: (date: string) => void;
  onPrev: () => void;
  onNext: () => void;
  hasNext: boolean;
  playerCard: PlayerCardProps;
  rankingType: RankingType;
  onRankingTypeChange: (type: RankingType) => void;
  topThree: TopThreeEntry[];
  rankings: RankingEntry[];
  onMyResults: () => void;
  onBack: () => void;
}

export function LeaderboardPage({
  title,
  dailyEntries,
  selectedDate,
  onSelectDate,
  onPrev,
  onNext,
  hasNext,
  playerCard,
  rankingType,
  onRankingTypeChange,
  topThree,
  rankings,
  onMyResults,
  onBack,
}: LeaderboardPageProps) {
  return (
    <div
      className="flex flex-col w-full"
      style={{
        maxWidth: '400px',
        margin: '0 auto',
        height: '100%',
        gap: '10px',
        fontFamily: 'var(--font-body)',
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

      {/* Daily navigation */}
      <DailyNav
        entries={dailyEntries}
        selectedDate={selectedDate}
        onSelectDate={onSelectDate}
        onPrev={onPrev}
        onNext={onNext}
        hasNext={hasNext}
      />

      {/* Player score card */}
      <PlayerCard {...playerCard} />

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
  );
}
