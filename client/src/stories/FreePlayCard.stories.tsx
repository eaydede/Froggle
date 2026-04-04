import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { FreePlayCard } from '../components/FreePlayCard';

const DARK_BG = '#2C2C2E';

const meta: Meta<typeof FreePlayCard> = {
  title: 'Components/FreePlayCard',
  component: FreePlayCard,
  parameters: { layout: 'centered' },
  args: { onClick: fn() },
};

export default meta;
type Story = StoryObj<typeof FreePlayCard>;

export const Default: Story = {
  render: () => (
    <div className="flex gap-8">
      <div className="w-[340px]">
        <div className="text-xs text-[#999] font-semibold mb-3 uppercase tracking-wider">Light</div>
        <div className="p-6 rounded-2xl bg-[#FAFAF8] border border-[#eee]">
          <FreePlayCard onClick={fn()} mode="light" />
        </div>
      </div>
      <div className="w-[340px]">
        <div className="text-xs text-[#999] font-semibold mb-3 uppercase tracking-wider">Dark</div>
        <div className="p-6 rounded-2xl" style={{ backgroundColor: DARK_BG }}>
          <FreePlayCard onClick={fn()} mode="dark" />
        </div>
      </div>
    </div>
  ),
};
