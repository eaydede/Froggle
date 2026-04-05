import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { LetterConfig } from '../pages/config/components/LetterConfig';
import type { MinWordLength } from '../pages/config/types';

const DARK_BG = '#2C2C2E';

const meta: Meta<typeof LetterConfig> = {
  title: 'Components/LetterConfig',
  component: LetterConfig,
  parameters: { layout: 'centered' },
};

export default meta;
type Story = StoryObj<typeof LetterConfig>;

function LetterWrapper({ initial = 3 as MinWordLength, disabled = false, mode = 'light' as 'light' | 'dark' }) {
  const [value, setValue] = useState<MinWordLength>(initial);
  return <LetterConfig value={value} onChange={setValue} disabled={disabled} mode={mode} />;
}

export const Default: Story = {
  render: () => (
    <div className="flex gap-8">
      <div className="w-[340px]">
        <div className="text-xs text-[#999] font-semibold mb-3 uppercase tracking-wider">Light</div>
        <div className="p-6 rounded-2xl bg-[#FAFAF8] border border-[#eee]">
          <LetterWrapper />
        </div>
      </div>
      <div className="w-[340px]">
        <div className="text-xs text-[#999] font-semibold mb-3 uppercase tracking-wider">Dark</div>
        <div className="p-6 rounded-2xl" style={{ backgroundColor: DARK_BG }}>
          <LetterWrapper mode="dark" />
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
          <LetterWrapper initial={4} disabled />
        </div>
      </div>
      <div className="w-[340px]">
        <div className="text-xs text-[#999] font-semibold mb-3 uppercase tracking-wider">Dark (disabled)</div>
        <div className="p-6 rounded-2xl" style={{ backgroundColor: DARK_BG }}>
          <LetterWrapper initial={4} disabled mode="dark" />
        </div>
      </div>
    </div>
  ),
};
