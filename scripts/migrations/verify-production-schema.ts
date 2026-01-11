#!/usr/bin/env npx tsx
/**
 * Verify Production Schema
 *
 * Compares expected functions and tables from codebase against production database.
 * Run this BEFORE deploying to catch missing schema objects.
 *
 * Usage:
 *   npx tsx scripts/migrations/verify-production-schema.ts
 *   npx tsx scripts/migrations/verify-production-schema.ts --fix  # Output SQL to fix
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Expected functions (from codebase RPC calls)
// Updated after db-consolidation: location functions consolidated into get_location_counts,
// increment functions consolidated into increment_analytics
const EXPECTED_FUNCTIONS = [
  'can_receive_email',
  'check_email_rate_limit',
  'claim_artist_profile',
  'count_artists_without_images',
  'create_pipeline_run',
  'get_artist_by_handle',
  'get_artist_portfolio',
  'get_artist_stats',
  'get_artist_tier_counts',
  'get_artists_with_image_counts',
  'get_homepage_stats',
  'get_location_counts',        // Consolidated: replaces 5 location functions
  'get_mining_city_distribution',
  'get_mining_stats',
  'get_recent_search_appearances',
  'get_search_location_counts',
  'get_top_artists_by_style',
  'increment_analytics',        // Consolidated: replaces 4 increment functions
  'log_email_send',
  'search_artists',
  'sync_artist_to_locations',
  'track_search_appearances_with_details',
  'unsubscribe_from_emails',
  'update_artist_locations',
  'update_artist_pipeline_on_embedding',
  'user_has_vault_tokens',
  'vault_create_secret',
  'vault_delete_secret',
  'vault_get_decrypted_secret',
  'vault_update_secret',
];

// Expected tables (from codebase .from() calls)
const EXPECTED_TABLES = [
  'artist_analytics',
  'artist_locations',
  'artist_pipeline_state',
  'artist_recommendations',
  'artist_style_profiles',
  'artist_subscriptions',
  'artist_sync_state',
  'artists',
  'claim_attempts',
  'country_editorial_content',
  'discovery_queries',
  'email_log',
  'email_preferences',
  'image_style_tags',
  'locations',
  'marketing_outreach',
  'onboarding_sessions',
  'pipeline_jobs',
  'portfolio_image_analytics',
  'portfolio_images',
  'promo_codes',
  'saved_artists',
  'search_appearances',
  'searches',
  'style_seeds',
  'style_training_labels',
  'unified_audit_log',
  'users',
];

async function checkFunctions(): Promise<string[]> {
  const { data, error } = await supabase.rpc('exec_sql', {
    query: `
      SELECT proname as name
      FROM pg_proc
      WHERE pronamespace = 'public'::regnamespace
    `
  });

  if (error) {
    // Fallback: try direct query
    const { data: fallbackData } = await supabase
      .from('pg_proc')
      .select('proname');

    if (!fallbackData) {
      console.error('Could not query functions. Run this SQL in Supabase SQL Editor:');
      console.log(`
SELECT proname FROM pg_proc WHERE pronamespace = 'public'::regnamespace;
      `);
      return [];
    }
  }

  const existingFunctions = new Set((data || []).map((r: { name: string }) => r.name));
  return EXPECTED_FUNCTIONS.filter(f => !existingFunctions.has(f));
}

async function checkTables(): Promise<string[]> {
  const { data, error } = await supabase
    .from('information_schema.tables' as never)
    .select('table_name')
    .eq('table_schema', 'public');

  if (error) {
    console.error('Could not query tables:', error.message);
    return [];
  }

  const existingTables = new Set((data || []).map((r: { table_name: string }) => r.table_name));
  return EXPECTED_TABLES.filter(t => !existingTables.has(t));
}

async function main() {
  console.log('🔍 Verifying production schema...\n');

  // For now, just output the SQL to check manually
  console.log('Run these queries in Supabase SQL Editor:\n');

  console.log('-- Check missing FUNCTIONS:');
  console.log(`
WITH expected AS (
  SELECT unnest(ARRAY[
    ${EXPECTED_FUNCTIONS.map(f => `'${f}'`).join(',\n    ')}
  ]) AS name
),
existing AS (
  SELECT proname AS name FROM pg_proc WHERE pronamespace = 'public'::regnamespace
)
SELECT e.name AS missing_function
FROM expected e
LEFT JOIN existing x ON e.name = x.name
WHERE x.name IS NULL
ORDER BY e.name;
`);

  console.log('\n-- Check missing TABLES:');
  console.log(`
WITH expected AS (
  SELECT unnest(ARRAY[
    ${EXPECTED_TABLES.map(t => `'${t}'`).join(',\n    ')}
  ]) AS name
),
existing AS (
  SELECT table_name AS name FROM information_schema.tables WHERE table_schema = 'public'
)
SELECT e.name AS missing_table
FROM expected e
LEFT JOIN existing x ON e.name = x.name
WHERE x.name IS NULL
ORDER BY e.name;
`);

  console.log('\n✅ Copy and run the above queries to check for missing schema objects.');
  console.log('📋 If any are missing, find them in supabase/migrations/00000000000000_baseline.sql');
}

main().catch(console.error);
