import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { DailyCard } from '../pages/landing/components/DailyCard';
import { FreePlayCard } from '../pages/landing/components/FreePlayCard';

const DARK_BG = '#2C2C2E';

const dailyConfig = {
  puzzleNumber: 42,
  boardSize: 5,
  timer: 120,
  minWordLength: 4,
};

const dailyResults = {
  words: 18,
  points: 47,
  longestWord: 'FROGS',
};

// --- Daily Card ---

const dailyMeta: Meta<typeof DailyCard> = {
  title: 'Components/DailyCard',
  component: DailyCard,
  parameters: { layout: 'centered' },
  args: { onClick: fn() },
};

export default dailyMeta;
type Story = StoryObj<typeof DailyCard>;

function DailyStory({ completed }: { completed: boolean }) {
  return (
    <div className="flex gap-8">
      <div className="w-[340px]">
        <div className="text-xs text-[#999] font-semibold mb-3 uppercase tracking-wider">Light</div>
        <div className="p-6 rounded-2xl bg-[#FAFAF8] border border-[#eee]">
          <DailyCard
            config={dailyConfig}
            results={completed ? dailyResults : null}
            onClick={fn()}
            mode="light"
          />
        </div>
      </div>
      <div className="w-[340px]">
        <div className="text-xs text-[#999] font-semibold mb-3 uppercase tracking-wider">Dark</div>
        <div className="p-6 rounded-2xl" style={{ backgroundColor: DARK_BG }}>
          <DailyCard
            config={dailyConfig}
            results={completed ? dailyResults : null}
            onClick={fn()}
            mode="dark"
          />
        </div>
      </div>
    </div>
  );
}

export const Unplayed: Story = {
  render: () => <DailyStory completed={false} />,
};

export const Completed: Story = {
  render: () => <DailyStory completed={true} />,
};
