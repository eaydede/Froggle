import type { Preview } from '@storybook/react';
import '../src/ui/theme.css';

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    backgrounds: {
      default: 'froggle',
      values: [
        { name: 'froggle', value: '#FAFAF8' },
        { name: 'white', value: '#FFFFFF' },
        { name: 'dark', value: '#1a1a1a' },
      ],
    },
  },
};

export default preview;
