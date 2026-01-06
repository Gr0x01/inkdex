import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/search/[searchId]/locations
 * Returns location counts filtered by the search embedding
 * Only includes locations that have matching artists
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ searchId: string }> }
) {
  const { searchId } = await params

  // Validate searchId format (UUID)
  const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!UUID_REGEX.test(searchId)) {
    return NextResponse.json({ error: 'Invalid search ID' }, { status: 400 })
  }

  const supabase = await createClient()

  // Get the search record to retrieve the embedding
  const { data: search, error: searchError } = await supabase
    .from('searches')
    .select('embedding')
    .eq('id', searchId)
    .single()

  if (searchError || !search) {
    return NextResponse.json({ error: 'Search not found' }, { status: 404 })
  }

  if (!search.embedding) {
    return NextResponse.json({ error: 'Search has no embedding' }, { status: 400 })
  }

  // Call the RPC function to get filtered location counts
  const { data, error } = await supabase.rpc('get_search_location_counts', {
    query_embedding: search.embedding,
    match_threshold: 0.15,
  })

  if (error) {
    console.error('Error fetching search location counts:', error)
    return NextResponse.json({ error: 'Failed to fetch locations' }, { status: 500 })
  }

  // Transform into a more usable format
  const locations = {
    countries: [] as Array<{ code: string; count: number }>,
    regions: [] as Array<{ code: string; country: string; count: number }>,
    cities: [] as Array<{ slug: string; region: string; country: string; count: number }>,
  }

  for (const row of data || []) {
    if (row.location_type === 'country') {
      locations.countries.push({
        code: row.country_code,
        count: row.artist_count,
      })
    } else if (row.location_type === 'region') {
      locations.regions.push({
        code: row.region,
        country: row.country_code,
        count: row.artist_count,
      })
    } else if (row.location_type === 'city') {
      locations.cities.push({
        slug: row.city?.toLowerCase().replace(/\s+/g, '-') || '',
        region: row.region,
        country: row.country_code,
        count: row.artist_count,
      })
    }
  }

  return NextResponse.json(locations)
}
