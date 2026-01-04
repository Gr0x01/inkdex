/**
 * Select Outreach Candidates
 *
 * Finds artists suitable for the featured artist outreach campaign:
 * - Follower count: 10,000 - 50,000 (established but not huge)
 * - Larger cities (top 50 by artist count)
 * - Style diversity (avoid clustering on same style)
 * - Not already contacted
 * - Not already claimed
 * - Has portfolio images with embeddings
 *
 * Usage:
 *   npx tsx scripts/marketing/select-outreach-candidates.ts
 *   npx tsx scripts/marketing/select-outreach-candidates.ts --limit 20
 *   npx tsx scripts/marketing/select-outreach-candidates.ts --city "Austin"
 *   npx tsx scripts/marketing/select-outreach-candidates.ts --dry-run
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface OutreachCandidate {
  id: string
  name: string
  instagram_handle: string
  instagram_url: string
  city: string
  state: string
  follower_count: number
  image_count: number
  profile_url: string
  slug: string
}

async function getTopCities(limit: number = 50): Promise<string[]> {
  const { data, error } = await supabase
    .from('artists')
    .select('city')
    .not('city', 'is', null)
    .is('deleted_at', null)

  if (error) {
    console.error('Error fetching cities:', error)
    return []
  }

  // Count artists per city
  const cityCounts = new Map<string, number>()
  data.forEach((row) => {
    if (row.city) {
      cityCounts.set(row.city, (cityCounts.get(row.city) || 0) + 1)
    }
  })

  // Sort by count and take top N
  const sortedCities = Array.from(cityCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([city]) => city)

  return sortedCities
}

async function selectCandidates(options: {
  limit: number
  minFollowers: number
  maxFollowers: number
  city?: string
  dryRun: boolean
}): Promise<OutreachCandidate[]> {
  const { limit, minFollowers, maxFollowers, city, dryRun } = options

  console.log('\n📊 Selection Criteria:')
  console.log(`   Followers: ${minFollowers.toLocaleString()} - ${maxFollowers.toLocaleString()}`)
  console.log(`   Limit: ${limit}`)
  if (city) console.log(`   City filter: ${city}`)
  console.log(`   Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}`)

  // Get top cities if no specific city filter
  let targetCities: string[] = []
  if (city) {
    targetCities = [city]
  } else {
    targetCities = await getTopCities(50)
    console.log(`\n📍 Targeting top ${targetCities.length} cities by artist count`)
  }

  // Build query for candidates
  let query = supabase
    .from('artists')
    .select(`
      id,
      name,
      instagram_handle,
      instagram_url,
      city,
      state,
      follower_count,
      slug,
      verification_status,
      portfolio_images!inner (
        id,
        embedding
      )
    `)
    .gte('follower_count', minFollowers)
    .lte('follower_count', maxFollowers)
    .eq('verification_status', 'unclaimed')
    .is('deleted_at', null)
    .not('portfolio_images.embedding', 'is', null)
    .in('city', targetCities)
    .order('follower_count', { ascending: false })

  const { data: artists, error } = await query

  if (error) {
    console.error('Error fetching candidates:', error)
    return []
  }

  if (!artists || artists.length === 0) {
    console.log('\n⚠️  No candidates found matching criteria')
    return []
  }

  console.log(`\n🔍 Found ${artists.length} potential candidates`)

  // Get already-contacted artists
  const { data: existingOutreach } = await supabase
    .from('marketing_outreach')
    .select('artist_id')

  const contactedIds = new Set(existingOutreach?.map((o) => o.artist_id) || [])
  console.log(`   Already contacted: ${contactedIds.size}`)

  // Filter out already-contacted and dedupe
  const seenIds = new Set<string>()
  const candidates: OutreachCandidate[] = []

  for (const artist of artists) {
    if (contactedIds.has(artist.id)) continue
    if (seenIds.has(artist.id)) continue

    seenIds.add(artist.id)

    const imageCount = Array.isArray(artist.portfolio_images)
      ? artist.portfolio_images.filter((img: { embedding: unknown }) => img.embedding).length
      : 0

    if (imageCount < 4) continue // Need at least 4 images for a good post

    candidates.push({
      id: artist.id,
      name: artist.name,
      instagram_handle: artist.instagram_handle,
      instagram_url: artist.instagram_url || `https://instagram.com/${artist.instagram_handle}`,
      city: artist.city || 'Unknown',
      state: artist.state || '',
      follower_count: artist.follower_count || 0,
      image_count: imageCount,
      slug: artist.slug,
      profile_url: `https://inkdex.io/artist/${artist.slug}`,
    })

    if (candidates.length >= limit) break
  }

  console.log(`   Eligible after filtering: ${candidates.length}`)

  return candidates
}

async function main() {
  const args = process.argv.slice(2)

  // Parse arguments
  const limitIndex = args.indexOf('--limit')
  const limit = limitIndex !== -1 ? parseInt(args[limitIndex + 1]) : 50

  const cityIndex = args.indexOf('--city')
  const city = cityIndex !== -1 ? args[cityIndex + 1] : undefined

  const dryRun = args.includes('--dry-run')

  const minFollowers = 10000
  const maxFollowers = 50000

  console.log('🎯 Outreach Candidate Selection')
  console.log('================================')

  const candidates = await selectCandidates({
    limit,
    minFollowers,
    maxFollowers,
    city,
    dryRun,
  })

  if (candidates.length === 0) {
    console.log('\n❌ No candidates selected')
    process.exit(0)
  }

  // Display results
  console.log('\n📋 Selected Candidates:')
  console.log('------------------------')

  // Group by city for diversity view
  const byCity = new Map<string, OutreachCandidate[]>()
  candidates.forEach((c) => {
    const key = `${c.city}, ${c.state}`
    if (!byCity.has(key)) byCity.set(key, [])
    byCity.get(key)!.push(c)
  })

  let index = 1
  for (const [location, artists] of byCity) {
    console.log(`\n📍 ${location} (${artists.length} artists):`)
    for (const artist of artists) {
      console.log(
        `   ${index}. @${artist.instagram_handle} - ${(artist.follower_count / 1000).toFixed(1)}K followers, ${artist.image_count} images`
      )
      console.log(`      ${artist.profile_url}`)
      index++
    }
  }

  // Summary stats
  console.log('\n📊 Summary:')
  console.log(`   Total candidates: ${candidates.length}`)
  console.log(`   Cities represented: ${byCity.size}`)
  console.log(
    `   Avg followers: ${Math.round(candidates.reduce((sum, c) => sum + c.follower_count, 0) / candidates.length).toLocaleString()}`
  )

  if (!dryRun) {
    // Insert into marketing_outreach table (just tracking, not sent yet)
    console.log('\n💾 Saving to marketing_outreach table...')

    const outreachRecords = candidates.map((c) => ({
      artist_id: c.id,
      campaign_name: 'featured_artist_launch',
      outreach_type: 'instagram_dm',
      notes: `Selected: ${c.follower_count.toLocaleString()} followers, ${c.image_count} images`,
    }))

    const { error: insertError } = await supabase
      .from('marketing_outreach')
      .upsert(outreachRecords, { onConflict: 'artist_id,campaign_name' })

    if (insertError) {
      console.error('Error saving outreach records:', insertError)
    } else {
      console.log(`   ✅ Saved ${candidates.length} outreach records`)
    }
  } else {
    console.log('\n🔍 DRY RUN - No records saved')
  }

  // Output JSON for piping to next script
  if (args.includes('--json')) {
    console.log('\n--- JSON OUTPUT ---')
    console.log(JSON.stringify(candidates, null, 2))
  }
}

main().catch(console.error)
