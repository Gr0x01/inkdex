import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useState } from 'react';
import TextSearch from './TextSearch';

const meta: Meta<typeof TextSearch> = {
  title: 'Components/Search/TextSearch',
  component: TextSearch,
  parameters: {
    layout: 'centered',
    backgrounds: { default: 'paper' },
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="w-full max-w-xl p-8">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof TextSearch>;

/**
 * Default empty state - placeholder rotates through examples
 */
export const Default: Story = {
  render: () => {
    const Wrapper = () => {
      const [value, setValue] = useState('');
      return <TextSearch value={value} onChange={setValue} />;
    };
    return <Wrapper />;
  },
};

/**
 * With value - shows text input with character count
 */
export const WithValue: Story = {
  render: () => {
    const Wrapper = () => {
      const [value, setValue] = useState('dark floral sketchy');
      return <TextSearch value={value} onChange={setValue} />;
    };
    return <Wrapper />;
  },
};

/**
 * With valid value - shows success confirmation
 */
export const WithValidValue: Story = {
  render: () => {
    const Wrapper = () => {
      const [value, setValue] = useState('watercolor botanical with fine lines');
      return <TextSearch value={value} onChange={setValue} />;
    };
    return <Wrapper />;
  },
};

/**
 * Too short error - less than 3 characters
 */
export const TooShortError: Story = {
  render: () => {
    const Wrapper = () => {
      const [value, setValue] = useState('ab');
      return <TextSearch value={value} onChange={setValue} />;
    };
    return <Wrapper />;
  },
};

/**
 * Near max length - shows warning color on character count
 */
export const NearMaxLength: Story = {
  render: () => {
    const Wrapper = () => {
      const [value, setValue] = useState(
        'dark floral sketchy blackwork with fine lines and intricate details inspired by botanical illustrations and vintage engravings with a modern twist incorporating geometric shapes and negative space'
      );
      return <TextSearch value={value} onChange={setValue} />;
    };
    return <Wrapper />;
  },
};

/**
 * Compact mode - fewer rows and example pills
 */
export const Compact: Story = {
  render: () => {
    const Wrapper = () => {
      const [value, setValue] = useState('');
      return <TextSearch value={value} onChange={setValue} compact />;
    };
    return <Wrapper />;
  },
};

/**
 * Compact with value
 */
export const CompactWithValue: Story = {
  render: () => {
    const Wrapper = () => {
      const [value, setValue] = useState('minimalist geometric');
      return <TextSearch value={value} onChange={setValue} compact />;
    };
    return <Wrapper />;
  },
};

/**
 * Custom rows - taller textarea
 */
export const CustomRows: Story = {
  render: () => {
    const Wrapper = () => {
      const [value, setValue] = useState('');
      return <TextSearch value={value} onChange={setValue} rows={6} />;
    };
    return <Wrapper />;
  },
};

/**
 * Interactive demo - try typing and clicking examples
 */
export const InteractiveDemo: Story = {
  render: () => {
    const Wrapper = () => {
      const [value, setValue] = useState('');
      return (
        <div className="space-y-6">
          <div className="bg-gray-100 p-6 rounded border border-gray-300">
            <h3 className="font-display text-2xl mb-4 text-ink">Features:</h3>
            <ul className="font-body space-y-2 text-gray-700">
              <li>• Minimum 3 characters required</li>
              <li>• Maximum 200 characters</li>
              <li>• Click example pills to auto-fill</li>
              <li>• Character count indicator</li>
              <li>• Success confirmation when valid</li>
              <li>• Placeholder rotates through examples</li>
            </ul>
          </div>
          <TextSearch value={value} onChange={setValue} />
        </div>
      );
    };
    return <Wrapper />;
  },
};

/**
 * All states comparison
 */
export const AllStates: Story = {
  render: () => {
    const Wrapper = () => {
      const [emptyValue, setEmptyValue] = useState('');
      const [shortValue, setShortValue] = useState('ab');
      const [validValue, setValidValue] = useState('dark floral sketchy');
      const [longValue, setLongValue] = useState(
        'dark floral sketchy blackwork with fine lines and intricate details inspired by botanical illustrations and vintage engravings with a modern twist incorporating geometric shapes and negative space'
      );
      return (
        <div className="space-y-8">
          <div>
            <h3 className="font-display text-lg mb-3 text-ink">Empty State</h3>
            <TextSearch value={emptyValue} onChange={setEmptyValue} />
          </div>
          <div>
            <h3 className="font-display text-lg mb-3 text-ink">Too Short (Error)</h3>
            <TextSearch value={shortValue} onChange={setShortValue} />
          </div>
          <div>
            <h3 className="font-display text-lg mb-3 text-ink">Valid Input (Success)</h3>
            <TextSearch value={validValue} onChange={setValidValue} />
          </div>
          <div>
            <h3 className="font-display text-lg mb-3 text-ink">Near Max Length</h3>
            <TextSearch value={longValue} onChange={setLongValue} />
          </div>
        </div>
      );
    };
    return <Wrapper />;
  },
};

/**
 * On dark background
 */
export const OnDarkBackground: Story = {
  render: () => {
    const Wrapper = () => {
      const [value, setValue] = useState('dark floral sketchy');
      return <TextSearch value={value} onChange={setValue} />;
    };
    return <Wrapper />;
  },
  parameters: {
    backgrounds: { default: 'ink' },
  },
  decorators: [
    (Story) => (
      <div className="w-full max-w-xl p-8 bg-ink rounded-lg">
        <Story />
      </div>
    ),
  ],
};
