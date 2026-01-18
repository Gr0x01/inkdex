/**
 * Generate SEO Editorial Content for Countries using GPT-4.1
 *
 * Generates simpler, country-level content for international pages including:
 * - Hero paragraph (country's tattoo culture overview)
 * - Scene description (major cities, style preferences, influences)
 * - Tips (practical search advice)
 *
 * Target: ~300 words per country (simpler than city content)
 *
 * Usage:
 *   npx tsx scripts/seo/generate-country-content.ts
 *   npx tsx scripts/seo/generate-country-content.ts --limit 5
 *   npx tsx scripts/seo/generate-country-content.ts --country MX
 */

import OpenAI from 'openai'
import * as dotenv from 'dotenv'
import * as path from 'path'
import { createClient } from '@supabase/supabase-js'
import { getCountryName } from '../../lib/constants/countries'

dotenv.config({ path: path.join(__dirname, '../../.env.local') })

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

/**
 * Sanitize GPT output to prevent XSS and remove any HTML tags
 */
function sanitizeTextContent(text: string): string {
  if (!text || typeof text !== 'string') return ''
  return text
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 2000)
}

/**
 * Sanitize input for use in GPT prompt to prevent injection
 */
function sanitizeForPrompt(text: string): string {
  if (!text || typeof text !== 'string') return 'Unknown'
  return text.replace(/[\n\r\t]/g, ' ').slice(0, 100).trim()
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface CountryEditorialContent {
  countryCode: string
  heroText: string
  sceneHeading: string
  sceneText: string
  tipsHeading: string
  tipsText: string
  keywords: string[]
  majorCities: string[]
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

async function generateCountryContent(
  countryCode: string,
  rawCountryName: string,
  artistCount: number
): Promise<CountryEditorialContent> {
  // Sanitize country name to prevent prompt injection
  const countryName = sanitizeForPrompt(rawCountryName)
  console.log(`\n🌍 Generating content for ${countryName} (${countryCode}) - ${artistCount} artists...`)

  const prompt = `Generate SEO editorial content for ${countryName}'s tattoo scene.

COUNTRY CONTEXT:
- Country: ${countryName} (${countryCode})
- Artists on platform: ${artistCount}
- Consider: cultural identity, tattoo traditions, major cities, art influences
- Research: notable tattoo styles, cultural significance, popular regions for tattooing

OUTPUT FORMAT (JSON):
{
  "heroText": "Single paragraph about what makes ${countryName}'s tattoo scene unique (80-100 words)",
  "sceneHeading": "Creative heading like 'The ${countryName} Tattoo Landscape' or 'Ink Culture in ${countryName}'",
  "sceneText": "Single paragraph about major tattoo cities, popular styles, cultural influences (100-120 words)",
  "tipsHeading": "Creative heading about searching/finding artists",
  "tipsText": "Single paragraph with practical tips for finding artists in ${countryName} (60-80 words)",
  "keywords": ["5 SEO keywords including country name + tattoo/artist terms"],
  "majorCities": ["3-5 major cities known for tattooing in ${countryName}"]
}

Be specific to ${countryName}. Connect tattoo culture to broader cultural context (art, music, traditions).
If ${countryName} has notable tattoo traditions or history, mention it.
If you're not certain about specific details, keep the content accurate but general rather than fabricating specifics.`

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo-2024-04-09', // GPT-4.1
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ],
      temperature: 0.7,
      response_format: { type: 'json_object' },
    })

    const content = JSON.parse(response.choices[0].message.content || '{}')

    // Validate required fields
    if (!content.heroText || !content.sceneText || !content.tipsText) {
      console.error(`   ❌ Invalid response structure for ${countryName}`)
      throw new Error(`Invalid GPT response structure for ${countryName}`)
    }

    const wordCount = (content.heroText + content.sceneText + content.tipsText).split(' ').length
    console.log(`   ✅ Generated ~${wordCount} words`)

    // Sanitize all GPT output to prevent XSS
    return {
      countryCode: countryCode.toUpperCase(),
      heroText: sanitizeTextContent(content.heroText),
      sceneHeading: sanitizeTextContent(content.sceneHeading || `Tattoo Culture in ${countryName}`),
      sceneText: sanitizeTextContent(content.sceneText),
      tipsHeading: sanitizeTextContent(content.tipsHeading || `Finding Artists in ${countryName}`),
      tipsText: sanitizeTextContent(content.tipsText),
      keywords: (content.keywords || []).map((k: string) => sanitizeTextContent(k)).filter(Boolean),
      majorCities: (content.majorCities || []).map((c: string) => sanitizeTextContent(c)).filter(Boolean),
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error(`   ❌ Error generating content: ${errorMessage}`)
    throw error
  }
}

