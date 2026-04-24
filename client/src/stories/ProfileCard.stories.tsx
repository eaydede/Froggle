import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { ProfileDisplay } from '../shared/components/ProfileDisplay';
import { LandingPage } from '../pages/landing/LandingPage';

const streakDays = [true, true, true, true, true, true, true, true, true, true];

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
        <div data-theme="light" className="p-6 rounded-2xl bg-[var(--surface-panel)]">
          <ProfileWrapper />
        </div>
      </div>
      <div>
        <div className="text-[10px] text-[#999] font-semibold mb-2 uppercase tracking-wider">Dark</div>
        <div data-theme="dark" className="p-6 rounded-2xl bg-[var(--surface-panel)]">
          <ProfileWrapper mode="dark" />
        </div>
      </div>
    </div>
  ),
};

function InContextWrapper({ completed }: { completed: boolean }) {
  const [name, setName] = useState('Frog4821');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const results = completed ? { words: 19, points: 142, longestWord: 'FROGS' } : null;
  return (
    <div data-theme={theme} className="w-[360px] h-[700px] rounded-2xl overflow-hidden relative">
      <LandingPage
        dateLabel="Tue · Apr 21"
        streak={9}
        streakDays={streakDays}
        dailyResults={results}
        displayName={name}
        onDisplayNameChange={setName}
        onDailyPlay={fn()}
        onDailySeeResult={fn()}
        onDailyLeaderboard={fn()}
        onFreePlayClick={fn()}
        theme={theme}
        onToggleTheme={() => setTheme((t) => (t === 'light' ? 'dark' : 'light'))}
      />
    </div>
  );
}

export const InContext: Story = {
  render: () => <InContextWrapper completed={false} />,
};

export const InContextCompleted: Story = {
  render: () => <InContextWrapper completed={true} />,
};
