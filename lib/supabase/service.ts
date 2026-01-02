/**
 * Supabase Service Role Client
 * Used for server-side operations that need to bypass RLS policies
 * WARNING: Only use this for trusted server-side code!
 */

import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'

// Ensure service client is never used on client-side
if (typeof window !== 'undefined') {
  throw new Error('Service client cannot be used on client-side')
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('[CRITICAL] Missing Supabase environment variables:', {
    hasUrl: !!supabaseUrl,
    hasServiceKey: !!supabaseServiceKey,
  })
  throw new Error('Server configuration error - contact support')
}

/**
 * Create a Supabase client with service role key
 * This bypasses RLS policies - use only for trusted server-side operations
 */
export function createServiceClient() {
  // Type assertion safe here because we validated above
  return createClient<Database>(supabaseUrl!, supabaseServiceKey!, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
