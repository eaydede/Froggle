import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { ProfileDisplay } from '../shared/components/ProfileDisplay';
import { LandingPage } from '../pages/landing/LandingPage';

const DARK_BG = '#2C2C2E';

const meta: Meta<typeof ProfileDisplay> = {
  title: 'Components/Profile',
  component: ProfileDisplay,
  parameters: { layout: 'centered' },
};

export default meta;
type Story = StoryObj<typeof ProfileDisplay>;

function ProfileWrapper({ initial = 'Frog4821', mode = 'light' as 'light' | 'dark' }) {
  const [name, setName] = useState(initial);
  return (
    <div data-theme={mode}>
      <ProfileDisplay displayName={name} onSave={setName} />
    </div>
  );
}

export const Default: Story = {
  render: () => (
    <div className="flex gap-8">
      <div>
        <div className="text-[10px] text-[#999] font-semibold mb-2 uppercase tracking-wider">Light</div>
        <div className="p-6 rounded-2xl bg-[#FAFAF8] border border-[#eee]">
          <ProfileWrapper />
        </div>
      </div>
      <div>
        <div className="text-[10px] text-[#999] font-semibold mb-2 uppercase tracking-wider">Dark</div>
        <div className="p-6 rounded-2xl" style={{ backgroundColor: DARK_BG }} data-theme="dark">
          <ProfileWrapper mode="dark" />
        </div>
      </div>
    </div>
  ),
};

export const InContext: Story = {
  render: () => {
    const [name, setName] = useState('Frog4821');
    return (
      <div className="w-[400px] bg-[#FAFAF8] rounded-2xl p-5 border border-[#eee]">
        <LandingPage
          dailyConfig={{ puzzleNumber: 42, boardSize: 5, timer: 120, minWordLength: 4 }}
          dailyResults={null}
          onDailyClick={fn()}
          onFreePlayClick={fn()}
          displayName={name}
          onDisplayNameChange={setName}
        />
      </div>
    );
  },
};

export const InContextCompleted: Story = {
  render: () => {
    const [name, setName] = useState('Frog4821');
    return (
      <div className="w-[400px] bg-[#FAFAF8] rounded-2xl p-5 border border-[#eee]">
        <LandingPage
          dailyConfig={{ puzzleNumber: 42, boardSize: 5, timer: 120, minWordLength: 4 }}
          dailyResults={{ words: 18, points: 47, longestWord: 'FROGS' }}
          onDailyClick={fn()}
          onFreePlayClick={fn()}
          displayName={name}
          onDisplayNameChange={setName}
        />
      </div>
    );
  },
};
