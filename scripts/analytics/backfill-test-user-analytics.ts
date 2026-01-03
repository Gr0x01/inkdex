#!/usr/bin/env tsx
/**
 * Backfill Analytics Data for Pro Test User
 *
 * Generates realistic sample analytics data for Morgan Black (Pro test user)
 * for the past 30 days to demonstrate the analytics dashboard.
 *
 * Usage: npx tsx scripts/analytics/backfill-test-user-analytics.ts
 */

import { config } from 'dotenv'
import { resolve } from 'path'
import { createClient } from '@supabase/supabase-js'

// Load .env.local
config({ path: resolve(process.cwd(), '.env.local') })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Morgan Black (Pro test user)
const PRO_TEST_ARTIST_ID = '2ed1bfaa-a0e9-4025-a1ba-797e0f0830fa'
const DAYS_TO_BACKFILL = 30

interface DailyMetrics {
  date: string
  profileViews: number
  imageViews: number
  instagramClicks: number
  bookingClicks: number
  searchAppearances: number
}

/**
 * Generate realistic daily metrics with:
 * - Weekend dips (lower traffic on Sat/Sun)
 * - Gradual upward trend (simulating growth)
 * - Natural variance (randomness)
 */
function generateDailyMetrics(daysAgo: number): DailyMetrics {
  const date = new Date()
  date.setDate(date.getDate() - daysAgo)
  const dayOfWeek = date.getDay() // 0 = Sunday, 6 = Saturday

  // Base metrics (increase as we get closer to today)
  const growthFactor = 1 + (DAYS_TO_BACKFILL - daysAgo) / DAYS_TO_BACKFILL * 0.5 // 0-50% growth
  const weekendFactor = (dayOfWeek === 0 || dayOfWeek === 6) ? 0.6 : 1.0 // 40% drop on weekends

  // Random variance ±20%
  const variance = () => 0.8 + Math.random() * 0.4

  // Base daily metrics
  const baseProfileViews = 25
  const baseSearchAppearances = 40
  const baseImageViews = 60
  const baseInstagramClicks = 8
  const baseBookingClicks = 3

  return {
    date: date.toISOString().split('T')[0],
    profileViews: Math.round(baseProfileViews * growthFactor * weekendFactor * variance()),
    imageViews: Math.round(baseImageViews * growthFactor * weekendFactor * variance()),
    instagramClicks: Math.round(baseInstagramClicks * growthFactor * weekendFactor * variance()),
    bookingClicks: Math.round(baseBookingClicks * growthFactor * weekendFactor * variance()),
    searchAppearances: Math.round(baseSearchAppearances * growthFactor * weekendFactor * variance()),
  }
}

/**
 * Distribute image views across portfolio images
 * Top 3 images get 60% of views, rest split remaining 40%
 */
function distributeImageViews(
  totalImageViews: number,
  imageIds: string[]
): Map<string, number> {
  const distribution = new Map<string, number>()

  if (imageIds.length === 0) return distribution

  // Shuffle images for variety
  const shuffled = [...imageIds].sort(() => Math.random() - 0.5)

  if (shuffled.length <= 3) {
    // Few images: split evenly with slight variance
    shuffled.forEach((id) => {
      distribution.set(id, Math.round(totalImageViews / shuffled.length * (0.8 + Math.random() * 0.4)))
    })
  } else {
    // Many images: top 3 get 60%, rest get 40%
    const top3Views = Math.round(totalImageViews * 0.6)
    const remainingViews = totalImageViews - top3Views

    // Top 3 images
    for (let i = 0; i < 3; i++) {
      distribution.set(shuffled[i], Math.round(top3Views / 3 * (0.8 + Math.random() * 0.4)))
    }

    // Remaining images
    const restCount = shuffled.length - 3
    for (let i = 3; i < shuffled.length; i++) {
      distribution.set(shuffled[i], Math.round(remainingViews / restCount * (0.5 + Math.random() * 1.0)))
    }
  }

  return distribution
}

