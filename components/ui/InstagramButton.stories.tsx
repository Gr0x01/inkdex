import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import InstagramButton from './InstagramButton'

const meta: Meta<typeof InstagramButton> = {
  title: 'UI/InstagramButton',
  component: InstagramButton,
  parameters: {
    layout: 'centered',
    backgrounds: {
      default: 'light',
    },
  },
  tags: ['autodocs'],
  argTypes: {
    children: {
      control: 'text',
      description: 'Button text content',
    },
    href: {
      control: 'text',
      description: 'Link destination',
    },
    asAnchor: {
      control: 'boolean',
      description: 'Use anchor tag instead of Next.js Link (for API routes)',
    },
  },
}

export default meta
type Story = StoryObj<typeof InstagramButton>

export const Default: Story = {
  args: {
    children: 'Connect with Instagram →',
    href: '/add-artist',
  },
}

export const ClaimProfile: Story = {
  args: {
    children: 'Claim Your Profile →',
    href: '/add-artist',
  },
}

export const SignIn: Story = {
  args: {
    children: 'Sign in with Instagram →',
    href: '/login',
  },
}

export const AsAnchor: Story = {
  args: {
    children: 'Connect with Instagram →',
    href: '/api/auth/instagram',
    asAnchor: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Use asAnchor for API routes that require full page redirect',
      },
    },
  },
}

export const WithCustomWidth: Story = {
  args: {
    children: 'Get Started →',
    href: '/add-artist',
    className: 'w-64',
  },
}

export const InContext: Story = {
  render: () => (
    <div className="flex flex-col gap-4 items-center p-8 bg-gray-50 rounded-lg">
      <h2 className="font-display text-2xl font-bold text-text-primary">
        Ready to get discovered?
      </h2>
      <p className="font-body text-text-secondary text-center max-w-md">
        Join thousands of tattoo artists already on Inkdex
      </p>
      <div className="flex gap-4">
        <InstagramButton href="/add-artist">
          Claim Your Profile →
        </InstagramButton>
        <button className="px-6 py-3 bg-ink-black text-paper-white font-mono text-xs uppercase tracking-[0.15em]">
          Learn More
        </button>
      </div>
    </div>
  ),
}
