import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useState, useEffect } from 'react';
import UnifiedSearchBar from './UnifiedSearchBar';
import styles from './ShimmerSearch.module.css';

const meta = {
  title: 'Components/Search/UnifiedSearchBar',
  component: UnifiedSearchBar,
  parameters: {
    layout: 'fullscreen',
    backgrounds: { default: 'ink' },
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="min-h-screen bg-ink flex items-center justify-center p-8">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof UnifiedSearchBar>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default empty state - shows on homepage hero
 * Features: Image upload, text input, Instagram URL detection
 */
export const Default: Story = {};

/**
 * Desktop viewport - full hero experience
 */
export const Desktop: Story = {
  parameters: {
    viewport: { defaultViewport: 'desktop' },
  },
};

/**
 * Mobile viewport - shows mobile-specific layout
 * Search button moves below input on mobile
 */
export const Mobile: Story = {
  parameters: {
    viewport: { defaultViewport: 'mobile' },
  },
};

/**
 * Tablet viewport - responsive behavior
 */
export const Tablet: Story = {
  parameters: {
    viewport: { defaultViewport: 'tablet' },
  },
};

/**
 * Wide desktop - maximum width constraint
 */
export const WideDesktop: Story = {
  parameters: {
    viewport: { defaultViewport: 'wide' },
  },
};

/**
 * Interactive demo - shows all states
 * Try typing text, uploading images, or pasting Instagram URLs
 */
export const InteractiveDemo: Story = {
  render: () => {
    return (
      <div className="space-y-8 w-full max-w-4xl">
        <div className="bg-white/10 backdrop-blur-sm p-6 rounded-lg border border-white/20">
          <h3 className="text-white font-display text-2xl mb-4">
            Try These Features:
          </h3>
          <ul className="text-white/80 font-body space-y-2">
            <li>• Type text to search by description (min 3 characters)</li>
            <li>• Click upload icon or drag & drop an image</li>
            <li>
              • Paste an Instagram post URL (e.g., https://instagram.com/p/abc123)
            </li>
            <li>
              • Paste an Instagram profile URL (e.g., https://instagram.com/username)
            </li>
            <li>• Watch for Instagram badges when URL is detected</li>
          </ul>
        </div>
        <UnifiedSearchBar />
      </div>
    );
  },
};

/**
 * On paper background - alternative theme
 */
export const OnPaperBackground: Story = {
  parameters: {
    backgrounds: { default: 'paper' },
  },
  decorators: [
    (Story) => (
      <div className="min-h-screen bg-paper flex items-center justify-center p-8">
        <Story />
      </div>
    ),
  ],
};

/**
 * Loading state - shows the animated color border effect
 * This demonstrates the shimmer/glow animation when search is in progress
 */
export const LoadingState: Story = {
  render: () => {
    const [messageIndex, setMessageIndex] = useState(0);
    const loadingMessages = [
      "Analyzing your image...",
      "Comparing with our portfolio...",
      "Finding your perfect match...",
      "Almost there..."
    ];

    useEffect(() => {
      const interval = setInterval(() => {
        setMessageIndex((prev) => (prev + 1) % loadingMessages.length);
      }, 2500);
      return () => clearInterval(interval);
    }, []);

    return (
      <div className="w-full max-w-3xl mx-auto px-4">
        <div className="relative">
          {/* Loading Glow Effect - Always visible in this story */}
          <div className={styles.loadingGlow} style={{ borderRadius: 0 }} />

          <div className="flex flex-col sm:flex-row items-stretch gap-0.5">
            {/* Input Field Container - Loading State */}
            <div className="flex-1 flex items-center gap-2 h-8 px-2 bg-white/95 border-2 border-purple-500/50">
              <div className="flex-1 flex items-center justify-center">
                <p
                  key={messageIndex}
                  className="font-body text-[20px] text-gray-600 animate-fade-in"
                >
                  {loadingMessages[messageIndex]}
                </p>
              </div>
            </div>

            {/* Search Button - Disabled during loading */}
            <button
              type="button"
              disabled
              className="h-8 px-2 border-2 font-mono text-sm sm:text-base font-bold uppercase tracking-widest bg-white/5 text-white/30 border-transparent cursor-not-allowed"
            >
              Search
            </button>
          </div>
        </div>
      </div>
    );
  },
};

/**
 * With context - simulates actual homepage hero layout
 */
export const WithHeroContext: Story = {
  render: () => (
    <section className="relative overflow-hidden bg-ink min-h-screen flex items-center">
      {/* Subtle background */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse at center, transparent 0%, rgba(0, 0, 0, 0.4) 70%, rgba(26, 26, 26, 0.9) 100%)`,
        }}
      />

      {/* Content */}
      <div className="container mx-auto px-4 relative z-20 py-12">
        <div className="max-w-4xl mx-auto text-center">
          {/* Headline */}
          <div className="mb-10">
            <h1
              className="font-display leading-[0.95] mb-5 tracking-tight text-balance"
              style={{
                fontSize: 'clamp(2.5rem, 8vw, 5rem)',
                color: '#FFFFFF',
                textShadow: '0 4px 20px rgba(0, 0, 0, 0.7)',
              }}
            >
              INSTAGRAM HAS YOUR ARTIST.
              <br />
              <span style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                WE HELP YOU FIND&nbsp;THEM.
              </span>
            </h1>

            {/* Subheading */}
            <p
              className="font-body text-lg leading-relaxed max-w-2xl mx-auto"
              style={{
                color: 'rgba(255, 255, 255, 0.75)',
                textShadow: '0 2px 12px rgba(0, 0, 0, 0.8)',
              }}
            >
              Upload a reference image or describe your vibe—we'll scan millions of
              tattoo posts to find artists whose portfolios match your style.
            </p>
          </div>

          {/* Search Bar */}
          <UnifiedSearchBar />
        </div>
      </div>
    </section>
  ),
  parameters: {
    layout: 'fullscreen',
  },
};
