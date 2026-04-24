import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { FreePlayCard } from '../pages/landing/components/FreePlayCard';

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
      <div data-theme="light" className="w-[340px] p-6 rounded-2xl bg-[var(--surface-panel)]">
        <FreePlayCard onClick={fn()} />
      </div>
      <div data-theme="dark" className="w-[340px] p-6 rounded-2xl bg-[var(--surface-panel)]">
        <FreePlayCard onClick={fn()} />
      </div>
    </div>
  ),
};
