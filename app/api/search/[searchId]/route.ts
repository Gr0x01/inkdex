import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { searchArtistsByEmbedding } from '@/lib/supabase/queries'

/**
 * GET /api/search/[searchId]
 *
 * Fetches search from database, runs vector similarity search,
 * returns ranked artist results
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ searchId: string }> }
) {
  try {
    const { searchId } = await params
    const { searchParams } = new URL(request.url)

    // Parse query parameters
    const city = searchParams.get('city') || null
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '20', 10)

    // Validate pagination
    if (page < 1 || limit < 1 || limit > 100) {
      return NextResponse.json(
        { error: 'Invalid pagination parameters' },
        { status: 400 }
      )
    }

    const offset = (page - 1) * limit

    // Fetch search from database
    const supabase = await createClient()

    const { data: search, error: searchError } = await supabase
      .from('searches')
      .select('*')
      .eq('id', searchId)
      .single()

    if (searchError || !search) {
      return NextResponse.json(
        { error: 'Search not found' },
        { status: 404 }
      )
    }

    // Parse embedding (stored as string "[0.1, 0.2, ...]")
    let embedding: number[]
    try {
      embedding = JSON.parse(search.embedding)
    } catch (error) {
      console.error('Failed to parse embedding:', error)
      return NextResponse.json(
        { error: 'Invalid embedding format' },
        { status: 500 }
      )
    }

    // Verify embedding dimension
    if (!Array.isArray(embedding) || embedding.length !== 768) {
      return NextResponse.json(
        { error: `Invalid embedding dimension: ${embedding?.length}` },
        { status: 500 }
      )
    }

    // Search artists by embedding
    const results = await searchArtistsByEmbedding(embedding, {
      city,
      limit,
      offset,
      threshold: 0.5, // Lower threshold for MVP to ensure results
    })

    // Return results with metadata
    return NextResponse.json({
      results,
      total: results.length, // Note: This is approximate, would need COUNT query for exact
      page,
      limit,
      queryType: search.query_type,
      queryText: search.query_text,
      city,
    })
  } catch (error) {
    console.error('Search results API error:', error)

    return NextResponse.json(
      {
        error: 'Failed to fetch search results',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
