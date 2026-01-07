/**
 * Airtable Client for Marketing Sync
 *
 * Handles bidirectional sync between Supabase and Airtable:
 * - Push: DB → Airtable (artist data with portfolio images)
 * - Pull: Airtable → DB (status updates, featured flags)
 */

import { env } from '@/lib/config/env'

// Airtable API types
interface AirtableRecord {
  id: string
  createdTime: string
  fields: Record<string, unknown>
}

interface AirtableListResponse {
  records: AirtableRecord[]
  offset?: string
}

interface AirtableConfig {
  pat: string
  baseId: string
  outreachTableId: string
}

// Outreach record as it appears in Airtable
export interface AirtableOutreachFields {
  instagram_handle: string
  name?: string
  city?: string
  state?: string
  follower_count?: number
  bio?: string
  profile_url?: string
  image_1?: string
  image_2?: string
  image_3?: string
  image_4?: string
  status?: string
  featured?: boolean
  feature_days?: number
  post_date?: string
  dm_date?: string
  response_notes?: string
  priority?: string
}

export interface AirtableOutreachRecord {
  id: string
  createdTime: string
  fields: AirtableOutreachFields
}

// Artist data for pushing to Airtable
export interface ArtistForAirtable {
  id: string
  instagram_handle: string
  name: string | null
  city: string | null
  state: string | null
  follower_count: number | null
  bio: string | null
  slug: string
  portfolio_images: Array<{ storage_thumb_640: string | null }>
}

/**
 * Get validated Airtable configuration
 * Returns null if not configured
 */
export function getAirtableConfig(): AirtableConfig | null {
  const pat = env.AIRTABLE_PAT
  const baseId = env.AIRTABLE_BASE_ID
  const outreachTableId = env.AIRTABLE_OUTREACH_TABLE_ID

  if (!pat || !baseId || !outreachTableId) {
    return null
  }

  return { pat, baseId, outreachTableId }
}

/**
 * Check if Airtable is configured
 */
export function isAirtableConfigured(): boolean {
  return getAirtableConfig() !== null
}

/**
 * Base fetch wrapper with rate limiting and error handling
 */
async function airtableFetch<T>(
  config: AirtableConfig,
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `https://api.airtable.com/v0/${config.baseId}/${endpoint}`

  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${config.pat}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    const errorMessage = (errorData as { error?: { message?: string } })?.error?.message || response.statusText

    if (response.status === 429) {
      throw new Error('Airtable rate limit exceeded. Please try again in 30 seconds.')
    }

    throw new Error(`Airtable API error (${response.status}): ${errorMessage}`)
  }

  return response.json()
}

/**
 * Fetch all records from outreach table
 * Optionally filter by modification time
 */
export async function fetchOutreachRecords(
  since?: Date
): Promise<AirtableOutreachRecord[]> {
  const config = getAirtableConfig()
  if (!config) {
    throw new Error('Airtable not configured')
  }

  const records: AirtableOutreachRecord[] = []
  let offset: string | undefined

  // Build filter formula if filtering by time
  let filterFormula = ''
  if (since) {
    const isoDate = since.toISOString()
    filterFormula = `LAST_MODIFIED_TIME() > '${isoDate}'`
  }

  do {
    const params = new URLSearchParams()
    if (offset) params.set('offset', offset)
    if (filterFormula) params.set('filterByFormula', filterFormula)
    params.set('pageSize', '100')

    const endpoint = `${config.outreachTableId}?${params.toString()}`
    const response = await airtableFetch<AirtableListResponse>(config, endpoint)

    records.push(...(response.records as unknown as AirtableOutreachRecord[]))
    offset = response.offset

    // Rate limit: small delay between paginated requests
    if (offset) {
      await new Promise((resolve) => setTimeout(resolve, 200))
    }
  } while (offset)

  return records
}

/**
 * Find a record by Instagram handle
 */
export async function findRecordByHandle(
  handle: string
): Promise<AirtableOutreachRecord | null> {
  const config = getAirtableConfig()
  if (!config) {
    throw new Error('Airtable not configured')
  }

  const filterFormula = `{instagram_handle} = '${handle.replace(/'/g, "\\'")}'`
  const params = new URLSearchParams({
    filterByFormula: filterFormula,
    pageSize: '1',
  })

  const endpoint = `${config.outreachTableId}?${params.toString()}`
  const response = await airtableFetch<AirtableListResponse>(config, endpoint)

  return (response.records[0] as unknown as AirtableOutreachRecord) || null
}

/**
 * Create records in Airtable (max 10 per batch)
 */
