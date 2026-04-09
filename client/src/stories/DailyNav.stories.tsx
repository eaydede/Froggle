import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { DailyNav, type DailyNavEntry } from '../pages/leaderboard/components/DailyNav';

const sampleEntries: DailyNavEntry[] = [
  { date: '2026-04-08', puzzleNumber: 10, points: 98, wordsFound: 23, rank: 8, isToday: true },
  { date: '2026-04-07', puzzleNumber: 9, points: 112, wordsFound: 29, rank: 5, isToday: false },
  { date: '2026-04-06', puzzleNumber: 8, points: 61, wordsFound: 14, rank: 12, isToday: false },
  { date: '2026-04-05', puzzleNumber: 7, points: 72, wordsFound: 18, rank: 8, isToday: false },
];

const meta: Meta<typeof DailyNav> = {
  title: 'Leaderboard/DailyNav',
  component: DailyNav,
  parameters: { layout: 'centered' },
};

export default meta;
type Story = StoryObj<typeof DailyNav>;

const Interactive = ({ theme }: { theme: string }) => {
  const [selectedIdx, setSelectedIdx] = useState(0);
  const selectedDate = sampleEntries[selectedIdx].date;

  return (
    <div data-theme={theme} style={{ width: '340px', paddingTop: '20px', paddingBottom: '200px', backgroundColor: theme === 'dark' ? 'var(--page-bg)' : undefined, borderRadius: '16px', padding: theme === 'dark' ? '24px 24px 200px' : '20px 0 200px' }}>
      <DailyNav
        entries={sampleEntries}
        selectedDate={selectedDate}
        onSelectDate={(date) => {
          const idx = sampleEntries.findIndex((e) => e.date === date);
          if (idx >= 0) setSelectedIdx(idx);
        }}
        onPrev={() => setSelectedIdx((i) => Math.min(i + 1, sampleEntries.length - 1))}
        onNext={() => setSelectedIdx((i) => Math.max(i - 1, 0))}
        hasNext={selectedIdx > 0}
      />
    </div>
  );
};

export const Light: Story = {
  render: () => <Interactive theme="light" />,
};

export const Dark: Story = {
  render: () => <Interactive theme="dark" />,
};
