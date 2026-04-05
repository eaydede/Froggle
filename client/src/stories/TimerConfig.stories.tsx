import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { TimerConfig } from '../pages/config/components/TimerConfig';
import type { TimerOption } from '../pages/config/types';

const DARK_BG = '#2C2C2E';

const meta: Meta<typeof TimerConfig> = {
  title: 'Components/TimerConfig',
  component: TimerConfig,
  parameters: { layout: 'centered' },
};

export default meta;
type Story = StoryObj<typeof TimerConfig>;

function TimerWrapper({ initial = 60 as TimerOption, disabled = false, mode = 'light' as 'light' | 'dark' }) {
  const [value, setValue] = useState<TimerOption>(initial);
  return <TimerConfig value={value} onChange={setValue} disabled={disabled} mode={mode} />;
}

export const Default: Story = {
  render: () => (
    <div className="flex gap-8">
      <div className="w-[340px]">
        <div className="text-xs text-[#999] font-semibold mb-3 uppercase tracking-wider">Light</div>
        <div className="p-6 rounded-2xl bg-[#FAFAF8] border border-[#eee]">
          <TimerWrapper />
        </div>
      </div>
      <div className="w-[340px]">
        <div className="text-xs text-[#999] font-semibold mb-3 uppercase tracking-wider">Dark</div>
        <div className="p-6 rounded-2xl" style={{ backgroundColor: DARK_BG }}>
          <TimerWrapper mode="dark" />
        </div>
      </div>
    </div>
  ),
};

export const Disabled: Story = {
  render: () => (
    <div className="flex gap-8">
      <div className="w-[340px]">
        <div className="text-xs text-[#999] font-semibold mb-3 uppercase tracking-wider">Light (disabled)</div>
        <div className="p-6 rounded-2xl bg-[#FAFAF8] border border-[#eee]">
          <TimerWrapper initial={120} disabled />
        </div>
      </div>
      <div className="w-[340px]">
        <div className="text-xs text-[#999] font-semibold mb-3 uppercase tracking-wider">Dark (disabled)</div>
        <div className="p-6 rounded-2xl" style={{ backgroundColor: DARK_BG }}>
          <TimerWrapper initial={120} disabled mode="dark" />
        </div>
      </div>
    </div>
  ),
};
