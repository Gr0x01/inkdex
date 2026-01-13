/**
 * Find Style Matches for Marketing
 *
 * Finds groups of 4+ artists with similar portfolio styles for Instagram story content.
 * This showcases Inkdex's unique ability to find visually similar artists.
 *
 * Usage:
 *   # Find artists similar to a specific artist (by slug)
 *   npx tsx scripts/marketing/find-style-matches.ts --artist inkbylisa
 *
 *   # Filter by follower count
 *   npx tsx scripts/marketing/find-style-matches.ts --artist inkbylisa --min-followers 10000 --max-followers 100000
 *
 *   # Find random seed from a style, then find matches
 *   npx tsx scripts/marketing/find-style-matches.ts --style fine-line --min-followers 50000
 *
 *   # Just "more than X" followers
 *   npx tsx scripts/marketing/find-style-matches.ts --artist inkbylisa --min-followers 100000
 *
 *   # Show more matches (default 4)
 *   npx tsx scripts/marketing/find-style-matches.ts --artist inkbylisa --matches 8
 *
 *   # Browse artists in a follower range, pick one interactively
 *   npx tsx scripts/marketing/find-style-matches.ts --browse --min-followers 50000 --max-followers 200000
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as readline from 'readline'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface Artist {
  id: string
  name: string
  slug: string
  instagram_handle: string
  follower_count: number
  city: string
  state: string
  profile_url: string
  image_count: number
  top_styles: string[]
}

interface SimilarArtist extends Artist {
  similarity: number
}

async function getArtistBySlug(slug: string): Promise<Artist | null> {
  const { data, error } = await supabase
    .from('artists')
    .select(`
      id,
      name,
      slug,
      instagram_handle,
      follower_count,
      portfolio_images!inner (id, embedding)
    `)
    .eq('slug', slug)
    .is('deleted_at', null)
    .single()

  if (error || !data) return null

  // Get location
  const { data: location } = await supabase
    .from('artist_locations')
    .select('city, region')
    .eq('artist_id', data.id)
    .eq('is_primary', true)
    .single()

  // Get top styles
  const { data: styles } = await supabase
    .from('artist_style_profiles')
    .select('style_name, percentage')
    .eq('artist_id', data.id)
    .order('percentage', { ascending: false })
    .limit(3)

  const imageCount = Array.isArray(data.portfolio_images)
    ? data.portfolio_images.filter((img: { embedding: unknown }) => img.embedding).length
    : 0

  return {
    id: data.id,
    name: data.name,
    slug: data.slug,
    instagram_handle: data.instagram_handle,
    follower_count: data.follower_count || 0,
    city: location?.city || '',
    state: location?.region || '',
    profile_url: `https://inkdex.io/artist/${data.slug}`,
    image_count: imageCount,
    top_styles: styles?.map(s => s.style_name) || [],
  }
}

async function getRandomArtistByStyle(
  styleName: string,
  minFollowers: number,
  maxFollowers: number | null
): Promise<Artist | null> {
  // Query artists with this style AND follower count directly
  // Using a join approach to avoid header overflow with large ID lists
  let query = supabase
    .from('artists')
    .select(`
      id,
      name,
      slug,
      instagram_handle,
      follower_count,
      artist_style_profiles!inner (
        style_name,
        percentage
      )
    `)
    .eq('artist_style_profiles.style_name', styleName)
    .gte('artist_style_profiles.percentage', 30)
    .gte('follower_count', minFollowers)
    .is('deleted_at', null)
    .limit(100)

  if (maxFollowers) {
    query = query.lte('follower_count', maxFollowers)
  }

  const { data: artists, error: artistError } = await query

  if (artistError || !artists || artists.length === 0) {
    console.error(`No ${styleName} artists in follower range ${formatFollowers(minFollowers)}-${maxFollowers ? formatFollowers(maxFollowers) : '∞'}`)
    if (artistError) console.error('Error:', artistError.message)
    return null
  }

  console.log(`Found ${artists.length} ${styleName} artists in range`)

  // Pick random
  const artist = artists[Math.floor(Math.random() * artists.length)]

  // Get location
  const { data: location } = await supabase
    .from('artist_locations')
    .select('city, region')
    .eq('artist_id', artist.id)
    .eq('is_primary', true)
    .single()

  // Get image count
  const { count } = await supabase
    .from('portfolio_images')
    .select('id', { count: 'exact', head: true })
    .eq('artist_id', artist.id)
    .eq('status', 'active')
    .not('embedding', 'is', null)

  // Get all styles for this artist
  const { data: styles } = await supabase
    .from('artist_style_profiles')
    .select('style_name, percentage')
    .eq('artist_id', artist.id)
    .order('percentage', { ascending: false })
    .limit(3)

  return {
    id: artist.id,
    name: artist.name,
    slug: artist.slug,
    instagram_handle: artist.instagram_handle,
    follower_count: artist.follower_count || 0,
    city: location?.city || '',
    state: location?.region || '',
    profile_url: `https://inkdex.io/artist/${artist.slug}`,
    image_count: count || 0,
    top_styles: styles?.map(s => s.style_name) || [],
  }
}

async function findSimilarArtists(
  seedArtistId: string,
  minFollowers: number,
  maxFollowers: number | null,
  matchCount: number
): Promise<SimilarArtist[]> {
  // First, get the seed artist's aggregated embedding
  const { data: embeddings } = await supabase
    .from('portfolio_images')
    .select('embedding')
    .eq('artist_id', seedArtistId)
    .eq('status', 'active')
    .not('embedding', 'is', null)
    .limit(20)

  if (!embeddings || embeddings.length === 0) {
    console.error('No embeddings found for seed artist')
    return []
  }

  // Parse and aggregate embeddings
  const vectors = embeddings.map((e) => {
    if (typeof e.embedding === 'string') {
      // Parse pgvector format: [0.1,0.2,...]
      return JSON.parse(e.embedding.replace(/^\[/, '[').replace(/\]$/, ']'))
    }
    return e.embedding
  })

  // Average the embeddings
  const avgEmbedding = vectors[0].map((_: number, i: number) => {
    const sum = vectors.reduce((acc: number, v: number[]) => acc + v[i], 0)
    return sum / vectors.length
  })

  // Format for pgvector
  const embeddingStr = `[${avgEmbedding.join(',')}]`

  // Use the optimized search_artists function
  const { data, error } = await supabase.rpc('search_artists', {
    query_embedding: embeddingStr,
    match_threshold: 0.3,
    match_count: 100, // Get more, filter down
    city_filter: null,
    region_filter: null,
    country_filter: null,
    offset_param: 0,
    query_styles: null,
    is_color_query: null,
  })

  if (error) {
    console.error('Error finding similar artists:', error)
    return []
  }

  if (!data || data.length === 0) return []

  // Filter by follower count (exclude seed artist)
  const results: SimilarArtist[] = []

  for (const row of data) {
    // Skip the seed artist
    if (row.artist_id === seedArtistId) continue

    const followers = row.follower_count || 0
    if (followers < minFollowers) continue
    if (maxFollowers && followers > maxFollowers) continue

    // Check total portfolio size (not just matching images)
    const { count: portfolioCount } = await supabase
      .from('portfolio_images')
      .select('id', { count: 'exact', head: true })
      .eq('artist_id', row.artist_id)
      .eq('status', 'active')
      .not('embedding', 'is', null)

    if ((portfolioCount || 0) < 4) continue

    // Get top styles
    const { data: styles } = await supabase
      .from('artist_style_profiles')
      .select('style_name')
      .eq('artist_id', row.artist_id)
      .order('percentage', { ascending: false })
      .limit(3)

    results.push({
      id: row.artist_id,
      name: row.artist_name,
      slug: row.artist_slug,
      instagram_handle: row.instagram_url?.replace('https://instagram.com/', '').replace('https://www.instagram.com/', '') || '',
      follower_count: followers,
      city: row.city || '',
      state: row.region || '',
      profile_url: `https://inkdex.io/artist/${row.artist_slug}`,
      image_count: portfolioCount || 0,
      top_styles: styles?.map(s => s.style_name) || [],
      similarity: row.similarity,
    })

    if (results.length >= matchCount + 5) break // Get a few extra
  }

  return results
}

async function browseArtists(
  minFollowers: number,
  maxFollowers: number | null,
  limit: number = 20
): Promise<Artist[]> {
  let query = supabase
    .from('artists')
    .select(`
      id,
      name,
      slug,
      instagram_handle,
      follower_count,
      portfolio_images!inner (id, embedding)
    `)
    .gte('follower_count', minFollowers)
    .is('deleted_at', null)
    .eq('verification_status', 'unclaimed')
    .not('portfolio_images.embedding', 'is', null)
    .order('follower_count', { ascending: false })
    .limit(limit * 3) // Get more to account for deduplication

  if (maxFollowers) {
    query = query.lte('follower_count', maxFollowers)
  }

  const { data, error } = await query

  if (error || !data) return []

  // Deduplicate and count images
  const seen = new Set<string>()
  const results: Artist[] = []

  for (const row of data) {
    if (seen.has(row.id)) continue
    seen.add(row.id)

    const imageCount = Array.isArray(row.portfolio_images)
      ? row.portfolio_images.filter((img: { embedding: unknown }) => img.embedding).length
      : 0

    if (imageCount < 4) continue

    // Get location
    const { data: location } = await supabase
      .from('artist_locations')
      .select('city, region')
      .eq('artist_id', row.id)
      .eq('is_primary', true)
      .single()

    // Get top styles
    const { data: styles } = await supabase
      .from('artist_style_profiles')
      .select('style_name')
      .eq('artist_id', row.id)
      .order('percentage', { ascending: false })
      .limit(3)

    results.push({
      id: row.id,
      name: row.name,
      slug: row.slug,
      instagram_handle: row.instagram_handle,
      follower_count: row.follower_count || 0,
      city: location?.city || '',
      state: location?.region || '',
      profile_url: `https://inkdex.io/artist/${row.slug}`,
      image_count: imageCount,
      top_styles: styles?.map(s => s.style_name) || [],
    })

    if (results.length >= limit) break
  }

  return results
}

function formatFollowers(count: number): string {
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`
  return count.toString()
}

function printArtist(artist: Artist | SimilarArtist, index?: number): void {
  const prefix = index !== undefined ? `${index}. ` : ''
  const similarity = 'similarity' in artist ? ` (${(artist.similarity * 100).toFixed(0)}% match)` : ''
  const styles = artist.top_styles.length > 0 ? ` [${artist.top_styles.join(', ')}]` : ''

  console.log(
    `${prefix}@${artist.instagram_handle} - ${formatFollowers(artist.follower_count)} followers${similarity}`
  )
  console.log(`   ${artist.name} | ${artist.city}, ${artist.state}${styles}`)
  console.log(`   ${artist.profile_url}`)
  console.log(`   ${artist.image_count} images`)
}

async function promptForSelection(artists: Artist[]): Promise<Artist | null> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  return new Promise((resolve) => {
    rl.question('\nEnter number to select seed artist (or q to quit): ', (answer) => {
      rl.close()
      if (answer.toLowerCase() === 'q') {
        resolve(null)
        return
      }
      const index = parseInt(answer) - 1
      if (index >= 0 && index < artists.length) {
        resolve(artists[index])
      } else {
        console.log('Invalid selection')
        resolve(null)
      }
    })
  })
}

async function main() {
  const args = process.argv.slice(2)

  // Parse arguments
  const artistIndex = args.indexOf('--artist')
  const artistSlug = artistIndex !== -1 ? args[artistIndex + 1] : null

  const styleIndex = args.indexOf('--style')
  const styleName = styleIndex !== -1 ? args[styleIndex + 1] : null

  const minIndex = args.indexOf('--min-followers')
  const minFollowers = minIndex !== -1 ? parseInt(args[minIndex + 1]) : 10000

  const maxIndex = args.indexOf('--max-followers')
  const maxFollowers = maxIndex !== -1 ? parseInt(args[maxIndex + 1]) : null

  const matchesIndex = args.indexOf('--matches')
  const matchCount = matchesIndex !== -1 ? parseInt(args[matchesIndex + 1]) : 4

  const browse = args.includes('--browse')

  console.log('🎨 Find Style Matches for Marketing')
  console.log('====================================')
  console.log(`Follower range: ${formatFollowers(minFollowers)} - ${maxFollowers ? formatFollowers(maxFollowers) : '∞'}`)
  console.log(`Looking for: ${matchCount} matches minimum`)
  console.log()

  let seedArtist: Artist | null = null

  // Mode 1: Browse and select
  if (browse) {
    console.log('📋 Browsing artists in follower range...\n')
    const artists = await browseArtists(minFollowers, maxFollowers, 20)

    if (artists.length === 0) {
      console.log('No artists found in this follower range')
      process.exit(1)
    }

    artists.forEach((artist, i) => {
      printArtist(artist, i + 1)
      console.log()
    })

    seedArtist = await promptForSelection(artists)
    if (!seedArtist) {
      console.log('No artist selected')
      process.exit(0)
    }
  }

  // Mode 2: Direct artist slug
  if (artistSlug && !seedArtist) {
    console.log(`🔍 Looking up artist: ${artistSlug}`)
    seedArtist = await getArtistBySlug(artistSlug)
    if (!seedArtist) {
      console.error(`Artist not found: ${artistSlug}`)
      process.exit(1)
    }
  }

  // Mode 3: Random from style
  if (styleName && !seedArtist) {
    console.log(`🎲 Finding random ${styleName} artist in follower range...`)
    seedArtist = await getRandomArtistByStyle(styleName, minFollowers, maxFollowers)
    if (!seedArtist) {
      process.exit(1)
    }
  }

  if (!seedArtist) {
    console.error('Must provide --artist, --style, or --browse')
    process.exit(1)
  }

  // Show seed artist
  console.log('\n🌟 SEED ARTIST:')
  console.log('----------------')
  printArtist(seedArtist)

  // Find similar artists
  console.log(`\n🔍 Finding ${matchCount}+ similar artists in follower range...`)
  const similar = await findSimilarArtists(
    seedArtist.id,
    minFollowers,
    maxFollowers,
    matchCount + 5 // Get a few extra
  )

  if (similar.length < matchCount) {
    console.log(`\n⚠️  Only found ${similar.length} matches (need ${matchCount})`)
    console.log('Try widening the follower range or using a different seed artist')

    if (similar.length > 0) {
      console.log('\nPartial results:')
      similar.forEach((artist, i) => {
        printArtist(artist, i + 1)
        console.log()
      })
    }
    process.exit(1)
  }

  // Output results
  console.log(`\n✅ STYLE MATCH GROUP (${similar.length + 1} artists):`)
  console.log('='.repeat(50))

  // Include seed artist in output
  console.log('\n📌 Seed:')
  printArtist(seedArtist)

  console.log('\n🎯 Matches:')
  similar.slice(0, matchCount).forEach((artist, i) => {
    console.log()
    printArtist(artist, i + 1)
  })

  // Marketing summary
  console.log('\n' + '='.repeat(50))
  console.log('📱 INSTAGRAM STORY COPY:')
  console.log('='.repeat(50))

  const allArtists = [seedArtist, ...similar.slice(0, matchCount)]
  const handles = allArtists.map((a) => `@${a.instagram_handle}`).join(' ')
  const cities = [...new Set(allArtists.map((a) => a.city))].filter(Boolean).join(', ')
  const commonStyles = seedArtist.top_styles.length > 0 ? seedArtist.top_styles[0] : 'similar'

  console.log(`
These ${allArtists.length} artists all do ${commonStyles} work 🔥

Found via visual search on Inkdex - upload any tattoo photo and find artists who do similar work.

${handles}

Cities: ${cities}

🔗 inkdex.io
`)

  // JSON output for further processing
  if (args.includes('--json')) {
    console.log('\n--- JSON OUTPUT ---')
    console.log(JSON.stringify({
      seed: seedArtist,
      matches: similar.slice(0, matchCount),
      follower_range: { min: minFollowers, max: maxFollowers },
    }, null, 2))
  }
}

main().catch(console.error)