export async function createRecords(
  records: AirtableOutreachFields[]
): Promise<AirtableOutreachRecord[]> {
  const config = getAirtableConfig()
  if (!config) {
    throw new Error('Airtable not configured')
  }

  if (records.length === 0) return []
  if (records.length > 10) {
    throw new Error('Airtable create limit is 10 records per request')
  }

  const response = await airtableFetch<{ records: AirtableOutreachRecord[] }>(
    config,
    config.outreachTableId,
    {
      method: 'POST',
      body: JSON.stringify({
        records: records.map((fields) => ({ fields })),
      }),
    }
  )

  return response.records
}

/**
 * Update records in Airtable (max 10 per batch)
 */
export async function updateRecords(
  records: Array<{ id: string; fields: Partial<AirtableOutreachFields> }>
): Promise<AirtableOutreachRecord[]> {
  const config = getAirtableConfig()
  if (!config) {
    throw new Error('Airtable not configured')
  }

  if (records.length === 0) return []
  if (records.length > 10) {
    throw new Error('Airtable update limit is 10 records per request')
  }

  const response = await airtableFetch<{ records: AirtableOutreachRecord[] }>(
    config,
    config.outreachTableId,
    {
      method: 'PATCH',
      body: JSON.stringify({ records }),
    }
  )

  return response.records
}

/**
 * Format artist data for Airtable
 */
export function formatArtistForAirtable(
  artist: ArtistForAirtable,
  appUrl: string = 'https://inkdex.io'
): AirtableOutreachFields {
  // Convert storage paths to full Supabase URLs
  const storageBaseUrl = `${env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/portfolio`

  // Get top 4 portfolio images as full URLs
  const images = artist.portfolio_images
    .filter((img) => img.storage_thumb_640)
    .slice(0, 4)
    .map((img) => `${storageBaseUrl}/${img.storage_thumb_640}`)

  return {
    instagram_handle: artist.instagram_handle,
    name: artist.name || undefined,
    city: artist.city || undefined,
    state: artist.state || undefined,
    follower_count: artist.follower_count || undefined,
    bio: artist.bio?.slice(0, 500) || undefined, // Truncate bio
    profile_url: `${appUrl}/artist/${artist.slug}`,
    image_1: images[0],
    image_2: images[1],
    image_3: images[2],
    image_4: images[3],
    status: 'pending',
    feature_days: 14, // Default featured duration
  }
}

/**
 * Batch create/update records with rate limiting
 * Handles batches larger than 10 by splitting into chunks
 */
export async function batchUpsertRecords(
  records: AirtableOutreachFields[]
): Promise<{
  created: number
  updated: number
  errors: Array<{ handle: string; error: string }>
}> {
  const config = getAirtableConfig()
  if (!config) {
    throw new Error('Airtable not configured')
  }

  const results = {
    created: 0,
    updated: 0,
    errors: [] as Array<{ handle: string; error: string }>,
  }

  // Process in batches of 10
  for (let i = 0; i < records.length; i += 10) {
    const batch = records.slice(i, i + 10)

    // Check which records already exist
    const toCreate: AirtableOutreachFields[] = []
    const toUpdate: Array<{ id: string; fields: Partial<AirtableOutreachFields> }> = []

    for (const record of batch) {
      try {
        const existing = await findRecordByHandle(record.instagram_handle)
        if (existing) {
          // Update existing record (don't overwrite user-editable fields)
          toUpdate.push({
            id: existing.id,
            fields: {
              name: record.name,
              city: record.city,
              state: record.state,
              follower_count: record.follower_count,
              bio: record.bio,
              profile_url: record.profile_url,
              image_1: record.image_1,
              image_2: record.image_2,
              image_3: record.image_3,
              image_4: record.image_4,
            },
          })
        } else {
          toCreate.push(record)
        }
      } catch (error) {
        results.errors.push({
          handle: record.instagram_handle,
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    }

    // Execute creates and updates
    if (toCreate.length > 0) {
      try {
        await createRecords(toCreate)
        results.created += toCreate.length
      } catch (error) {
        for (const record of toCreate) {
          results.errors.push({
            handle: record.instagram_handle,
            error: error instanceof Error ? error.message : 'Create failed',
          })
        }
      }
    }

    if (toUpdate.length > 0) {
      try {
        await updateRecords(toUpdate)
        results.updated += toUpdate.length
      } catch (error) {
        for (const record of toUpdate) {
          results.errors.push({
            handle: record.fields.instagram_handle || 'unknown',
            error: error instanceof Error ? error.message : 'Update failed',
          })
        }
      }
    }

    // Rate limit between batches
    if (i + 10 < records.length) {
      await new Promise((resolve) => setTimeout(resolve, 250))
    }
  }

  return results
}
