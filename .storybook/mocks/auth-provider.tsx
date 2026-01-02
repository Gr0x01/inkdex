import React, { createContext, useContext } from 'react';
import type { User, Session } from '@supabase/supabase-js';

export interface MockAuthUser extends Partial<User> {
  id: string;
  email: string;
  user_metadata?: {
    instagram_username?: string;
    instagram_id?: string;
  };
}

export interface MockSession extends Partial<Session> {
  user: MockAuthUser;
}

export interface MockAuthContextValue {
  user: MockAuthUser | null;
  session: MockSession | null;
  accountType: 'fan' | 'artist_free' | 'artist_pro' | null;
  isPro: boolean;
  isFree: boolean;
  artistId?: string;
  artistSlug?: string;
}

const MockAuthContext = createContext<MockAuthContextValue>({
  user: null,
  session: null,
  accountType: null,
  isPro: false,
  isFree: false,
});

export function MockAuthProvider({
  children,
  user,
  accountType,
  artistId,
  artistSlug,
}: {
  children: React.ReactNode;
  user?: MockAuthUser | null;
  accountType?: 'fan' | 'artist_free' | 'artist_pro' | null;
  artistId?: string;
  artistSlug?: string;
}) {
  try {
    const session = user
      ? ({
          user,
          access_token: 'STORYBOOK_MOCK_TOKEN_NOT_VALID', // Mock token for Storybook only
          refresh_token: 'STORYBOOK_MOCK_REFRESH_NOT_VALID',
          expires_at: Date.now() + 3600000,
        } as MockSession)
      : null;

    const isPro = accountType === 'artist_pro';
    const isFree = accountType === 'artist_free';

    const value: MockAuthContextValue = {
      user: user ?? null,
      session,
      accountType: accountType ?? null,
      isPro,
      isFree,
      artistId,
      artistSlug,
    };

    return <MockAuthContext.Provider value={value}>{children}</MockAuthContext.Provider>;
  } catch (error) {
    console.error('[MockAuthProvider] Failed to initialize:', error);
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded">
        <p className="text-red-800 font-semibold">Mock Auth Error</p>
        <p className="text-red-600 text-sm">Failed to initialize mock authentication</p>
      </div>
    );
  }
}

export function useMockAuth() {
  return useContext(MockAuthContext);
}
