import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useState } from 'react';
import { PreviewStep, PreviewStepLoading, PreviewStepError } from './PreviewStep';

/**
 * The PreviewStep component is step 2 of onboarding where artists
 * edit their profile details and see a live preview.
 *
 * Required fields: Name, City, State
 * Optional: Bio (max 500 characters)
 */
const meta = {
  title: 'Onboarding/PreviewStep',
  component: PreviewStep,
  parameters: {
    layout: 'padded',
    backgrounds: { default: 'paper' },
  },
  tags: ['autodocs'],
  args: {
    // Default callback handlers for all stories
    onNameChange: () => {},
    onCityChange: () => {},
    onStateChange: () => {},
    onBioChange: () => {},
    onContinue: () => {},
  },
  argTypes: {
    name: { control: 'text', description: 'Artist name' },
    city: { control: 'text', description: 'City location' },
    state: { control: 'text', description: 'State location' },
    bio: { control: 'text', description: 'Artist bio (max 500 chars)' },
    loading: { control: 'boolean', description: 'Is form submitting?' },
    error: { control: 'text', description: 'Error message to display' },
    onNameChange: { action: 'name changed' },
    onCityChange: { action: 'city changed' },
    onStateChange: { action: 'state changed' },
    onBioChange: { action: 'bio changed' },
    onContinue: { action: 'continue clicked' },
  },
} satisfies Meta<typeof PreviewStep>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Empty form: Initial state with no data
 */
export const EmptyForm: Story = {
  args: {
    name: '',
    city: '',
    state: '',
    bio: '',
  },
  parameters: {
    docs: {
      description: {
        story: 'Initial state when session data is not pre-populated.',
      },
    },
  },
};

/**
 * Pre-populated: Form with Instagram data
 */
export const PrePopulated: Story = {
  args: {
    name: 'Alex Rivera',
    city: 'Los Angeles',
    state: 'California',
    bio: 'Fine line specialist with 8 years of experience. Specializing in botanical and geometric designs. DM for bookings.',
  },
  parameters: {
    docs: {
      description: {
        story: 'Form pre-populated with data from Instagram profile.',
      },
    },
  },
};

/**
 * With long bio: Testing character limit
 */
export const WithLongBio: Story = {
  args: {
    name: 'Morgan Black',
    city: 'New York',
    state: 'New York',
    bio: 'Award-winning tattoo artist with over 15 years of experience in the industry. I specialize in neo-traditional and Japanese-inspired designs, blending classic techniques with modern aesthetics. My studio in Brooklyn is a welcoming space for first-timers and seasoned collectors alike. I believe every tattoo should tell a story, and I work closely with each client to bring their vision to life. When not tattooing, you can find me sketching at local coffee shops or attending art shows.',
  },
  parameters: {
    docs: {
      description: {
        story: 'Testing the 500 character limit on bio field.',
      },
    },
  },
};

/**
 * Validation error: Missing required fields
 */
export const ValidationError: Story = {
  args: {
    name: 'Jamie',
    city: '',
    state: '',
    bio: '',
    error: 'Name, city, and state are required',
  },
  parameters: {
    docs: {
      description: {
        story: 'Error state when required fields are missing.',
      },
    },
  },
};

/**
 * Saving: Form is submitting
 */
export const Saving: Story = {
  args: {
    name: 'Alex Rivera',
    city: 'Los Angeles',
    state: 'California',
    bio: 'Fine line specialist.',
    loading: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Button shows loading state while saving to API.',
      },
    },
  },
};

/**
 * Interactive: Fully functional form
 */
export const Interactive: Story = {
  args: {
    name: '',
    city: '',
    state: '',
    bio: '',
  },
  render: function InteractiveStory() {
    const [name, setName] = useState('');
    const [city, setCity] = useState('');
    const [state, setState] = useState('');
    const [bio, setBio] = useState('');

    return (
      <PreviewStep
        name={name}
        city={city}
        state={state}
        bio={bio}
        onNameChange={setName}
        onCityChange={setCity}
        onStateChange={setState}
        onBioChange={setBio}
        onContinue={() => alert('Continue clicked!')}
      />
    );
  },
  parameters: {
    docs: {
      description: {
        story: 'Fully interactive form with working state. Try typing to see the live preview update.',
      },
    },
  },
};

/**
 * Mobile: Preview step on small screens
 */
export const Mobile: Story = {
  args: {
    name: 'Alex Rivera',
    city: 'Los Angeles',
    state: 'California',
    bio: 'Fine line specialist.',
  },
  parameters: {
    viewport: {
      defaultViewport: 'mobile',
    },
    docs: {
      description: {
        story: 'On mobile, the form and preview stack vertically.',
      },
    },
  },
};

/**
 * Loading state: Fetching session data
 */
export const Loading: Story = {
  args: {
    name: '',
    city: '',
    state: '',
    bio: '',
  },
  render: () => <PreviewStepLoading />,
  parameters: {
    docs: {
      description: {
        story: 'Loading state while fetching session data from the database.',
      },
    },
  },
};

/**
 * Session error: Invalid or expired session
 */
export const SessionError: Story = {
  args: {
    name: '',
    city: '',
    state: '',
    bio: '',
  },
  render: () => <PreviewStepError error="Session not found. Please start over." />,
  parameters: {
    docs: {
      description: {
        story: 'Error state when session is invalid, expired, or belongs to another user.',
      },
    },
  },
};
