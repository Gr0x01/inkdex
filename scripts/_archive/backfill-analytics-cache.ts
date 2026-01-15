#!/usr/bin/env npx tsx
/**
 * Backfill Analytics Cache from existing artist_analytics table
 *
 * This script populates the analytics_cache table with aggregated data
 * from the existing artist_analytics table. Run this once during migration.
 *
 * Usage: npx tsx scripts/maintenance/backfill-analytics-cache.ts
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

interface AggregatedAnalytics {
  artist_id: string
  period: '7d' | '30d' | '90d' | 'all'
  profile_views: number
  image_views: number
  instagram_clicks: number
  booking_clicks: number
  search_appearances: number
}

async function backfillAnalyticsCache() {
  console.log('🚀 Starting analytics cache backfill...')

  // Get all unique artist IDs from artist_analytics
  const { data: artistIds, error: artistError } = await supabase
    .from('artist_analytics')
    .select('artist_id')
    .not('artist_id', 'is', null)

  if (artistError) {
    console.error('Failed to fetch artist IDs:', artistError)
    process.exit(1)
  }

  // Deduplicate artist IDs
  const uniqueArtistIds = [...new Set(artistIds.map(a => a.artist_id))]
  console.log(`📊 Found ${uniqueArtistIds.length} artists with analytics data`)

  // Define period configurations
  const periods: { name: '7d' | '30d' | '90d' | 'all'; days: number | null }[] = [
    { name: '7d', days: 7 },
    { name: '30d', days: 30 },
    { name: '90d', days: 90 },
    { name: 'all', days: null }, // null = no date filter
  ]

  const now = new Date()
  const batchSize = 100
  let totalInserted = 0
  let totalErrors = 0

  // Process artists in batches
  for (let i = 0; i < uniqueArtistIds.length; i += batchSize) {
    const batch = uniqueArtistIds.slice(i, i + batchSize)
    const cacheRows: AggregatedAnalytics[] = []

    for (const artistId of batch) {
      for (const period of periods) {
        // Build date filter
        let dateFilter: string | null = null
        if (period.days !== null) {
          const cutoffDate = new Date(now)
          cutoffDate.setDate(cutoffDate.getDate() - period.days)
          dateFilter = cutoffDate.toISOString().split('T')[0]
        }

        // Query aggregated data for this artist and period
        let query = supabase
          .from('artist_analytics')
          .select('profile_views, image_views, instagram_clicks, booking_link_clicks, search_appearances')
          .eq('artist_id', artistId)

        if (dateFilter) {
          query = query.gte('date', dateFilter)
        }

        const { data: analytics, error: queryError } = await query

        if (queryError) {
          console.error(`Error fetching analytics for ${artistId}:`, queryError)
          totalErrors++
          continue
        }

        // Aggregate the metrics
        const aggregated = (analytics || []).reduce(
          (acc, row) => ({
            profile_views: acc.profile_views + (row.profile_views || 0),
            image_views: acc.image_views + (row.image_views || 0),
            instagram_clicks: acc.instagram_clicks + (row.instagram_clicks || 0),
            booking_clicks: acc.booking_clicks + (row.booking_link_clicks || 0),
            search_appearances: acc.search_appearances + (row.search_appearances || 0),
          }),
          { profile_views: 0, image_views: 0, instagram_clicks: 0, booking_clicks: 0, search_appearances: 0 }
        )

        // Only create row if there's any data
        const hasData = Object.values(aggregated).some(v => v > 0)
        if (hasData) {
          cacheRows.push({
            artist_id: artistId,
            period: period.name,
            ...aggregated,
          })
        }
      }
    }

    // Upsert batch to analytics_cache
    if (cacheRows.length > 0) {
      const { error: upsertError } = await supabase
        .from('analytics_cache')
        .upsert(
          cacheRows.map(row => ({
            ...row,
            sync_source: 'backfill',
            last_synced_at: new Date().toISOString(),
          })),
          { onConflict: 'artist_id,period' }
        )

      if (upsertError) {
        console.error('Upsert error:', upsertError)
        totalErrors += cacheRows.length
      } else {
        totalInserted += cacheRows.length
      }
    }

    // Progress update
    const progress = Math.min(100, Math.round(((i + batch.length) / uniqueArtistIds.length) * 100))
    process.stdout.write(`\r⏳ Progress: ${progress}% (${i + batch.length}/${uniqueArtistIds.length} artists)`)
  }

  console.log('\n')
  console.log('✅ Backfill complete!')
  console.log(`   📊 Rows inserted/updated: ${totalInserted}`)
  console.log(`   ❌ Errors: ${totalErrors}`)

  // Verify the results
  const { count } = await supabase
    .from('analytics_cache')
    .select('*', { count: 'exact', head: true })

  console.log(`   📈 Total rows in analytics_cache: ${count}`)
}

// Run the backfill
backfillAnalyticsCache().catch(console.error)
