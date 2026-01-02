import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useState } from 'react';
import { BookingStep } from './BookingStep';

/**
 * The BookingStep component is step 4 of onboarding where artists
 * can optionally add a booking link.
 *
 * This is an optional step - artists can skip it if they don't have
 * a booking system set up yet.
 */
const meta = {
  title: 'Onboarding/BookingStep',
  component: BookingStep,
  parameters: {
    layout: 'padded',
    backgrounds: { default: 'paper' },
  },
  tags: ['autodocs'],
  args: {
    // Default callback handlers for all stories
    onBookingLinkChange: () => {},
    onContinue: () => {},
    onSkip: () => {},
  },
  argTypes: {
    bookingLink: { control: 'text', description: 'Booking URL' },
    loading: { control: 'boolean', description: 'Is form submitting?' },
    error: { control: 'text', description: 'Error message to display' },
    onBookingLinkChange: { action: 'booking link changed' },
    onContinue: { action: 'continue clicked' },
    onSkip: { action: 'skip clicked' },
  },
} satisfies Meta<typeof BookingStep>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Empty: No booking link entered
 */
export const Empty: Story = {
  args: {
    bookingLink: '',
  },
  parameters: {
    docs: {
      description: {
        story: 'Initial state with no booking link. Artists can skip or add a link.',
      },
    },
  },
};

/**
 * Instagram DM: Using Instagram for bookings
 */
export const InstagramDM: Story = {
  args: {
    bookingLink: 'https://instagram.com/alex_ink_la',
  },
  parameters: {
    docs: {
      description: {
        story: 'Artist uses Instagram DMs for booking inquiries.',
      },
    },
  },
};

/**
 * Calendly: Using scheduling platform
 */
export const Calendly: Story = {
  args: {
    bookingLink: 'https://calendly.com/alex-tattoo/consultation',
  },
  parameters: {
    docs: {
      description: {
        story: 'Artist uses Calendly for scheduling consultations.',
      },
    },
  },
};

/**
 * Personal website: Using own website
 */
export const PersonalWebsite: Story = {
  args: {
    bookingLink: 'https://alexrivera.ink/book',
  },
  parameters: {
    docs: {
      description: {
        story: 'Artist uses their personal website for bookings.',
      },
    },
  },
};

/**
 * Validation error: Invalid URL format
 */
export const ValidationError: Story = {
  args: {
    bookingLink: 'not-a-valid-url',
    error: 'Please enter a valid URL (starting with http:// or https://)',
  },
  parameters: {
    docs: {
      description: {
        story: 'Error when URL format is invalid.',
      },
    },
  },
};

/**
 * Saving: Form is submitting
 */
export const Saving: Story = {
  args: {
    bookingLink: 'https://calendly.com/alex-tattoo',
    loading: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Buttons disabled while saving to API.',
      },
    },
  },
};

/**
 * Interactive: Fully functional form
 */
export const Interactive: Story = {
  args: {
    bookingLink: '',
  },
  render: function InteractiveStory() {
    const [bookingLink, setBookingLink] = useState('');

    return (
      <BookingStep
        bookingLink={bookingLink}
        onBookingLinkChange={setBookingLink}
        onContinue={() => alert(`Saved booking link: ${bookingLink}`)}
        onSkip={() => alert('Skipped booking step')}
      />
    );
  },
  parameters: {
    docs: {
      description: {
        story: 'Fully interactive form. Try entering a URL or clicking Skip.',
      },
    },
  },
};

/**
 * Mobile: Booking step on small screens
 */
export const Mobile: Story = {
  args: {
    bookingLink: '',
  },
  parameters: {
    viewport: {
      defaultViewport: 'mobile',
    },
    docs: {
      description: {
        story: 'On mobile, buttons stack gracefully.',
      },
    },
  },
};
