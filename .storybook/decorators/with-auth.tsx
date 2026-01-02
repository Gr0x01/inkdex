import type { Decorator } from '@storybook/react';
import { MockAuthProvider } from '../mocks/auth-provider';
import { MOCK_AUTH_STATES } from '../mocks/auth-fixtures';

export const withAuth: Decorator = (Story, context) => {
  const authState = context.parameters.authState ?? 'LOGGED_OUT';
  const authConfig = MOCK_AUTH_STATES[authState as keyof typeof MOCK_AUTH_STATES];

  // Type safety: validate authState is a valid key
  if (!authConfig) {
    console.error(`[withAuth] Invalid authState: "${authState}". Valid options: ${Object.keys(MOCK_AUTH_STATES).join(', ')}`);
    return (
      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded">
        <p className="text-yellow-800 font-semibold">Invalid Auth State</p>
        <p className="text-yellow-600 text-sm">authState "{authState}" is not valid. Using default (LOGGED_OUT).</p>
        <Story />
      </div>
    );
  }

  return (
    <MockAuthProvider
      user={authConfig.user}
      accountType={authConfig.accountType}
      artistId={authConfig.artistId}
      artistSlug={authConfig.artistSlug}
    >
      <Story />
    </MockAuthProvider>
  );
};