async function main() {
  console.log('🎨 Backfilling Analytics for Pro Test User (Morgan Black)')
  console.log('=' .repeat(60))

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { persistSession: false },
  })

  // 1. Verify artist exists
  const { data: artist, error: artistError } = await supabase
    .from('artists')
    .select('id, name, is_pro')
    .eq('id', PRO_TEST_ARTIST_ID)
    .single()

  if (artistError || !artist) {
    console.error('❌ Error: Pro test artist not found')
    console.error(artistError)
    process.exit(1)
  }

  console.log(`✓ Found artist: ${artist.name} (Pro: ${artist.is_pro})`)

  // 2. Get portfolio images
  const { data: images, error: imagesError } = await supabase
    .from('portfolio_images')
    .select('id')
    .eq('artist_id', PRO_TEST_ARTIST_ID)

  if (imagesError) {
    console.error('❌ Error fetching portfolio images:', imagesError)
    process.exit(1)
  }

  const imageIds = images?.map((img) => img.id) || []
  console.log(`✓ Found ${imageIds.length} portfolio images`)

  if (imageIds.length === 0) {
    console.warn('⚠️  Warning: No portfolio images found. Only creating artist-level analytics.')
  }

  // 3. Delete existing analytics data (clean slate)
  console.log('\n🧹 Cleaning existing analytics data...')

  const { error: deleteArtistAnalytics } = await supabase
    .from('artist_analytics')
    .delete()
    .eq('artist_id', PRO_TEST_ARTIST_ID)

  const { error: deleteImageAnalytics } = await supabase
    .from('portfolio_image_analytics')
    .delete()
    .eq('artist_id', PRO_TEST_ARTIST_ID)

  if (deleteArtistAnalytics || deleteImageAnalytics) {
    console.error('❌ Error deleting existing data:', deleteArtistAnalytics || deleteImageAnalytics)
    process.exit(1)
  }

  console.log('✓ Cleaned existing data')

  // 4. Generate and insert analytics data
  console.log(`\n📊 Generating ${DAYS_TO_BACKFILL} days of analytics data...`)

  const artistAnalytics = []
  const imageAnalytics = []

  for (let daysAgo = DAYS_TO_BACKFILL - 1; daysAgo >= 0; daysAgo--) {
    const metrics = generateDailyMetrics(daysAgo)

    // Artist-level analytics
    artistAnalytics.push({
      artist_id: PRO_TEST_ARTIST_ID,
      date: metrics.date,
      profile_views: metrics.profileViews,
      image_views: metrics.imageViews,
      instagram_clicks: metrics.instagramClicks,
      booking_link_clicks: metrics.bookingClicks,
      search_appearances: metrics.searchAppearances,
    })

    // Image-level analytics (distribute views)
    if (imageIds.length > 0) {
      const imageViewDistribution = distributeImageViews(metrics.imageViews, imageIds)

      imageViewDistribution.forEach((viewCount, imageId) => {
        if (viewCount > 0) {
          imageAnalytics.push({
            artist_id: PRO_TEST_ARTIST_ID,
            image_id: imageId,
            date: metrics.date,
            view_count: viewCount,
          })
        }
      })
    }
  }

  // 5. Insert artist analytics
  const { error: insertArtistError } = await supabase
    .from('artist_analytics')
    .insert(artistAnalytics)

  if (insertArtistError) {
    console.error('❌ Error inserting artist analytics:', insertArtistError)
    process.exit(1)
  }

  console.log(`✓ Inserted ${artistAnalytics.length} artist analytics records`)

  // 6. Insert image analytics
  if (imageAnalytics.length > 0) {
    // Batch insert in chunks of 500 (PostgREST limit)
    const chunkSize = 500
    for (let i = 0; i < imageAnalytics.length; i += chunkSize) {
      const chunk = imageAnalytics.slice(i, i + chunkSize)
      const { error: insertImageError } = await supabase
        .from('portfolio_image_analytics')
        .insert(chunk)

      if (insertImageError) {
        console.error(`❌ Error inserting image analytics (chunk ${i / chunkSize + 1}):`, insertImageError)
        process.exit(1)
      }
    }

    console.log(`✓ Inserted ${imageAnalytics.length} image analytics records`)
  }

  // 7. Calculate totals
  const totalProfileViews = artistAnalytics.reduce((sum, row) => sum + row.profile_views, 0)
  const totalImageViews = artistAnalytics.reduce((sum, row) => sum + row.image_views, 0)
  const totalInstagramClicks = artistAnalytics.reduce((sum, row) => sum + row.instagram_clicks, 0)
  const totalBookingClicks = artistAnalytics.reduce((sum, row) => sum + row.booking_link_clicks, 0)
  const totalSearchAppearances = artistAnalytics.reduce((sum, row) => sum + row.search_appearances, 0)

  console.log('\n✅ Backfill Complete!')
  console.log('=' .repeat(60))
  console.log(`📈 Total Stats (${DAYS_TO_BACKFILL} days):`)
  console.log(`   • Profile Views: ${totalProfileViews.toLocaleString()}`)
  console.log(`   • Image Views: ${totalImageViews.toLocaleString()}`)
  console.log(`   • Instagram Clicks: ${totalInstagramClicks.toLocaleString()}`)
  console.log(`   • Booking Clicks: ${totalBookingClicks.toLocaleString()}`)
  console.log(`   • Search Appearances: ${totalSearchAppearances.toLocaleString()}`)
  console.log(`   • Images Tracked: ${imageIds.length}`)
  console.log('\n🎯 You can now view the analytics at:')
  console.log('   http://localhost:3000/dev/login → Pro Tier Artist (Morgan Black) → Dashboard')
}

main().catch((error) => {
  console.error('💥 Fatal error:', error)
  process.exit(1)
})
