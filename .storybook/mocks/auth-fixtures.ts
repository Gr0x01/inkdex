import type { MockAuthUser } from './auth-provider';
import { TEST_USERS } from '@/lib/dev/test-users';

export const MOCK_AUTH_STATES = {
  LOGGED_OUT: {
    user: null,
    accountType: null,
  },

  FAN: {
    user: {
      id: 'mock-fan-user-id',
      email: 'fan@example.com',
      user_metadata: {},
    } as MockAuthUser,
    accountType: 'fan' as const,
  },

  UNCLAIMED_ARTIST: {
    user: {
      id: TEST_USERS.UNCLAIMED.id,
      email: TEST_USERS.UNCLAIMED.email,
      user_metadata: {
        instagram_username: TEST_USERS.UNCLAIMED.instagram_username,
        instagram_id: TEST_USERS.UNCLAIMED.instagram_id,
      },
    } as MockAuthUser,
    accountType: 'fan' as const,
    artistId: TEST_USERS.UNCLAIMED.artist?.id,
    artistSlug: TEST_USERS.UNCLAIMED.artist?.slug,
  },

  FREE_ARTIST: {
    user: {
      id: TEST_USERS.FREE.id,
      email: TEST_USERS.FREE.email,
      user_metadata: {
        instagram_username: TEST_USERS.FREE.instagram_username,
        instagram_id: TEST_USERS.FREE.instagram_id,
      },
    } as MockAuthUser,
    accountType: 'artist_free' as const,
    artistId: TEST_USERS.FREE.artist?.id,
    artistSlug: TEST_USERS.FREE.artist?.slug,
  },

  PRO_ARTIST: {
    user: {
      id: TEST_USERS.PRO.id,
      email: TEST_USERS.PRO.email,
      user_metadata: {
        instagram_username: TEST_USERS.PRO.instagram_username,
        instagram_id: TEST_USERS.PRO.instagram_id,
      },
    } as MockAuthUser,
    accountType: 'artist_pro' as const,
    artistId: TEST_USERS.PRO.artist?.id,
    artistSlug: TEST_USERS.PRO.artist?.slug,
  },
} as const;

export const AUTH_STATE_OPTIONS = [
  { label: 'Logged Out', value: 'LOGGED_OUT' },
  { label: 'Fan (Logged In)', value: 'FAN' },
  { label: 'Unclaimed Artist', value: 'UNCLAIMED_ARTIST' },
  { label: 'Free Tier Artist', value: 'FREE_ARTIST' },
  { label: 'Pro Tier Artist', value: 'PRO_ARTIST' },
] as const;
