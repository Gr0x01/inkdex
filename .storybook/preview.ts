import type { Preview } from '@storybook/nextjs-vite';
import '../app/globals.css'; // Tailwind + global styles
import { withAuth } from './decorators/with-auth';

const preview: Preview = {
  parameters: {
    nextjs: {
      appDirectory: true,
      navigation: {
        pathname: '/',
      },
    },

    actions: {
      argTypesRegex: '^on[A-Z].*',
    },

    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/,
      },
      expanded: true,
      sort: 'requiredFirst',
    },

    viewport: {
      viewports: {
        mobile: {
          name: 'Mobile',
          styles: { width: '375px', height: '667px' },
          type: 'mobile',
        },
        tablet: {
          name: 'Tablet',
          styles: { width: '768px', height: '1024px' },
          type: 'tablet',
        },
        desktop: {
          name: 'Desktop',
          styles: { width: '1280px', height: '800px' },
          type: 'desktop',
        },
        wide: {
          name: 'Wide Desktop',
          styles: { width: '1920px', height: '1080px' },
          type: 'desktop',
        },
      },
      defaultViewport: 'desktop',
    },

    layout: 'centered',

    backgrounds: {
      default: 'paper',
      values: [
        { name: 'paper', value: '#F8F7F5' },
        { name: 'ink', value: '#1A1A1A' },
        { name: 'gray-light', value: '#F0EFEC' },
        { name: 'gray-dark', value: '#2A2826' },
      ],
    },

    docs: {
      toc: true,
    },
  },

  decorators: [withAuth],
  argTypes: {},
  tags: ['autodocs'],
};

export default preview;
