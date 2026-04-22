import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { LetterConfig } from '../pages/config/components/LetterConfig';
import type { MinWordLength } from '../pages/config/types';

const meta: Meta<typeof LetterConfig> = {
  title: 'Components/LetterConfig',
  component: LetterConfig,
  parameters: { layout: 'centered' },
};

export default meta;
type Story = StoryObj<typeof LetterConfig>;

function LetterWrapper({ initial = 3 as MinWordLength, disabled = false }) {
  const [value, setValue] = useState<MinWordLength>(initial);
  return <LetterConfig value={value} onChange={setValue} disabled={disabled} />;
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
      <Frame theme="light"><LetterWrapper /></Frame>
      <Frame theme="dark"><LetterWrapper /></Frame>
    </div>
  ),
};

export const Disabled: Story = {
  render: () => (
    <div className="flex gap-8">
      <Frame theme="light"><LetterWrapper initial={4} disabled /></Frame>
      <Frame theme="dark"><LetterWrapper initial={4} disabled /></Frame>
    </div>
  ),
};
