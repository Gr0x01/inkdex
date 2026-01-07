/**
 * Pre-generate SEO content for international miner target countries
 *
 * Run this to populate content for countries BEFORE artists are mined,
 * so pages are ready when artists start appearing.
 */

import OpenAI from 'openai'
import * as dotenv from 'dotenv'
import * as path from 'path'
import { createClient } from '@supabase/supabase-js'

dotenv.config({ path: path.join(__dirname, '../../.env.local') })

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Countries targeted by the 24/7 international miner
const TARGET_COUNTRIES = [
  // Canada
  { code: 'CA', name: 'Canada' },
  // Latin America
  { code: 'MX', name: 'Mexico' },
  { code: 'BR', name: 'Brazil' },
  { code: 'AR', name: 'Argentina' },
  { code: 'CO', name: 'Colombia' },
  { code: 'PE', name: 'Peru' },
  { code: 'CL', name: 'Chile' },
  // Asia-Pacific
  { code: 'JP', name: 'Japan' },
  { code: 'KR', name: 'South Korea' },
  { code: 'SG', name: 'Singapore' },
  { code: 'TH', name: 'Thailand' },
  { code: 'AU', name: 'Australia' },
  { code: 'NZ', name: 'New Zealand' },
  { code: 'ID', name: 'Indonesia' },
  { code: 'PH', name: 'Philippines' },
  { code: 'MY', name: 'Malaysia' },
]

const SYSTEM_PROMPT = `You are an expert tattoo industry writer creating SEO-optimized editorial content for country-level tattoo pages. Your writing should be:
1. Authentic & Knowledgeable: Sound like you know the country's tattoo scene
2. SEO-Optimized: Naturally incorporate country + tattoo keywords
3. Engaging but Concise: Country pages are entry points, not deep dives
4. Culturally Aware: Connect to local art movements, cultural practices, tattoo traditions

TONE: Professional, informative, globally aware. Avoid stereotypes and generalizations.`

function sanitize(text: string): string {
  if (!text || typeof text !== 'string') return ''
  return text.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim().slice(0, 2000)
}

async function generateContent(code: string, name: string): Promise<void> {
  console.log(`\n🌍 Generating for ${name} (${code})...`)

  const prompt = `Generate SEO editorial content for ${name}'s tattoo scene.

OUTPUT FORMAT (JSON):
{
  "heroText": "Single paragraph about what makes ${name}'s tattoo scene unique (80-100 words)",
  "sceneHeading": "Creative heading like 'The ${name} Tattoo Landscape'",
  "sceneText": "Single paragraph about major tattoo cities, popular styles, cultural influences (100-120 words)",
  "tipsHeading": "Creative heading about searching/finding artists",
  "tipsText": "Single paragraph with practical tips (60-80 words)",
  "keywords": ["5 SEO keywords including country name + tattoo terms"],
  "majorCities": ["3-5 major cities known for tattooing"]
}

Be specific to ${name}. Connect tattoo culture to broader cultural context (art, music, traditions).
If ${name} has notable tattoo traditions or history (e.g., Japan's Irezumi, Polynesian traditions), mention it.`

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

  const { error } = await supabase.from('country_editorial_content').upsert(
    {
      country_code: code,
      hero_text: sanitize(content.heroText),
      scene_heading: sanitize(content.sceneHeading || `Tattoo Culture in ${name}`),
      scene_text: sanitize(content.sceneText),
      tips_heading: sanitize(content.tipsHeading || `Finding Artists in ${name}`),
      tips_text: sanitize(content.tipsText),
      keywords: (content.keywords || []).map((k: string) => sanitize(k)),
      major_cities: (content.majorCities || []).map((c: string) => sanitize(c)),
      generated_at: new Date().toISOString(),
      generated_by: 'pre-generation',
    },
    { onConflict: 'country_code' }
  )

  if (error) throw new Error(error.message)

  const wordCount = (content.heroText + content.sceneText + content.tipsText).split(' ').length
  console.log(`   ✅ Saved (~${wordCount} words)`)
}

async function main() {
  console.log('🚀 Pre-generating content for international miner target countries')
  console.log('=' .repeat(60))
  console.log(`\nTargeting ${TARGET_COUNTRIES.length} countries...`)

  let success = 0
  let failed = 0

  for (const country of TARGET_COUNTRIES) {
    try {
      await generateContent(country.code, country.name)
      success++
      // Rate limit: 1.5s between requests
      await new Promise((r) => setTimeout(r, 1500))
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error'
      console.log(`   ❌ Failed: ${msg}`)
      failed++
    }
  }

  console.log('\n' + '=' .repeat(60))
  console.log('📈 Summary')
  console.log(`   ✅ Success: ${success}`)
  console.log(`   ❌ Failed: ${failed}`)
  console.log(`   💰 Estimated cost: ~$${(success * 0.10).toFixed(2)}`)
}

main().catch(console.error)
