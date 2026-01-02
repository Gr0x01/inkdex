import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useState } from 'react';
import { PortfolioStep, PortfolioStepLoading, PortfolioStepError, type PortfolioImage } from './PortfolioStep';

// Generate mock images for stories
const generateMockImages = (count: number, classifiedRatio = 0.9): PortfolioImage[] => {
  return Array.from({ length: count }, (_, i) => ({
    instagram_post_id: `post_${i + 1}`,
    url: `https://picsum.photos/seed/tattoo${i + 1}/400/400`,
    classified: i < Math.floor(count * classifiedRatio),
  }));
};

/**
 * The PortfolioStep component is step 3 of onboarding where artists
 * select up to 20 images for their portfolio from their Instagram posts.
 *
 * Only images classified as tattoo content are shown.
 */
const meta = {
  title: 'Onboarding/PortfolioStep',
  component: PortfolioStep,
  parameters: {
    layout: 'padded',
    backgrounds: { default: 'paper' },
  },
  tags: ['autodocs'],
  args: {
    // Default callback handlers for all stories
    onToggleImage: () => {},
    onContinue: () => {},
  },
  argTypes: {
    maxImages: { control: { type: 'number', min: 1, max: 100 }, description: 'Maximum selectable images' },
    loading: { control: 'boolean', description: 'Is form submitting?' },
    error: { control: 'text', description: 'Error message to display' },
    onToggleImage: { action: 'image toggled' },
    onContinue: { action: 'continue clicked' },
    onStartOver: { action: 'start over clicked' },
  },
} satisfies Meta<typeof PortfolioStep>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Empty selection: No images selected yet
 */
export const EmptySelection: Story = {
  args: {
    images: generateMockImages(24),
    selected: new Set(),
    maxImages: 20,
  },
  parameters: {
    docs: {
      description: {
        story: 'Initial state with no images selected. Continue button is disabled.',
      },
    },
  },
};

/**
 * Partial selection: Some images selected
 */
export const PartialSelection: Story = {
  args: {
    images: generateMockImages(24),
    selected: new Set(['post_1', 'post_3', 'post_5', 'post_7', 'post_9', 'post_11', 'post_13']),
    maxImages: 20,
  },
  parameters: {
    docs: {
      description: {
        story: '7 images selected out of 20 maximum.',
      },
    },
  },
};

/**
 * Full selection: Maximum images selected
 */
export const FullSelection: Story = {
  args: {
    images: generateMockImages(30),
    selected: new Set(Array.from({ length: 20 }, (_, i) => `post_${i + 1}`)),
    maxImages: 20,
  },
  parameters: {
    docs: {
      description: {
        story: 'Maximum 20 images selected. Additional selections will be ignored.',
      },
    },
  },
};

/**
 * Few images: When user has limited Instagram content
 */
export const FewImages: Story = {
  args: {
    images: generateMockImages(6),
    selected: new Set(['post_1', 'post_2']),
    maxImages: 20,
  },
  parameters: {
    docs: {
      description: {
        story: 'User only has 6 classified images available.',
      },
    },
  },
};

/**
 * Validation error: No selection
 */
export const ValidationError: Story = {
  args: {
    images: generateMockImages(24),
    selected: new Set(),
    error: 'Please select at least 1 image',
    maxImages: 20,
  },
  parameters: {
    docs: {
      description: {
        story: 'Error when trying to continue without selecting any images.',
      },
    },
  },
};

/**
 * Saving: Form is submitting
 */
export const Saving: Story = {
  args: {
    images: generateMockImages(24),
    selected: new Set(['post_1', 'post_3', 'post_5']),
    loading: true,
    maxImages: 20,
  },
  parameters: {
    docs: {
      description: {
        story: 'Button shows loading state while saving selection to API.',
      },
    },
  },
};

/**
 * Pro tier: 100 image limit
 */
export const ProTier: Story = {
  args: {
    images: generateMockImages(50),
    selected: new Set(Array.from({ length: 45 }, (_, i) => `post_${i + 1}`)),
    maxImages: 100,
  },
  parameters: {
    docs: {
      description: {
        story: 'Pro tier artists can select up to 100 images.',
      },
    },
  },
};

/**
 * Interactive: Fully functional selection
 */
export const Interactive: Story = {
  args: {
    images: generateMockImages(24),
    selected: new Set(),
    maxImages: 20,
  },
  render: function InteractiveStory() {
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const images = generateMockImages(24);
    const maxImages = 20;

    const handleToggle = (id: string) => {
      const newSelected = new Set(selected);
      if (newSelected.has(id)) {
        newSelected.delete(id);
      } else if (newSelected.size < maxImages) {
        newSelected.add(id);
      }
      setSelected(newSelected);
    };

    return (
      <PortfolioStep
        images={images}
        selected={selected}
        maxImages={maxImages}
        onToggleImage={handleToggle}
        onContinue={() => alert(`Selected ${selected.size} images!`)}
      />
    );
  },
  parameters: {
    docs: {
      description: {
        story: 'Fully interactive selection. Click images to select/deselect. Counter updates in real-time.',
      },
    },
  },
};

/**
 * Mobile: Portfolio step on small screens
 */
export const Mobile: Story = {
  args: {
    images: generateMockImages(12),
    selected: new Set(['post_1', 'post_3']),
    maxImages: 20,
  },
  parameters: {
    viewport: {
      defaultViewport: 'mobile',
    },
    docs: {
      description: {
        story: 'On mobile, images display in a 2-column grid.',
      },
    },
  },
};

/**
 * Loading state: Fetching session images
 */
export const Loading: Story = {
  args: {
    images: [],
    selected: new Set(),
    maxImages: 20,
  },
  render: () => <PortfolioStepLoading />,
  parameters: {
    docs: {
      description: {
        story: 'Loading state while fetching classified images from the session.',
      },
    },
  },
};

/**
 * Session error: No images found
 */
export const NoImagesError: Story = {
  args: {
    images: [],
    selected: new Set(),
    maxImages: 20,
  },
  render: () => <PortfolioStepError error="No images found. Please go back and fetch images first." />,
  parameters: {
    docs: {
      description: {
        story: 'Error when session has no fetched images.',
      },
    },
  },
};

/**
 * Session error: Invalid session
 */
export const SessionError: Story = {
  args: {
    images: [],
    selected: new Set(),
    maxImages: 20,
  },
  render: () => <PortfolioStepError error="Session not found. Please start over." />,
  parameters: {
    docs: {
      description: {
        story: 'Error when session is invalid or expired.',
      },
    },
  },
};
