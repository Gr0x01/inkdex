/**
 * Country Content Auto-Generation Cron Job
 *
 * GET /api/cron/generate-country-content
 *
 * Runs daily to check for new countries with artists
 * and auto-generate SEO content if missing.
 *
 * Threshold: 1 artist minimum (generate immediately)
 * Limit: 5 countries per run (control GPT costs)
 *
 * Configure in vercel.json with schedule: "0 4 * * *" (4am UTC daily)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'
import { env } from '@/lib/config/env'
import { getCountryName, isGDPRCountry } from '@/lib/constants/countries'

// Limit countries per cron run to control costs (~$0.10/country)
const MAX_COUNTRIES_PER_RUN = 5

/**
 * Sanitize GPT output to prevent XSS and remove any HTML tags
 * GPT-generated content should be plain text only
 */
function sanitizeTextContent(text: string): string {
  if (!text || typeof text !== 'string') return ''
  // Strip HTML tags, normalize whitespace, limit length
  return text
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 2000) // Reasonable max length for editorial content
}

/**
 * Sanitize country name for use in GPT prompt to prevent injection
 */
function sanitizeForPrompt(text: string): string {
  if (!text || typeof text !== 'string') return 'Unknown'
  // Remove newlines and special characters that could break prompt structure
  return text.replace(/[\n\r\t]/g, ' ').slice(0, 100).trim()
}

const SYSTEM_PROMPT = `You are an expert tattoo industry writer creating SEO-optimized editorial content for country-level tattoo pages. Your writing should be:

1. **Authentic & Knowledgeable**: Sound like you know the country's tattoo scene and culture
2. **SEO-Optimized**: Naturally incorporate country + tattoo keywords
3. **Engaging but Concise**: Country pages are entry points, not deep dives
4. **Culturally Aware**: Connect to local art movements, cultural practices, tattoo history

TONE: Professional, informative, globally aware. Avoid stereotypes and generalizations.

STRUCTURE:
- Hero (1 paragraph, 80-100 words): What makes tattooing unique in this country
- Scene (1 paragraph, 100-120 words): Major cities, style preferences, cultural influences
- Tips (1 paragraph, 60-80 words): Practical advice for searching/booking

Total target: ~300 words. Keep it informative but accessible.`

interface CountryWithCount {
  location_code: string // country_code from get_location_counts
  artist_count: number
}

