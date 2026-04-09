import { useState } from 'react';
import { DailyNav, type DailyNavEntry } from './components/DailyNav';
import { PlayerCard, type PlayerCardProps } from './components/PlayerCard';
import { RankingSelector, type RankingType } from './components/RankingSelector';
import { TopThree, type TopThreeEntry } from './components/TopThree';
import { Rankings, type RankingEntry } from './components/Rankings';
import { MyResultsCard } from './components/MyResultsCard';

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
          onClick={onBack}
          className="absolute left-0 border-none bg-transparent cursor-pointer flex items-center justify-center"
          style={{
            fontSize: '1.25rem',
            color: 'var(--text)',
            padding: '4px',
          }}
        >
          ←
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
