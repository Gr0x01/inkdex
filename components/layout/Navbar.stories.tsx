import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import Navbar from './Navbar';

const meta = {
  title: 'Components/Layout/Navbar',
  component: Navbar,
  parameters: {
    layout: 'fullscreen',
    backgrounds: { default: 'paper' },
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Navbar>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default navbar - desktop view with search and navigation
 */
export const Default: Story = {};

/**
 * Desktop viewport - full navigation experience
 */
export const Desktop: Story = {
  parameters: {
    viewport: { defaultViewport: 'desktop' },
  },
};

/**
 * Mobile viewport - shows hamburger menu
 * Click the hamburger icon to see mobile menu
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
 * With page content - shows navbar in context
 */
export const WithPageContent: Story = {
  render: () => (
    <div className="min-h-screen bg-paper">
      <Navbar />
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <h1 className="font-display text-5xl text-ink mb-6">
            Example Page Content
          </h1>
          <p className="font-body text-lg text-gray-700 leading-relaxed mb-4">
            This demonstrates how the navbar appears at the top of a page with content
            below. The navbar includes:
          </p>
          <ul className="font-body text-gray-700 space-y-2 list-disc list-inside mb-8">
            <li>Editorial masthead logo with "INKDEX" branding</li>
            <li>Global search bar (desktop only)</li>
            <li>Browse dropdown with alphabetically sorted cities</li>
            <li>Add Artist link</li>
            <li>Mobile hamburger menu (on small screens)</li>
          </ul>
          <div className="h-[100vh] bg-gray-100 rounded-lg p-8">
            <p className="font-body text-gray-600">Scroll to see more content...</p>
          </div>
        </div>
      </main>
    </div>
  ),
};

/**
 * Sticky navbar behavior - scroll to test
 */
export const StickyBehavior: Story = {
  render: () => (
    <div className="min-h-screen bg-paper">
      <div className="sticky top-0 z-50">
        <Navbar />
      </div>
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto space-y-8">
          <div>
            <h1 className="font-display text-5xl text-ink mb-6">Sticky Navbar Test</h1>
            <p className="font-body text-lg text-gray-700">
              Scroll down to see the navbar stick to the top of the page.
            </p>
          </div>

          {/* Tall content to demonstrate scrolling */}
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="bg-white p-8 rounded-lg border border-gray-200">
              <h2 className="font-display text-2xl text-ink mb-4">
                Section {i + 1}
              </h2>
              <p className="font-body text-gray-700 leading-relaxed">
                Lorem ipsum dolor sit amet, consectetur adipiscing elit. The navbar
                should remain visible at the top as you scroll through this content.
              </p>
            </div>
          ))}
        </div>
      </main>
    </div>
  ),
};

/**
 * Mobile menu open state
 * Shows what the mobile menu looks like when expanded
 */
export const MobileMenuOpen: Story = {
  render: () => {
    // Note: In a real story, you'd use state to control this
    // For now, this is a visual reference showing the mobile menu design
    return (
      <div className="bg-paper">
        <Navbar />
        <div className="bg-gray-100 p-8">
          <p className="font-body text-gray-600 text-center">
            Click the hamburger menu icon (☰) on mobile to see the menu expand
          </p>
        </div>
      </div>
    );
  },
  parameters: {
    viewport: { defaultViewport: 'mobile' },
  },
};

/**
 * Browse dropdown open state (desktop)
 * Shows the city dropdown menu
 */
export const BrowseDropdownOpen: Story = {
  render: () => (
    <div className="bg-paper pb-96">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <p className="font-body text-gray-600 text-center">
          Click "Browse" in the navbar to see the city dropdown menu
        </p>
      </div>
    </div>
  ),
  parameters: {
    viewport: { defaultViewport: 'desktop' },
  },
};

/**
 * All viewport sizes comparison
 */
export const ViewportComparison: Story = {
  render: () => (
    <div className="space-y-8 p-8 bg-gray-50">
      <div>
        <h3 className="font-display text-2xl mb-4 text-ink">Desktop (1280px+)</h3>
        <div className="border-2 border-gray-300 rounded">
          <Navbar />
        </div>
        <p className="font-body text-sm text-gray-600 mt-2">
          Full navigation with search bar inline
        </p>
      </div>

      <div>
        <h3 className="font-display text-2xl mb-4 text-ink">Mobile (375px)</h3>
        <div className="max-w-sm border-2 border-gray-300 rounded">
          <Navbar />
        </div>
        <p className="font-body text-sm text-gray-600 mt-2">
          Hamburger menu with search inside mobile menu
        </p>
      </div>
    </div>
  ),
  parameters: {
    layout: 'padded',
  },
};

/**
 * On dark page - contrast testing
 */
export const OnDarkPage: Story = {
  render: () => (
    <div className="min-h-screen bg-ink">
      <Navbar />
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto text-white">
          <h1 className="font-display text-5xl mb-6">Dark Page</h1>
          <p className="font-body text-lg leading-relaxed text-white/80">
            This shows how the navbar (with paper background) appears at the top of a
            dark page, creating clear visual separation.
          </p>
        </div>
      </main>
    </div>
  ),
};

/**
 * Accessibility features demo
 */
export const AccessibilityFeatures: Story = {
  render: () => (
    <div className="bg-paper">
      <Navbar />
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <h1 className="font-display text-4xl text-ink mb-6">
            Accessibility Features
          </h1>
          <div className="font-body text-gray-700 space-y-4">
            <h2 className="font-display text-2xl text-ink mt-6 mb-3">
              Keyboard Navigation
            </h2>
            <ul className="list-disc list-inside space-y-2">
              <li>Tab through all interactive elements</li>
              <li>Enter or Space to activate Browse dropdown</li>
              <li>Escape to close Browse dropdown</li>
              <li>Enter or Space to toggle mobile menu</li>
            </ul>

            <h2 className="font-display text-2xl text-ink mt-6 mb-3">ARIA Labels</h2>
            <ul className="list-disc list-inside space-y-2">
              <li>aria-label on Browse button ("Browse cities")</li>
              <li>aria-expanded on dropdown and mobile menu</li>
              <li>aria-haspopup on dropdown trigger</li>
              <li>role="menu" on dropdown content</li>
              <li>role="menuitem" on city links</li>
              <li>aria-hidden on decorative SVG elements</li>
            </ul>

            <h2 className="font-display text-2xl text-ink mt-6 mb-3">
              Focus Management
            </h2>
            <ul className="list-disc list-inside space-y-2">
              <li>Focus returns to trigger button when closing dropdown</li>
              <li>Focus returns to hamburger when closing mobile menu</li>
              <li>Click outside closes dropdown and mobile menu</li>
            </ul>
          </div>
        </div>
      </main>
    </div>
  ),
};
