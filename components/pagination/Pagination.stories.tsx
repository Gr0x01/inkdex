import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import Pagination from './Pagination';

const meta = {
  title: 'Components/Navigation/Pagination',
  component: Pagination,
  parameters: {
    layout: 'centered',
    backgrounds: { default: 'paper' },
  },
  tags: ['autodocs'],
  argTypes: {
    currentPage: {
      control: 'number',
      description: 'Current active page number',
    },
    totalPages: {
      control: 'number',
      description: 'Total number of pages',
    },
    buildUrl: {
      description: 'Function to generate URL for each page',
    },
  },
} satisfies Meta<typeof Pagination>;

export default meta;
type Story = StoryObj<typeof meta>;

// Mock URL builder for Storybook
const mockBuildUrl = (page: number) => `/search?page=${page}`;

/**
 * First page state - Previous button is disabled
 */
export const FirstPage: Story = {
  args: {
    currentPage: 1,
    totalPages: 10,
    buildUrl: mockBuildUrl,
  },
};

/**
 * Middle page state - both Previous and Next are active
 * Shows ellipsis on both sides for large page counts
 */
export const MiddlePage: Story = {
  args: {
    currentPage: 5,
    totalPages: 10,
    buildUrl: mockBuildUrl,
  },
};

/**
 * Last page state - Next button is disabled
 */
export const LastPage: Story = {
  args: {
    currentPage: 10,
    totalPages: 10,
    buildUrl: mockBuildUrl,
  },
};

/**
 * Few pages scenario - shows all page numbers without ellipsis
 * (7 or fewer pages)
 */
export const FewPages: Story = {
  args: {
    currentPage: 3,
    totalPages: 5,
    buildUrl: mockBuildUrl,
  },
};

/**
 * Many pages scenario - demonstrates ellipsis truncation
 * Useful for testing responsiveness with large pagination
 */
export const ManyPages: Story = {
  args: {
    currentPage: 15,
    totalPages: 50,
    buildUrl: mockBuildUrl,
  },
};
