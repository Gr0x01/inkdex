#!/usr/bin/env npx tsx
/**
 * Artist Color Profile Computation Script
 *
 * Aggregates image-level color classifications into artist-level profiles.
 * Calculates color_percentage = color_image_count / total_image_count
 *
 * Usage:
 *   npx tsx scripts/colors/compute-artist-color-profiles.ts
 *   npx tsx scripts/colors/compute-artist-color-profiles.ts --dry-run
 *   npx tsx scripts/colors/compute-artist-color-profiles.ts --artist-id <uuid>
 *
 * Options:
 *   --dry-run         Don't update DB, just show results
 *   --artist-id UUID  Process only specific artist (for testing)
 *   --clear           Clear existing profiles before running
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })
dotenv.config()

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

interface ArtistColorProfile {
  artist_id: string
  color_percentage: number
  color_image_count: number
  bw_image_count: number
  total_image_count: number
}

// Parse command line args
function parseArgs() {
  const args = process.argv.slice(2)
  let dryRun = false
  let artistId: string | null = null
  let clear = false

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--dry-run') {
      dryRun = true
    } else if (args[i] === '--artist-id' && args[i + 1]) {
      artistId = args[i + 1]
      i++
    } else if (args[i] === '--clear') {
      clear = true
    }
  }

  return { dryRun, artistId, clear }
}

async function main() {
  const { dryRun, artistId, clear } = parseArgs()

  console.log('='.repeat(60))
  console.log('Artist Color Profile Computation')
  console.log('='.repeat(60))
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}`)
  if (artistId) console.log(`Artist ID: ${artistId}`)
  console.log('')

  // Clear existing profiles if requested
  if (clear && !dryRun) {
    console.log('Clearing existing profiles...')
    const { error: clearError } = await supabase.from('artist_color_profiles').delete().neq('artist_id', '00000000-0000-0000-0000-000000000000')
    if (clearError) {
      console.error('Error clearing profiles:', clearError)
      process.exit(1)
    }
    console.log('Profiles cleared.')
    console.log('')
  }

  // Aggregate color data per artist using SQL
  console.log('Aggregating color data...')

  // Build query - aggregate is_color counts per artist
  let query = supabase.rpc('compute_artist_color_profiles_agg')

  // If that RPC doesn't exist, we'll do it manually
  // First, let's try a raw query approach
  const { data: aggregatedData, error: aggError } = await supabase
    .from('portfolio_images')
    .select('artist_id, is_color')
    .eq('status', 'active')
    .not('is_color', 'is', null)

  if (aggError) {
    console.error('Error fetching data:', aggError)
    process.exit(1)
  }

  if (!aggregatedData || aggregatedData.length === 0) {
    console.log('No images with color data found. Run analyze-image-colors.ts first.')
    return
  }

  console.log(`Found ${aggregatedData.length} images with color data`)

  // Aggregate in JavaScript
  const artistStats = new Map<
    string,
    { colorCount: number; bwCount: number; total: number }
  >()

  for (const image of aggregatedData) {
    if (!artistStats.has(image.artist_id)) {
      artistStats.set(image.artist_id, { colorCount: 0, bwCount: 0, total: 0 })
    }

    const stats = artistStats.get(image.artist_id)!
    stats.total++
    if (image.is_color) {
      stats.colorCount++
    } else {
      stats.bwCount++
    }
  }

  // Filter to specific artist if requested
  let artistIds = Array.from(artistStats.keys())
  if (artistId) {
    artistIds = artistIds.filter((id) => id === artistId)
  }

  console.log(`Computed profiles for ${artistIds.length} artists`)
  console.log('')

  // Build profiles
  const profiles: ArtistColorProfile[] = artistIds.map((id) => {
    const stats = artistStats.get(id)!
    return {
      artist_id: id,
      color_percentage: stats.total > 0 ? stats.colorCount / stats.total : 0,
      color_image_count: stats.colorCount,
      bw_image_count: stats.bwCount,
      total_image_count: stats.total,
    }
  })

  // Show distribution
  const colorHeavy = profiles.filter((p) => p.color_percentage >= 0.7).length
  const bwHeavy = profiles.filter((p) => p.color_percentage <= 0.3).length
  const mixed = profiles.length - colorHeavy - bwHeavy

  console.log('='.repeat(60))
  console.log('Distribution')
  console.log('='.repeat(60))
  console.log(`Color-heavy (>=70%): ${colorHeavy} artists (${((colorHeavy / profiles.length) * 100).toFixed(1)}%)`)
  console.log(`B&G-heavy (<=30%): ${bwHeavy} artists (${((bwHeavy / profiles.length) * 100).toFixed(1)}%)`)
  console.log(`Mixed (30-70%): ${mixed} artists (${((mixed / profiles.length) * 100).toFixed(1)}%)`)
  console.log('')

  // Update database
  if (!dryRun && profiles.length > 0) {
    console.log('Updating database...')

    const BATCH_SIZE = 500
    for (let i = 0; i < profiles.length; i += BATCH_SIZE) {
      const batch = profiles.slice(i, i + BATCH_SIZE)

      const { error: upsertError } = await supabase
        .from('artist_color_profiles')
        .upsert(
          batch.map((p) => ({
            artist_id: p.artist_id,
            color_percentage: p.color_percentage,
            color_image_count: p.color_image_count,
            bw_image_count: p.bw_image_count,
            total_image_count: p.total_image_count,
            updated_at: new Date().toISOString(),
          })),
          { onConflict: 'artist_id' }
        )

      if (upsertError) {
        console.error('Error upserting profiles:', upsertError)
        process.exit(1)
      }

      console.log(`  Upserted ${Math.min(i + BATCH_SIZE, profiles.length)}/${profiles.length}`)
    }

    console.log('Database updated successfully!')
  } else if (dryRun) {
    console.log('DRY RUN - No database changes made')

    // Show sample results
    console.log('')
    console.log('Sample profiles:')
    const samples = profiles
      .sort((a, b) => b.color_percentage - a.color_percentage)
      .slice(0, 5)
    for (const profile of samples) {
      console.log(
        `  ${profile.artist_id.slice(0, 8)}... | ${(profile.color_percentage * 100).toFixed(0)}% color | ${profile.color_image_count}c/${profile.bw_image_count}bw/${profile.total_image_count}total`
      )
    }

    console.log('')
    console.log('Most B&G-heavy:')
    const bwSamples = profiles
      .sort((a, b) => a.color_percentage - b.color_percentage)
      .slice(0, 5)
    for (const profile of bwSamples) {
      console.log(
        `  ${profile.artist_id.slice(0, 8)}... | ${(profile.color_percentage * 100).toFixed(0)}% color | ${profile.color_image_count}c/${profile.bw_image_count}bw/${profile.total_image_count}total`
      )
    }
  }
}

main().catch(console.error)
