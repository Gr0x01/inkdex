import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isAdminEmail } from '@/lib/admin/whitelist'

interface StyleMatchResult {
  seed: {
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
  matches: Array<{
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
    similarity: number
  }>
  story_copy: string
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const supabase = await createClient()

  // Check admin auth
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user || !isAdminEmail(user.email)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const {
    artist_slug,
    style,
    min_followers = 10000,
    max_followers,
    seed_min_followers = 10000,
    seed_max_followers,
    match_count = 4,
  } = body

  try {
    let seedArtist: StyleMatchResult['seed'] | null = null

    // Mode 1: Find by artist slug
    if (artist_slug) {
      const { data: artistData } = await supabase
        .from('artists')
        .select('id, name, slug, instagram_handle, follower_count')
        .eq('slug', artist_slug)
        .is('deleted_at', null)
        .single()

      if (!artistData) {
        return NextResponse.json({ error: 'Artist not found' }, { status: 404 })
      }

      // Get location
      const { data: location } = await supabase
        .from('artist_locations')
        .select('city, region')
        .eq('artist_id', artistData.id)
        .eq('is_primary', true)
        .single()

      // Get image count
      const { count: imageCount } = await supabase
        .from('portfolio_images')
        .select('id', { count: 'exact', head: true })
        .eq('artist_id', artistData.id)
        .eq('status', 'active')
        .not('embedding', 'is', null)

      // Get styles
      const { data: styles } = await supabase
        .from('artist_style_profiles')
        .select('style_name')
        .eq('artist_id', artistData.id)
        .order('percentage', { ascending: false })
        .limit(3)

      seedArtist = {
        id: artistData.id,
        name: artistData.name,
        slug: artistData.slug,
        instagram_handle: artistData.instagram_handle,
        follower_count: artistData.follower_count || 0,
        city: location?.city || '',
        state: location?.region || '',
        profile_url: `https://inkdex.io/artist/${artistData.slug}`,
        image_count: imageCount || 0,
        top_styles: styles?.map((s) => s.style_name) || [],
      }
    }

    // Mode 2: Find random artist by style
    if (style && !seedArtist) {
      let query = supabase
        .from('artists')
        .select(
          `
          id,
          name,
          slug,
          instagram_handle,
          follower_count,
          artist_style_profiles!inner (
            style_name,
            percentage
          )
        `
        )
        .eq('artist_style_profiles.style_name', style)
        .gte('artist_style_profiles.percentage', 30)
        .gte('follower_count', seed_min_followers)
        .is('deleted_at', null)
        .limit(100)

      if (seed_max_followers) {
        query = query.lte('follower_count', seed_max_followers)
      }

      const { data: artists } = await query

      if (!artists || artists.length === 0) {
        return NextResponse.json(
          { error: `No ${style} artists found in follower range` },
          { status: 404 }
        )
      }

      // Pick random
      const randomArtist = artists[Math.floor(Math.random() * artists.length)]

      // Get location
      const { data: location } = await supabase
        .from('artist_locations')
        .select('city, region')
        .eq('artist_id', randomArtist.id)
        .eq('is_primary', true)
        .single()

      // Get image count
      const { count: imageCount } = await supabase
        .from('portfolio_images')
        .select('id', { count: 'exact', head: true })
        .eq('artist_id', randomArtist.id)
        .eq('status', 'active')
        .not('embedding', 'is', null)

      // Get all styles
      const { data: allStyles } = await supabase
        .from('artist_style_profiles')
        .select('style_name')
        .eq('artist_id', randomArtist.id)
        .order('percentage', { ascending: false })
        .limit(3)

      seedArtist = {
        id: randomArtist.id,
        name: randomArtist.name,
        slug: randomArtist.slug,
        instagram_handle: randomArtist.instagram_handle,
        follower_count: randomArtist.follower_count || 0,
        city: location?.city || '',
        state: location?.region || '',
        profile_url: `https://inkdex.io/artist/${randomArtist.slug}`,
        image_count: imageCount || 0,
        top_styles: allStyles?.map((s) => s.style_name) || [],
      }
    }

    if (!seedArtist) {
      return NextResponse.json(
        { error: 'Must provide artist_slug or style' },
        { status: 400 }
      )
    }

    // Now find similar artists using the seed's aggregated embedding
    const { data: embeddings } = await supabase
      .from('portfolio_images')
      .select('embedding')
      .eq('artist_id', seedArtist.id)
      .eq('status', 'active')
      .not('embedding', 'is', null)
      .limit(20)

    if (!embeddings || embeddings.length === 0) {
      return NextResponse.json(
        { error: 'Seed artist has no embeddings' },
        { status: 400 }
      )
    }

    // Parse and aggregate embeddings
    const vectors = embeddings.map((e) => JSON.parse(e.embedding as string))
    const avgEmbedding = vectors[0].map((_: number, i: number) => {
      return vectors.reduce((acc: number, v: number[]) => acc + v[i], 0) / vectors.length
    })

    // Use search_artists RPC
    const { data: searchResults, error: searchError } = await supabase.rpc('search_artists', {
      query_embedding: `[${avgEmbedding.join(',')}]`,
      match_threshold: 0.3,
      match_count: 100,
      city_filter: null,
      region_filter: null,
      country_filter: null,
      offset_param: 0,
      query_styles: null,
      is_color_query: null,
    })

    if (searchError) {
      console.error('Search error:', searchError)
      return NextResponse.json({ error: 'Search failed' }, { status: 500 })
    }

    // Filter by follower count
    const matches: StyleMatchResult['matches'] = []

    for (const row of searchResults || []) {
      if (row.artist_id === seedArtist.id) continue

      const followers = row.follower_count || 0
      if (followers < min_followers) continue
      if (max_followers && followers > max_followers) continue

      // Check portfolio size
      const { count: portfolioCount } = await supabase
        .from('portfolio_images')
        .select('id', { count: 'exact', head: true })
        .eq('artist_id', row.artist_id)
        .eq('status', 'active')
        .not('embedding', 'is', null)

      if ((portfolioCount || 0) < 4) continue

      // Get styles
      const { data: artistStyles } = await supabase
        .from('artist_style_profiles')
        .select('style_name')
        .eq('artist_id', row.artist_id)
        .order('percentage', { ascending: false })
        .limit(3)

      matches.push({
        id: row.artist_id,
        name: row.artist_name,
        slug: row.artist_slug,
        instagram_handle:
          row.instagram_url?.replace('https://instagram.com/', '').replace('https://www.instagram.com/', '') || '',
        follower_count: followers,
        city: row.city || '',
        state: row.region || '',
        profile_url: `https://inkdex.io/artist/${row.artist_slug}`,
        image_count: portfolioCount || 0,
        top_styles: artistStyles?.map((s) => s.style_name) || [],
        similarity: row.similarity,
      })

      if (matches.length >= match_count + 3) break
    }

    // Generate story copy
    const allArtists = [seedArtist, ...matches.slice(0, match_count)]
    const handles = allArtists.map((a) => `@${a.instagram_handle}`).join(' ')
    const cities = [...new Set(allArtists.map((a) => a.city).filter(Boolean))].join(', ')
    const primaryStyle = seedArtist.top_styles[0] || 'similar'

    const storyCopy = `These ${allArtists.length} artists all do ${primaryStyle} work

Found via visual search on Inkdex - upload any tattoo photo and find artists who do similar work.

${handles}

Cities: ${cities}

inkdex.io`

    return NextResponse.json({
      seed: seedArtist,
      matches: matches.slice(0, match_count),
      story_copy: storyCopy,
    } as StyleMatchResult)
  } catch (err) {
    console.error('Style matches error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
