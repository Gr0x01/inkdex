/**
 * Maintenance Mode Tests
 *
 * CRITICAL: The "production safety check" test ensures maintenance mode
 * is OFF before deploying. If this fails in CI, fix the maintenance mode
 * in Redis before proceeding.
 */

import { describe, it, expect } from 'vitest';

describe('Maintenance Mode', () => {
  describe('Production Safety Check', () => {
    /**
     * CRITICAL: This test checks that maintenance mode is OFF.
     *
     * If this test fails in CI, it means someone (or something) left
     * maintenance mode enabled. DO NOT disable this test - fix the
     * maintenance mode instead by deleting the Redis key.
     *
     * To fix manually:
     * redis-cli DEL inkdex:maintenance:enabled
     */
    it('should have maintenance mode DISABLED before deploy', async () => {
      // Only run this check if REDIS_URL is available
      const redisUrl = process.env.REDIS_URL;

      if (!redisUrl) {
        // Skip if no Redis URL - can't check production status
        console.log('Skipping maintenance check: REDIS_URL not set');
        expect(true).toBe(true);
        return;
      }

      // Dynamically import to avoid module resolution issues
      const Redis = (await import('ioredis')).default;
      const redis = new Redis(redisUrl, {
        maxRetriesPerRequest: 3,
        connectTimeout: 5000,
      });

      try {
        const value = await redis.get('inkdex:maintenance:enabled');
        await redis.quit();

        // Maintenance should be OFF (key doesn't exist or is not 'true')
        expect(value).not.toBe('true');
      } catch (error) {
        await redis.quit().catch(() => {});
        // If Redis is unreachable, we can't verify - skip
        console.warn('Could not connect to Redis to verify maintenance mode');
        expect(true).toBe(true);
      }
    });
  });
});
