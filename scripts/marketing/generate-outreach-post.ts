/**
 * Generate Outreach Post
 *
 * Generates Instagram post content for featured artist outreach:
 * - Fetches best 3-4 portfolio images
 * - Generates professional minimal caption
 * - Creates DM template
 * - Saves to marketing_outreach table
 * - Exports images for Buffer upload
 *
 * Usage:
 *   npx tsx scripts/marketing/generate-outreach-post.ts --artist-id <uuid>
 *   npx tsx scripts/marketing/generate-outreach-post.ts --handle <instagram_handle>
 *   npx tsx scripts/marketing/generate-outreach-post.ts --batch 5  # Process 5 pending outreach records
 *   npx tsx scripts/marketing/generate-outreach-post.ts --batch 5 --export-dir ./outreach-posts
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as fs from 'fs'
import * as path from 'path'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!

interface ArtistData {
  id: string
  name: string
  instagram_handle: string
  city: string
  state: string
  slug: string
  bio: string | null
  follower_count: number
  portfolio_images: Array<{
    id: string
    storage_thumb_640: string | null
    storage_thumb_1280: string | null
    likes_count: number | null
    post_caption: string | null
  }>
}

interface GeneratedPost {
  artistId: string
  artistHandle: string
  caption: string
  imageUrls: string[]
  dmTemplate: string
  profileUrl: string
}

// Style detection from bio/captions (simple keyword matching)
function detectStyle(artist: ArtistData): string {
  const text = [
    artist.bio || '',
    ...artist.portfolio_images.map((img) => img.post_caption || ''),
  ]
    .join(' ')
    .toLowerCase()

  const styles: Record<string, string[]> = {
    'fine line': ['fine line', 'fineline', 'delicate', 'minimal'],
    blackwork: ['blackwork', 'black work', 'dotwork', 'geometric'],
    traditional: ['traditional', 'american traditional', 'old school'],
    'neo-traditional': ['neo traditional', 'neo-traditional', 'neotraditional'],
    realism: ['realism', 'realistic', 'portrait', 'photorealistic'],
    watercolor: ['watercolor', 'watercolour', 'painterly'],
    japanese: ['japanese', 'irezumi', 'oriental'],
    tribal: ['tribal', 'polynesian', 'maori'],
    illustrative: ['illustrative', 'illustration', 'sketch'],
    ornamental: ['ornamental', 'mandala', 'henna'],
  }

  for (const [style, keywords] of Object.entries(styles)) {
    if (keywords.some((kw) => text.includes(kw))) {
      return style
    }
  }

  return 'tattoo' // Generic fallback
}

function generateCaption(artist: ArtistData): string {
  const style = detectStyle(artist)
  const location = artist.state
    ? `${artist.city}, ${artist.state}`
    : artist.city

  // Professional minimal style - no emojis, clean
  return `Discover @${artist.instagram_handle}'s work on Inkdex. ${location} based, specializing in ${style}.`
}

function generateDmTemplate(artist: ArtistData): string {
  const profileUrl = `https://inkdex.io/${artist.slug}`

  return `Hey! We featured your work on Inkdex today. Check it out: ${profileUrl}

We'd love to have you claim your profile - you'll get 3 months of Pro free (auto-sync, analytics, unlimited portfolio).

Let me know if you have any questions!`
}

function getImageUrl(storagePath: string | null): string | null {
  if (!storagePath) return null
  return `${SUPABASE_URL}/storage/v1/object/public/portfolio-images/${storagePath}`
}

async function getArtistById(artistId: string): Promise<ArtistData | null> {
  const { data, error } = await supabase
    .from('artists')
    .select(
      `
      id,
      name,
      instagram_handle,
      city,
      state,
      slug,
      bio,
      follower_count,
      portfolio_images (
        id,
        storage_thumb_640,
        storage_thumb_1280,
        likes_count,
        post_caption
      )
    `
    )
    .eq('id', artistId)
    .is('deleted_at', null)
    .single()

  if (error || !data) {
    console.error('Error fetching artist:', error)
    return null
  }

  return data as ArtistData
}

async function getArtistByHandle(handle: string): Promise<ArtistData | null> {
  const { data, error } = await supabase
    .from('artists')
    .select(
      `
      id,
      name,
      instagram_handle,
      city,
      state,
      slug,
      bio,
      follower_count,
      portfolio_images (
        id,
        storage_thumb_640,
        storage_thumb_1280,
        likes_count,
        post_caption
      )
    `
    )
    .ilike('instagram_handle', handle)
    .is('deleted_at', null)
    .single()

  if (error || !data) {
    console.error('Error fetching artist:', error)
    return null
  }

  return data as ArtistData
}

async function getPendingOutreachArtists(limit: number): Promise<string[]> {
  const { data, error } = await supabase
    .from('marketing_outreach')
    .select('artist_id')
    .is('post_text', null) // Not yet generated
    .is('outreach_sent_at', null) // Not yet sent
    .limit(limit)

  if (error) {
    console.error('Error fetching pending outreach:', error)
    return []
  }

  return data?.map((o) => o.artist_id) || []
}

function selectBestImages(artist: ArtistData, count: number = 4): string[] {
  // Sort by likes (highest first), filter to those with images
  const sortedImages = artist.portfolio_images
    .filter((img) => img.storage_thumb_1280 || img.storage_thumb_640)
    .sort((a, b) => (b.likes_count || 0) - (a.likes_count || 0))

  // Take top N
  const selected = sortedImages.slice(0, count)

  // Return URLs (prefer 1280, fallback to 640)
  return selected
    .map((img) => getImageUrl(img.storage_thumb_1280 || img.storage_thumb_640))
    .filter((url): url is string => url !== null)
}

async function generatePost(artist: ArtistData): Promise<GeneratedPost> {
  const caption = generateCaption(artist)
  const dmTemplate = generateDmTemplate(artist)
  const imageUrls = selectBestImages(artist, 4)
  const profileUrl = `https://inkdex.io/${artist.slug}`

  return {
    artistId: artist.id,
    artistHandle: artist.instagram_handle,
    caption,
    imageUrls,
    dmTemplate,
    profileUrl,
  }
}

async function savePostToOutreach(post: GeneratedPost): Promise<void> {
  const { error } = await supabase
    .from('marketing_outreach')
    .upsert(
      {
        artist_id: post.artistId,
        campaign_name: 'featured_artist_launch',
        post_text: post.caption,
        post_images: post.imageUrls,
        notes: `Generated: ${new Date().toISOString()}`,
      },
      { onConflict: 'artist_id,campaign_name' }
    )

  if (error) {
    console.error('Error saving post:', error)
    throw error
  }
}

async function exportPost(
  post: GeneratedPost,
  exportDir: string
): Promise<void> {
  const artistDir = path.join(exportDir, post.artistHandle)

  // Create directory
  if (!fs.existsSync(artistDir)) {
    fs.mkdirSync(artistDir, { recursive: true })
  }

  // Write caption
  fs.writeFileSync(path.join(artistDir, 'caption.txt'), post.caption)

  // Write DM template
  fs.writeFileSync(path.join(artistDir, 'dm_template.txt'), post.dmTemplate)

  // Write image URLs (for manual download or scripted fetch)
  fs.writeFileSync(
    path.join(artistDir, 'images.txt'),
    post.imageUrls.join('\n')
  )

  // Write metadata JSON
  fs.writeFileSync(
    path.join(artistDir, 'metadata.json'),
    JSON.stringify(
      {
        artistId: post.artistId,
        handle: post.artistHandle,
        profileUrl: post.profileUrl,
        caption: post.caption,
        dmTemplate: post.dmTemplate,
        imageUrls: post.imageUrls,
        generatedAt: new Date().toISOString(),
      },
      null,
      2
    )
  )

  console.log(`   📁 Exported to ${artistDir}`)
}

async function processArtist(
  artistId: string,
  exportDir?: string
): Promise<GeneratedPost | null> {
  const artist = await getArtistById(artistId)
  if (!artist) {
    console.error(`   ❌ Artist not found: ${artistId}`)
    return null
  }

  console.log(
    `\n🎨 Processing @${artist.instagram_handle} (${artist.city}, ${artist.state})`
  )
  console.log(`   Followers: ${artist.follower_count?.toLocaleString() || 'N/A'}`)
  console.log(`   Images: ${artist.portfolio_images.length}`)

  const post = await generatePost(artist)

  console.log(`\n   📝 Caption:`)
  console.log(`   "${post.caption}"`)
  console.log(`\n   🖼️  Images (${post.imageUrls.length}):`)
  post.imageUrls.forEach((url, i) => console.log(`   ${i + 1}. ${url}`))
  console.log(`\n   💬 DM Template:`)
  console.log(`   ${post.dmTemplate.split('\n').join('\n   ')}`)

  // Save to database
  await savePostToOutreach(post)
  console.log(`\n   ✅ Saved to marketing_outreach`)

  // Export if directory specified
  if (exportDir) {
    await exportPost(post, exportDir)
  }

  return post
}

async function main() {
  const args = process.argv.slice(2)

  console.log('📣 Outreach Post Generator')
  console.log('==========================')

  // Parse arguments
  const artistIdIndex = args.indexOf('--artist-id')
  const handleIndex = args.indexOf('--handle')
  const batchIndex = args.indexOf('--batch')
  const exportDirIndex = args.indexOf('--export-dir')

  const exportDir = exportDirIndex !== -1 ? args[exportDirIndex + 1] : undefined

  if (artistIdIndex !== -1) {
    // Single artist by ID
    const artistId = args[artistIdIndex + 1]
    await processArtist(artistId, exportDir)
  } else if (handleIndex !== -1) {
    // Single artist by handle
    const handle = args[handleIndex + 1]
    const artist = await getArtistByHandle(handle)
    if (artist) {
      await processArtist(artist.id, exportDir)
    } else {
      console.error(`❌ Artist not found: @${handle}`)
    }
  } else if (batchIndex !== -1) {
    // Batch process pending outreach
    const batchSize = parseInt(args[batchIndex + 1]) || 5
    console.log(`\n📦 Processing batch of ${batchSize} pending outreach records...`)

    const artistIds = await getPendingOutreachArtists(batchSize)
    console.log(`   Found ${artistIds.length} pending records`)

    const results: GeneratedPost[] = []
    for (const artistId of artistIds) {
      const post = await processArtist(artistId, exportDir)
      if (post) results.push(post)
    }

    console.log(`\n📊 Batch Summary:`)
    console.log(`   Processed: ${results.length}/${artistIds.length}`)

    if (exportDir) {
      console.log(`   Exported to: ${exportDir}`)
    }
  } else {
    console.log(`
Usage:
  npx tsx scripts/marketing/generate-outreach-post.ts --artist-id <uuid>
  npx tsx scripts/marketing/generate-outreach-post.ts --handle <instagram_handle>
  npx tsx scripts/marketing/generate-outreach-post.ts --batch 5
  npx tsx scripts/marketing/generate-outreach-post.ts --batch 5 --export-dir ./outreach-posts

Options:
  --artist-id <uuid>      Process a specific artist by ID
  --handle <handle>       Process a specific artist by Instagram handle
  --batch <n>             Process N pending outreach records
  --export-dir <path>     Export posts to directory (caption, images, DM template)
`)
  }
}

main().catch(console.error)
