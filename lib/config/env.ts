import { z } from 'zod'

/**
 * Environment variable schema with validation
 * Validates required env vars at build/runtime
 */
const envSchema = z.object({
  // Supabase (Required)
  NEXT_PUBLIC_SUPABASE_URL: z.string().url('Invalid Supabase URL'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, 'Supabase anon key is required'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
  DATABASE_URL: z.string().url().optional(),

  // OpenAI (Optional - for embeddings)
  OPENAI_API_KEY: z.string().min(1).optional(),

  // Google APIs (Optional)
  GOOGLE_SEARCH_ENGINE_ID: z.string().optional(),
  GOOGLE_CUSTOM_SEARCH_API_KEY: z.string().optional(),
  GOOGLE_PLACES_API_KEY: z.string().optional(),

  // DataForSEO (Optional)
  DATAFORSEO_LOGIN: z.string().optional(),
  DATAFORSEO_PASSWORD: z.string().optional(),

  // Cloudflare R2 (Optional - for image storage)
  R2_ACCOUNT_ID: z.string().optional(),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_ENDPOINT: z.string().url().optional(),
  R2_PUBLIC_URL: z.string().url().optional(),

  // Instagram OAuth via Facebook (Phase 2)
  // Note: These are Facebook App credentials, not Instagram directly
  // Optional until Phase 2 OAuth flows are enabled
  INSTAGRAM_CLIENT_ID: z.string().optional(),
  INSTAGRAM_CLIENT_SECRET: z.string().optional(),
  NEXT_PUBLIC_INSTAGRAM_CLIENT_ID: z.string().optional(),

  // Apify (Optional - for Instagram scraping)
  // PAID account - heavy pipeline scraping (hashtag mining, follower mining, bulk scraper)
  APIFY_API_TOKEN: z.string().startsWith('apify_api_').optional(),
  // FREE account - lightweight operations (Pro auto-sync, profile searches)
  APIFY_API_TOKEN_FREE: z.string().startsWith('apify_api_').optional(),

  // Cloudflare Turnstile (Optional - for bot protection in Phase 4)
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: z.string().startsWith('0x').optional(),
  TURNSTILE_SECRET_KEY: z.string().startsWith('0x').optional(),

  // Google Analytics (Optional - for Phase 8)
  NEXT_PUBLIC_GA_MEASUREMENT_ID: z.string().regex(/^G-[A-Z0-9]+$/, 'Invalid GA4 Measurement ID (format: G-XXXXXXXXXX)').optional(),

  // App Configuration
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
})

/**
 * Validated environment variables
 * Throws detailed error if validation fails
 */
export const env = (() => {
  // On the client, only NEXT_PUBLIC_* vars are available
  // Use a more lenient parse that provides defaults for server-only vars
  const isServer = typeof window === 'undefined'

  try {
    if (isServer) {
      // Server: validate all required vars
      return envSchema.parse(process.env)
    } else {
      // Client: only validate NEXT_PUBLIC_* vars, make others optional
      const clientSchema = z.object({
        NEXT_PUBLIC_SUPABASE_URL: z.string().url('Invalid Supabase URL'),
        NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, 'Supabase anon key is required'),
        NEXT_PUBLIC_INSTAGRAM_CLIENT_ID: z.string().optional(),
        NEXT_PUBLIC_TURNSTILE_SITE_KEY: z.string().optional(),
        NEXT_PUBLIC_GA_MEASUREMENT_ID: z.string().optional(),
        NEXT_PUBLIC_APP_URL: z.string().optional(),
        NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
      })
      return clientSchema.parse(process.env) as z.infer<typeof envSchema>
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.errors.map(err => `  - ${err.path.join('.')}: ${err.message}`)
      throw new Error(
        `❌ Invalid environment variables:\n${missingVars.join('\n')}\n\nPlease check your .env.local file`
      )
    }
    throw error
  }
})()

// Type-safe env exports
export type Env = z.infer<typeof envSchema>

// Note: CLIENT_SECRET protection is handled by Next.js - server-only env vars
// are automatically excluded from client bundle. Double-check with:
// `npm run build` and verify INSTAGRAM_CLIENT_SECRET not in .next/static chunks
