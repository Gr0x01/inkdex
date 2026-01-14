import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useState } from 'react';
import GlobalSearchModal from './GlobalSearchModal';
import { SearchProvider, useSearch } from './SearchProvider';

const meta = {
  title: 'Components/Search/GlobalSearchModal',
  component: GlobalSearchModal,
  parameters: {
    layout: 'fullscreen',
    backgrounds: { default: 'paper' },
  },
  tags: ['autodocs'],
} satisfies Meta<typeof GlobalSearchModal>;

export default meta;
type Story = StoryObj<typeof meta>;

// Helper component to control modal state
function _ModalDemo({ defaultOpen = false }: { defaultOpen?: boolean }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  // Mock SearchProvider context
  const mockContext = {
    isOpen,
    openSearch: () => setIsOpen(true),
    closeSearch: () => setIsOpen(false),
  };

  return (
    <div className="min-h-screen bg-paper">
      {/* Trigger button */}
      <div className="p-8">
        <button
          onClick={() => setIsOpen(true)}
          className="px-6 py-3 bg-ink text-white font-mono text-sm uppercase tracking-wider hover:bg-ink/90 transition-colors"
        >
          Open Search Modal
        </button>
        <p className="mt-4 text-sm text-gray-500 font-body">
          Click the button above or press ESC to close the modal
        </p>
      </div>

      {/* Background content to show backdrop effect */}
      <div className="container mx-auto px-4">
        <h1 className="font-display text-5xl text-ink mb-4">Page Content</h1>
        <p className="font-body text-lg text-gray-700 max-w-2xl">
          This background content demonstrates how the modal backdrop blurs and darkens
          the page content. The modal traps focus and can be closed with ESC key or
          clicking the backdrop.
        </p>
        <div className="grid grid-cols-3 gap-4 mt-8">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-40 bg-gray-100 rounded border border-gray-200" />
          ))}
        </div>
      </div>

      {/* Custom provider wrapper for Storybook */}
      {isOpen && (
        <MockSearchProvider value={mockContext}>
          <GlobalSearchModal />
        </MockSearchProvider>
      )}
    </div>
  );
}

// Mock provider for Storybook
function MockSearchProvider({
  children,
  value
}: {
  children: React.ReactNode;
  value: { isOpen: boolean; openSearch: () => void; closeSearch: () => void }
}) {
  return (
    <SearchProvider>
      <MockSearchContext value={value}>
        {children}
      </MockSearchContext>
    </SearchProvider>
  );
}

// Component that overrides context for testing
function MockSearchContext({
  children,
  value: _value
}: {
  children: React.ReactNode;
  value: { isOpen: boolean; openSearch: () => void; closeSearch: () => void }
}) {
  // This is a workaround - GlobalSearchModal uses useSearch internally
  // For proper testing, we'd need to refactor the component to accept props
  // For now, we'll use a simpler approach with the real provider
  return <>{children}</>;
}

// Alternative: Simple open state demo using real provider
function SimpleModalDemo() {
  return (
    <SearchProvider>
      <ModalTrigger />
      <GlobalSearchModal />
    </SearchProvider>
  );
}

function ModalTrigger() {
  const { openSearch, isOpen } = useSearch();
  return (
    <div className="min-h-screen bg-paper">
      <div className="p-8">
        <button
          onClick={openSearch}
          className="px-6 py-3 bg-ink text-white font-mono text-sm uppercase tracking-wider hover:bg-ink/90 transition-colors"
        >
          Open Search Modal
        </button>
        <p className="mt-4 text-sm text-gray-500 font-body">
          Modal is {isOpen ? 'open' : 'closed'}. Click button or use keyboard shortcut.
        </p>
      </div>

      {/* Background content */}
      <div className="container mx-auto px-4">
        <h1 className="font-display text-5xl text-ink mb-4">Page Content</h1>
        <p className="font-body text-lg text-gray-700 max-w-2xl">
          This background content demonstrates how the modal backdrop blurs and darkens
          the page content. The modal traps focus and can be closed with ESC key or
          clicking the backdrop.
        </p>
        <div className="grid grid-cols-3 gap-4 mt-8">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-40 bg-gray-100 rounded border border-gray-200" />
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Interactive demo - click button to open modal
 * Uses SearchProvider context for proper behavior
 */
export const Default: Story = {
  render: () => <SimpleModalDemo />,
};

/**
 * Desktop viewport - centered modal
 */
export const Desktop: Story = {
  render: () => <SimpleModalDemo />,
  parameters: {
    viewport: { defaultViewport: 'desktop' },
  },
};

/**
 * Mobile viewport - bottom drawer style
 */
export const Mobile: Story = {
  render: () => <SimpleModalDemo />,
  parameters: {
    viewport: { defaultViewport: 'mobile' },
  },
};

/**
 * Tablet viewport
 */
export const Tablet: Story = {
  render: () => <SimpleModalDemo />,
  parameters: {
    viewport: { defaultViewport: 'tablet' },
  },
};

/**
 * In navbar context - shows how modal integrates with page
 */
export const InNavbarContext: Story = {
  render: () => (
    <SearchProvider>
      <div className="min-h-screen bg-paper">
        <NavbarWithSearch />
        <GlobalSearchModal />

        {/* Page content */}
        <main className="container mx-auto px-4 py-12">
          <div className="max-w-4xl mx-auto">
            <h1 className="font-display text-5xl text-ink mb-6">Browse Artists</h1>
            <p className="font-body text-lg text-gray-700 mb-8">
              Click the search in the navbar to open the global search modal.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="aspect-square bg-gray-100 rounded border border-gray-200" />
              ))}
            </div>
          </div>
        </main>
      </div>
    </SearchProvider>
  ),
};

// Navbar component that triggers search
function NavbarWithSearch() {
  const { openSearch } = useSearch();
  return (
    <header className="bg-paper border-b-2 border-ink/10 sticky top-0 z-40">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between gap-6 h-24">
          <div className="font-display text-4xl font-black text-ink">INKDEX</div>

          {/* Search trigger */}
          <button
            onClick={openSearch}
            className="flex-1 max-w-2xl flex items-center gap-3 h-11 px-4 bg-white/80 border-2 border-ink/20 hover:border-ink transition-colors text-left"
          >
            <svg
              className="w-5 h-5 text-ink/40"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <span className="text-ink/40 font-body">Search artists, styles...</span>
          </button>

          <nav className="flex items-center gap-8">
            <a href="#" className="font-mono text-sm text-ink hover:text-gray-700">
              Browse
            </a>
            <a href="#" className="font-mono text-sm text-ink hover:text-gray-700">
              Add Artist
            </a>
          </nav>
        </div>
      </div>
    </header>
  );
}
