import type { StorybookConfig } from '@storybook/react-vite';
import { mergeConfig } from 'vite';
import path from 'path';

const packageRoot = (name: string) => path.dirname(require.resolve(`${name}/package.json`));

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(ts|tsx)'],
  addons: [
    packageRoot('@storybook/addon-essentials'),
    packageRoot('@storybook/addon-interactions'),
    packageRoot('@storybook/addon-links'),
  ],
  framework: {
    name: packageRoot('@storybook/react-vite'),
    options: {},
  },
  async viteFinal(config) {
    return mergeConfig(config, {
      resolve: {
        alias: {
          models: path.resolve(__dirname, '../../models'),
        },
      },
    });
  },
};

export default config;
