import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { TimerConfig } from '../pages/config/components/TimerConfig';
import type { TimerOption } from '../pages/config/types';

const meta: Meta<typeof TimerConfig> = {
  title: 'Components/TimerConfig',
  component: TimerConfig,
  parameters: { layout: 'centered' },
};

export default meta;
type Story = StoryObj<typeof TimerConfig>;

function TimerWrapper({ initial = 60 as TimerOption, disabled = false }) {
  const [value, setValue] = useState<TimerOption>(initial);
  return <TimerConfig value={value} onChange={setValue} disabled={disabled} />;
}

function Frame({ theme, children }: { theme: 'light' | 'dark'; children: React.ReactNode }) {
  return (
    <div
      data-theme={theme}
      className="w-[340px] p-6 rounded-2xl bg-[var(--surface-panel)]"
    >
      {children}
    </div>
  );
}

export const Default: Story = {
  render: () => (
    <div className="flex gap-8">
      <Frame theme="light"><TimerWrapper /></Frame>
      <Frame theme="dark"><TimerWrapper /></Frame>
    </div>
  ),
};

export const Disabled: Story = {
  render: () => (
    <div className="flex gap-8">
      <Frame theme="light"><TimerWrapper initial={120} disabled /></Frame>
      <Frame theme="dark"><TimerWrapper initial={120} disabled /></Frame>
    </div>
  ),
};