async function getCountriesWithArtists(): Promise<Array<{ country_code: string; artist_count: number }>> {
  // Query countries with artists (excluding US which uses city-level content)
  // Uses consolidated get_location_counts function
  const { data, error } = await supabase.rpc('get_location_counts', {
    p_grouping: 'countries'
  })

  if (error) {
    console.error('Error fetching countries:', error)
    return []
  }

  // Filter out US (has city-level content)
  // Map location_code to country_code for downstream compatibility
  return (data || [])
    .filter((c: { location_code: string }) => c.location_code !== 'US')
    .map((c: { location_code: string; artist_count: number }) => ({
      country_code: c.location_code,
      artist_count: c.artist_count
    }))
}

async function getExistingContent(): Promise<Set<string>> {
  const { data, error } = await supabase
    .from('country_editorial_content')
    .select('country_code')

  if (error) {
    console.error('Error fetching existing content:', error)
    return new Set()
  }

  return new Set((data || []).map((c) => c.country_code))
}

async function saveContent(content: CountryEditorialContent): Promise<boolean> {
  const { error } = await supabase.from('country_editorial_content').upsert(
    {
      country_code: content.countryCode,
      hero_text: content.heroText,
      scene_heading: content.sceneHeading,
      scene_text: content.sceneText,
      tips_heading: content.tipsHeading,
      tips_text: content.tipsText,
      keywords: content.keywords,
      major_cities: content.majorCities,
      generated_at: new Date().toISOString(),
      generated_by: 'script',
    },
    { onConflict: 'country_code' }
  )

  if (error) {
    console.error(`   ❌ Error saving content: ${error.message}`)
    return false
  }

  console.log(`   💾 Saved to database`)
  return true
}

async function main() {
  console.log('🚀 Country SEO Content Generator (GPT-4.1)\n')
  console.log('='.repeat(60))

  // Parse CLI arguments
  const args = process.argv.slice(2)
  const limitIndex = args.indexOf('--limit')
  const countryIndex = args.indexOf('--country')

  const limit = limitIndex !== -1 ? parseInt(args[limitIndex + 1], 10) : 5
  const specificCountry = countryIndex !== -1 ? args[countryIndex + 1]?.toUpperCase() : null

  // Get countries with artists
  const countriesWithArtists = await getCountriesWithArtists()
  console.log(`\n📊 Found ${countriesWithArtists.length} non-US countries with artists`)

  // Get existing content
  const existingContent = await getExistingContent()
  console.log(`📝 ${existingContent.size} countries already have content`)

  // Determine which countries to process
  let countriesToProcess = countriesWithArtists.filter((c) => !existingContent.has(c.country_code))

  if (specificCountry) {
    countriesToProcess = countriesWithArtists.filter((c) => c.country_code === specificCountry)
    if (countriesToProcess.length === 0) {
      console.log(`\n❌ Country ${specificCountry} not found or already has content`)
      return
    }
    console.log(`\n🎯 Generating content for specific country: ${specificCountry}`)
  } else {
    // Sort by artist count (most artists first) and apply limit
    countriesToProcess = countriesToProcess
      .sort((a, b) => b.artist_count - a.artist_count)
      .slice(0, limit)

    if (countriesToProcess.length === 0) {
      console.log('\n✅ All countries already have content!')
      return
    }

    console.log(`\n🎯 Processing ${countriesToProcess.length} countries (limit: ${limit})`)
  }

  // Generate content
  let successCount = 0
  let failCount = 0

  for (const country of countriesToProcess) {
    const countryName = getCountryName(country.country_code) || country.country_code

    try {
      const content = await generateCountryContent(
        country.country_code,
        countryName,
        country.artist_count
      )

      if (await saveContent(content)) {
        successCount++
      } else {
        failCount++
      }
    } catch (error) {
      failCount++
    }

    // Rate limit: wait 1 second between requests
    if (countriesToProcess.indexOf(country) < countriesToProcess.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 1000))
    }
  }

  // Summary
  console.log('\n' + '='.repeat(60))
  console.log('📈 Generation Summary')
  console.log('='.repeat(60))
  console.log(`   ✅ Successful: ${successCount}`)
  console.log(`   ❌ Failed: ${failCount}`)
  console.log(`   💰 Estimated cost: ~$${(successCount * 0.10).toFixed(2)} (GPT-4.1 @ ~$0.10/country)`)
}

main().catch(console.error)
