/**
 * Cleanup False Positive Instagram Handles
 *
 * Removes handles that are clearly not real Instagram accounts:
 * - Technical terms (context, graph, keyframes, font, etc.)
 * - Version numbers (3.6.1, 5.3.3, etc.)
 * - npm packages (fortawesome, formatjs, sentry, etc.)
 * - Domains (gmail.com, yahoo.com, etc.)
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: path.join(__dirname, '../../.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// ============================================================================
// False Positive Patterns
// ============================================================================

const FALSE_POSITIVE_HANDLES = new Set([
  // Technical/CSS/JS terms
  'context',
  'graph',
  'type',
  'media',
  'keyframes',
  'font',
  'charset',
  'supports',
  'import',
  'license',
  'domain.com.',
  'view',
  'vp',

  // npm packages
  'fortawesome',
  'formatjs',
  'sentry',
  'sentry.io',
  'sentry.wixpress.com',
  'wix',
  'shinsenter',
  'smcllns',

  // Domains/emails
  'gmail.com',
  'gmaili.com',
  'yahoo.com',
  'yahoo',
  'email.com',
  'inkcouturetattoos.com',
  'charleshuurman.com',
  'copperheadbodyart.com',
  'nogoodtattoo.com',
  'serenitytattoostudio.com',

  // Generic/ambiguous
  'debi',
]);

// Pattern matchers
const VERSION_NUMBER_PATTERN = /^\d+\.\d+\.\d+$/; // Matches 3.6.1, 5.3.3, etc.
const NUMERIC_ONLY_PATTERN = /^\d+$/; // Matches 400, 30, etc.
const GEO_COORDINATE_PATTERN = /^-?\d+\.\d{4,}$/; // Matches 30.2684553, -97.7403, etc.

function isFalsePositive(handle: string): boolean {
  // Check exact matches
  if (FALSE_POSITIVE_HANDLES.has(handle.toLowerCase())) {
    return true;
  }

  // Check version numbers
  if (VERSION_NUMBER_PATTERN.test(handle)) {
    return true;
  }

  // Check numeric only
  if (NUMERIC_ONLY_PATTERN.test(handle)) {
    return true;
  }

  // Check geo coordinates
  if (GEO_COORDINATE_PATTERN.test(handle)) {
    return true;
  }

  // Check if it ends with common domain extensions
  if (handle.endsWith('.com') || handle.endsWith('.net') || handle.endsWith('.org') || handle.endsWith('.io')) {
    return true;
  }

  return false;
}

// ============================================================================
// Cleanup Logic
// ============================================================================

async function cleanupFalsePositives() {
  console.log('🧹 Cleaning up false positive Instagram handles\n');

  // Get all artists from shop scraping
  const { data: artists, error } = await supabase
    .from('artists')
    .select('id, name, instagram_handle, discovery_source')
    .eq('discovery_source', 'shop_scraping');

  if (error) {
    console.error('Error fetching artists:', error.message);
    return;
  }

  if (!artists || artists.length === 0) {
    console.log('No shop-scraped artists found');
    return;
  }

  console.log(`Found ${artists.length} shop-scraped artists\n`);

  let deleted = 0;
  let kept = 0;

  for (const artist of artists) {
    if (isFalsePositive(artist.instagram_handle)) {
      // Delete this artist
      const { error: deleteError } = await supabase
        .from('artists')
        .delete()
        .eq('id', artist.id);

      if (deleteError) {
        console.error(`Error deleting @${artist.instagram_handle}:`, deleteError.message);
      } else {
        console.log(`❌ Deleted: @${artist.instagram_handle} (${artist.name})`);
        deleted++;
      }
    } else {
      kept++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ CLEANUP COMPLETE');
  console.log('='.repeat(60));
  console.log(`Total processed: ${artists.length}`);
  console.log(`Kept (valid): ${kept}`);
  console.log(`Deleted (false positives): ${deleted}`);
}

cleanupFalsePositives().catch(console.error);
