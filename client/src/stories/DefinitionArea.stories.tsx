import type { Meta, StoryObj } from '@storybook/react';
import { DefinitionArea } from '../pages/daily/components/DefinitionArea';
import { mockDefinition } from './mockDefinition';

const meta: Meta<typeof DefinitionArea> = {
  title: 'Daily/DefinitionArea',
  component: DefinitionArea,
  parameters: { layout: 'centered' },
};

export default meta;
type Story = StoryObj<typeof DefinitionArea>;

const shortDefinition = {
  word: 'FROG',
  definition: mockDefinition(
    'FROG',
    'A small tailless amphibian with a short squat body and very long hind legs for leaping.',
  ),
  onExpandChange: () => {},
};

const longDefinition = {
  word: 'SERENDIPITY',
  definition: mockDefinition(
    'SERENDIPITY',
    'The faculty or phenomenon of finding valuable or agreeable things not sought for. Often associated with happy accidents or pleasant surprises that occur when one is not actively searching for them. The term was coined by Horace Walpole in 1754 based on the Persian fairy tale "The Three Princes of Serendip" whose heroes were always making discoveries by accident and sagacity.',
  ),
  onExpandChange: () => {},
};

export const ShortLight: Story = {
  args: shortDefinition,
  decorators: [
    (Story) => (
      <div data-theme="light" className="w-[300px] p-4">
        <Story />
      </div>
    ),
  ],
};

export const ShortDark: Story = {
  args: shortDefinition,
  decorators: [
    (Story) => (
      <div data-theme="dark" className="w-[300px] p-4" style={{ backgroundColor: 'var(--page-bg)', borderRadius: '16px' }}>
        <Story />
      </div>
    ),
  ],
};

export const LongTruncatedLight: Story = {
  args: longDefinition,
  decorators: [
    (Story) => (
      <div data-theme="light" className="w-[300px] p-4">
        <Story />
      </div>
    ),
  ],
};

export const LongTruncatedDark: Story = {
  args: longDefinition,
  decorators: [
    (Story) => (
      <div data-theme="dark" className="w-[300px] p-4" style={{ backgroundColor: 'var(--page-bg)', borderRadius: '16px' }}>
        <Story />
      </div>
    ),
  ],
};
