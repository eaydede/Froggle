import type { Meta, StoryObj } from '@storybook/react';
import { PerformanceStamp } from '../pages/daily/components/PerformanceStamp';

const meta: Meta<typeof PerformanceStamp> = {
  title: 'Daily/PerformanceStamp',
  component: PerformanceStamp,
  parameters: { layout: 'centered' },
};

export default meta;
type Story = StoryObj<typeof PerformanceStamp>;

export const FirstLight: Story = {
  args: { tier: 'first' },
  decorators: [
    (Story) => (
      <div data-theme="light" className="p-4">
        <Story />
      </div>
    ),
  ],
};

export const FirstDark: Story = {
  args: { tier: 'first' },
  decorators: [
    (Story) => (
      <div data-theme="dark" className="p-4" style={{ backgroundColor: 'var(--page-bg)', borderRadius: '16px' }}>
        <Story />
      </div>
    ),
  ],
};

export const SecondLight: Story = {
  args: { tier: 'second' },
  decorators: [
    (Story) => (
      <div data-theme="light" className="p-4">
        <Story />
      </div>
    ),
  ],
};

export const SecondDark: Story = {
  args: { tier: 'second' },
  decorators: [
    (Story) => (
      <div data-theme="dark" className="p-4" style={{ backgroundColor: 'var(--page-bg)', borderRadius: '16px' }}>
        <Story />
      </div>
    ),
  ],
};

export const ThirdLight: Story = {
  args: { tier: 'third' },
  decorators: [
    (Story) => (
      <div data-theme="light" className="p-4">
        <Story />
      </div>
    ),
  ],
};

export const ThirdDark: Story = {
  args: { tier: 'third' },
  decorators: [
    (Story) => (
      <div data-theme="dark" className="p-4" style={{ backgroundColor: 'var(--page-bg)', borderRadius: '16px' }}>
        <Story />
      </div>
    ),
  ],
};

export const Top30Light: Story = {
  args: { tier: 'top30' },
  decorators: [
    (Story) => (
      <div data-theme="light" className="p-4">
        <Story />
      </div>
    ),
  ],
};

export const Top30Dark: Story = {
  args: { tier: 'top30' },
  decorators: [
    (Story) => (
      <div data-theme="dark" className="p-4" style={{ backgroundColor: 'var(--page-bg)', borderRadius: '16px' }}>
        <Story />
      </div>
    ),
  ],
};

export const NoTierLight: Story = {
  args: { tier: null },
  decorators: [
    (Story) => (
      <div data-theme="light" className="p-4">
        <Story />
      </div>
    ),
  ],
};

export const NoTierDark: Story = {
  args: { tier: null },
  decorators: [
    (Story) => (
      <div data-theme="dark" className="p-4" style={{ backgroundColor: 'var(--page-bg)', borderRadius: '16px' }}>
        <Story />
      </div>
    ),
  ],
};

// Small variants (for inline use in date picker rows, etc.)

export const SmallFirstLight: Story = {
  args: { tier: 'first', size: 'sm' },
  decorators: [
    (Story) => (
      <div data-theme="light" className="p-4">
        <Story />
      </div>
    ),
  ],
};

export const SmallFirstDark: Story = {
  args: { tier: 'first', size: 'sm' },
  decorators: [
    (Story) => (
      <div data-theme="dark" className="p-4" style={{ backgroundColor: 'var(--page-bg)', borderRadius: '16px' }}>
        <Story />
      </div>
    ),
  ],
};

export const SmallTop30Light: Story = {
  args: { tier: 'top30', size: 'sm' },
  decorators: [
    (Story) => (
      <div data-theme="light" className="p-4">
        <Story />
      </div>
    ),
  ],
};

export const SmallTop30Dark: Story = {
  args: { tier: 'top30', size: 'sm' },
  decorators: [
    (Story) => (
      <div data-theme="dark" className="p-4" style={{ backgroundColor: 'var(--page-bg)', borderRadius: '16px' }}>
        <Story />
      </div>
    ),
  ],
};

export const SmallNoTierLight: Story = {
  args: { tier: null, size: 'sm' },
  decorators: [
    (Story) => (
      <div data-theme="light" className="p-4">
        <Story />
      </div>
    ),
  ],
};

export const SmallNoTierDark: Story = {
  args: { tier: null, size: 'sm' },
  decorators: [
    (Story) => (
      <div data-theme="dark" className="p-4" style={{ backgroundColor: 'var(--page-bg)', borderRadius: '16px' }}>
        <Story />
      </div>
    ),
  ],
};