export async function GET(request: NextRequest) {
  try {
    // Verify cron authentication
    // In production: require EITHER valid CRON_SECRET OR Vercel's internal cron header
    // Vercel sets x-vercel-cron header only for crons triggered from their scheduler
    const authHeader = request.headers.get('authorization')
    const vercelCronHeader = request.headers.get('x-vercel-cron')
    const isValidSecret = process.env.CRON_SECRET && authHeader === `Bearer ${process.env.CRON_SECRET}`
    const isVercelCron = vercelCronHeader === '1'

    if (env.NODE_ENV === 'production' && !isValidSecret && !isVercelCron) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check for OpenAI API key
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({
        success: false,
        error: 'OpenAI API key not configured',
      }, { status: 500 })
    }

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })

    const supabase = createClient(
      env.NEXT_PUBLIC_SUPABASE_URL,
      env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )

    // Get countries with artists (via consolidated RPC function)
    const { data: countriesWithArtists, error: countriesError } = await supabase.rpc(
      'get_location_counts',
      { p_grouping: 'countries' }
    )

    if (countriesError) {
      console.error('Error fetching countries:', countriesError)
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch countries with artists',
      }, { status: 500 })
    }

    // Filter: exclude US (has city content), GDPR countries
    // location_code contains country_code from get_location_counts
    const eligibleCountries = (countriesWithArtists as CountryWithCount[] || [])
      .filter((c) => c.location_code !== 'US' && !isGDPRCountry(c.location_code))

    // Get existing content
    const { data: existingContent } = await supabase
      .from('country_editorial_content')
      .select('country_code')

    const existingCodes = new Set(
      (existingContent || []).map((c) => c.country_code)
    )

    // Find countries needing content
    const countriesNeedingContent = eligibleCountries
      .filter((c) => !existingCodes.has(c.location_code))
      .sort((a, b) => b.artist_count - a.artist_count) // Most artists first
      .slice(0, MAX_COUNTRIES_PER_RUN)

    if (countriesNeedingContent.length === 0) {
      return NextResponse.json({
        success: true,
        processed: 0,
        message: 'All eligible countries already have content',
      })
    }

    const results = {
      processed: 0,
      generated: 0,
      errors: [] as Array<{ country: string; error: string }>,
    }

    // Generate content for each country
    for (const country of countriesNeedingContent) {
      const rawCountryName = getCountryName(country.location_code) || country.location_code
      const countryName = sanitizeForPrompt(rawCountryName) // Prevent prompt injection
      results.processed++

      try {
        const prompt = `Generate SEO editorial content for ${countryName}'s tattoo scene.

COUNTRY CONTEXT:
- Country: ${countryName} (${country.location_code})
- Artists on platform: ${country.artist_count}
- Consider: cultural identity, tattoo traditions, major cities, art influences

OUTPUT FORMAT (JSON):
{
  "heroText": "Single paragraph about what makes ${countryName}'s tattoo scene unique (80-100 words)",
  "sceneHeading": "Creative heading like 'The ${countryName} Tattoo Landscape'",
  "sceneText": "Single paragraph about major tattoo cities, popular styles, cultural influences (100-120 words)",
  "tipsHeading": "Creative heading about searching/finding artists",
  "tipsText": "Single paragraph with practical tips (60-80 words)",
  "keywords": ["5 SEO keywords including country name + tattoo terms"],
  "majorCities": ["3-5 major cities known for tattooing"]
}

Be specific to ${countryName}. Connect to broader cultural context.
Keep content accurate - avoid fabricating specific details you're not certain about.`

        const response = await openai.chat.completions.create({
          model: 'gpt-4-turbo-2024-04-09',
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: prompt },
          ],
          temperature: 0.7,
          response_format: { type: 'json_object' },
        })

        const content = JSON.parse(response.choices[0].message.content || '{}')

        if (!content.heroText || !content.sceneText || !content.tipsText) {
          throw new Error('Invalid GPT response structure')
        }

        // Sanitize GPT output to prevent XSS before database insertion
        const sanitizedContent = {
          heroText: sanitizeTextContent(content.heroText),
          sceneHeading: sanitizeTextContent(content.sceneHeading || `Tattoo Culture in ${countryName}`),
          sceneText: sanitizeTextContent(content.sceneText),
          tipsHeading: sanitizeTextContent(content.tipsHeading || `Finding Artists in ${countryName}`),
          tipsText: sanitizeTextContent(content.tipsText),
          keywords: (content.keywords || []).map((k: string) => sanitizeTextContent(k)).filter(Boolean),
          majorCities: (content.majorCities || []).map((c: string) => sanitizeTextContent(c)).filter(Boolean),
        }

        // Save to database
        const { error: insertError } = await supabase
          .from('country_editorial_content')
          .insert({
            country_code: country.location_code,
            hero_text: sanitizedContent.heroText,
            scene_heading: sanitizedContent.sceneHeading,
            scene_text: sanitizedContent.sceneText,
            tips_heading: sanitizedContent.tipsHeading,
            tips_text: sanitizedContent.tipsText,
            keywords: sanitizedContent.keywords,
            major_cities: sanitizedContent.majorCities,
            generated_at: new Date().toISOString(),
            generated_by: 'cron',
          })

        if (insertError) {
          throw new Error(`DB insert failed: ${insertError.message}`)
        }

        results.generated++
        console.log(`✅ Generated content for ${countryName}`)
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        results.errors.push({ country: countryName, error: errorMessage })
        console.error(`❌ Failed for ${countryName}: ${errorMessage}`)
      }

      // Rate limit: 1 second between requests
      if (countriesNeedingContent.indexOf(country) < countriesNeedingContent.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 1000))
      }
    }

    return NextResponse.json({
      success: true,
      processed: results.processed,
      generated: results.generated,
      errors: results.errors.length > 0 ? results.errors : undefined,
      estimatedCost: `$${(results.generated * 0.10).toFixed(2)}`,
    })
  } catch (error) {
    console.error('Country content cron error:', error)

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Generation failed' },
      { status: 500 }
    )
  }
}
