import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { DailyCard } from '../pages/landing/components/DailyCard';
import { FreePlayCard } from '../pages/landing/components/FreePlayCard';

const streakDays = [true, true, true, true, true, true, true, true, true, true];

const dailyResults = {
  words: 19,
  points: 142,
  longestWord: 'FROGS',
};

const dailyMeta: Meta<typeof DailyCard> = {
  title: 'Components/DailyCard',
  component: DailyCard,
  parameters: { layout: 'centered' },
  args: {
    onPlay: fn(),
    onSeeResult: fn(),
    onSeeLeaderboard: fn(),
  },
};

export default dailyMeta;
type Story = StoryObj<typeof DailyCard>;

function PaperFrame({ children, theme }: { children: React.ReactNode; theme: 'light' | 'dark' }) {
  return (
    <div
      data-theme={theme}
      className="w-[340px] p-6 rounded-2xl bg-[var(--surface-panel)]"
    >
      {children}
    </div>
  );
}

function DailyStory({ completed }: { completed: boolean }) {
  return (
    <div className="flex gap-8">
      <PaperFrame theme="light">
        <DailyCard
          dateLabel="Tue · Apr 21"
          streak={9}
          streakDays={streakDays}
          results={completed ? dailyResults : null}
          onPlay={fn()}
          onSeeResult={fn()}
          onSeeLeaderboard={fn()}
        />
        <div className="h-4" />
        <FreePlayCard onClick={fn()} />
      </PaperFrame>
      <PaperFrame theme="dark">
        <DailyCard
          dateLabel="Tue · Apr 21"
          streak={9}
          streakDays={streakDays}
          results={completed ? dailyResults : null}
          onPlay={fn()}
          onSeeResult={fn()}
          onSeeLeaderboard={fn()}
        />
        <div className="h-4" />
        <FreePlayCard onClick={fn()} />
      </PaperFrame>
    </div>
  );
}

export const Unplayed: Story = {
  render: () => <DailyStory completed={false} />,
};

export const Completed: Story = {
  render: () => <DailyStory completed={true} />,
};
