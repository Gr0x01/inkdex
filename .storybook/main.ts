import type { StorybookConfig } from '@storybook/nextjs-vite';
import path from 'path';

const config: StorybookConfig = {
  stories: [
    '../components/**/*.stories.@(ts|tsx|mdx)',
    '../app/**/*.stories.@(ts|tsx|mdx)',
  ],

  addons: [
    '@chromatic-com/storybook',
    '@storybook/addon-a11y',
    '@storybook/addon-docs',
    '@storybook/addon-onboarding',
  ],

  framework: {
    name: '@storybook/nextjs-vite',
    options: {},
  },

  typescript: {
    check: true,
    reactDocgen: 'react-docgen-typescript',
    reactDocgenTypescriptOptions: {
      shouldExtractLiteralValuesFromEnum: true,
      shouldRemoveUndefinedFromOptional: true,
      propFilter: (prop) => {
        if (prop.parent) {
          return !prop.parent.fileName.includes('node_modules');
        }
        return true;
      },
    },
  },

  docs: {},
  staticDirs: ['../public'],

  core: {
    disableTelemetry: true,
  },
};

export default config;
