/**
 * Generate City Guide Content using GPT-4.1
 *
 * Creates long-form editorial content for city guide pages (~1,500-2,000 words)
 * Includes:
 * - Introduction to the city's tattoo scene
 * - Neighborhood-by-neighborhood breakdown
 * - How local culture shapes tattoo styles
 * - Popular styles and why they thrive
 * - Practical booking and pricing advice
 *
 * Usage:
 *   npx tsx scripts/seo/generate-guide-content.ts
 *   npx tsx scripts/seo/generate-guide-content.ts --limit 5    # Test with 5 cities
 *   npx tsx scripts/seo/generate-guide-content.ts --dry-run    # Preview without saving
 */

import OpenAI from 'openai'
import * as dotenv from 'dotenv'
import * as path from 'path'
import * as fs from 'fs/promises'
import { CITIES, STATES } from '../../lib/constants/cities'
import type { CityGuideContent, NeighborhoodSection } from '../../lib/content/editorial/guides-types'

dotenv.config({ path: path.join(__dirname, '../../.env.local') })

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// Cities that already have guide content
const EXISTING_GUIDES = new Set(['austin', 'los-angeles'])

// Priority cities for generation (major metros first)
const PRIORITY_CITIES = [
  // Tier 1: Top metros
  'new-york', 'chicago', 'houston', 'phoenix', 'philadelphia',
  'san-antonio', 'san-diego', 'dallas', 'san-francisco', 'seattle',
  'denver', 'boston', 'nashville', 'portland', 'las-vegas',
  // Tier 2: Strong second-tier
  'miami', 'atlanta', 'detroit', 'minneapolis', 'new-orleans',
  'cleveland', 'pittsburgh', 'baltimore', 'st-louis', 'tampa',
  // Tier 3: Cultural hubs
  'asheville', 'savannah', 'charleston', 'austin', 'brooklyn',
]

interface GeneratedGuide {
  citySlug: string
  stateSlug: string
  title: string
  metaDescription: string
  introduction: {
    heading: string
    paragraphs: string[]
  }
  neighborhoods: NeighborhoodSection[]
  localCulture: {
    heading: string
    paragraphs: string[]
  }
  styleGuide: {
    heading: string
    paragraphs: string[]
  }
  practicalAdvice: {
    heading: string
    paragraphs: string[]
  }
  keywords: string[]
  relatedStyles: string[]
}

const SYSTEM_PROMPT = `You are an expert tattoo culture writer creating comprehensive city guides. Your writing should be:

1. **Deeply Researched**: Sound like you've actually spent time in these neighborhoods and shops
2. **SEO-Optimized**: Naturally incorporate location + tattoo keywords
3. **Specific**: Reference actual neighborhoods, cultural influences, local characteristics
4. **Balanced**: Cover diversity of styles, price ranges, and artist types
5. **Practical**: Include actionable advice for booking and budgeting

TARGET LENGTH: 1,500-2,000 words total across all sections

TONE: Authoritative but conversational. You're a trusted local guide, not a tourist brochure.

STRUCTURE:
- Introduction (2 paragraphs, 150-200 words): Hook readers with what makes this scene unique
- Neighborhoods (3-5 areas, 100-150 words each): Specific areas with tattoo significance
- Local Culture (3 paragraphs, 200-300 words): How the city's identity shapes its tattoo culture
- Style Guide (3 paragraphs, 200-300 words): What styles dominate and why
- Practical Advice (3 paragraphs, 200-300 words): Pricing, booking, tipping, what to expect

Write in present tense. Be specific about neighborhoods. Connect tattoo culture to broader city identity (music, art, history, demographics, economy).`

async function generateGuideContent(
  cityName: string,
  citySlug: string,
  stateName: string,
  stateSlug: string
): Promise<GeneratedGuide> {
  console.log(`\n   Generating guide for ${cityName}, ${stateName}...`)

  const prompt = `Generate a comprehensive tattoo culture guide for ${cityName}, ${stateName}.

CITY CONTEXT:
- City: ${cityName}, ${stateName}
- Consider: population, cultural identity, economy, demographics, regional character
- Research: key neighborhoods, cultural movements, tattoo history if notable
- Think about: What brings people here? What's the creative scene like?

OUTPUT FORMAT (JSON):
{
  "title": "${cityName} Tattoo Guide - evocative subtitle",
  "metaDescription": "150-160 char SEO description",
  "introduction": {
    "heading": "Creative heading about ${cityName}'s tattoo scene",
    "paragraphs": ["150-200 words", "150-200 words"]
  },
  "neighborhoods": [
    {
      "name": "Neighborhood Name",
      "slug": "neighborhood-slug",
      "description": ["100-150 words", "100-150 words"],
      "characteristics": ["3-4 tags like 'walk-in friendly', 'blackwork specialists'"]
    }
    // 3-5 neighborhoods total
  ],
  "localCulture": {
    "heading": "Creative heading about local influences",
    "paragraphs": ["100-120 words", "100-120 words", "100-120 words"]
  },
  "styleGuide": {
    "heading": "Creative heading about popular styles",
    "paragraphs": ["100-120 words", "100-120 words", "100-120 words"]
  },
  "practicalAdvice": {
    "heading": "Creative heading about booking/pricing",
    "paragraphs": ["100-120 words", "100-120 words", "100-120 words"]
  },
  "keywords": ["6-8 SEO keywords including city name + tattoo terms"],
  "relatedStyles": ["4-6 style slugs from: traditional, neo-traditional, realism, blackwork, illustrative, geometric, fine-line, japanese, tribal, watercolor, minimalist, chicano"]
}

Be specific to ${cityName}. Reference actual neighborhoods. Connect to local culture (music, art, industry, demographics).`

  const response = await openai.chat.completions.create({
    model: 'gpt-4-turbo-2024-04-09',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: prompt },
    ],
    temperature: 0.8,
    response_format: { type: 'json_object' },
  })

  const content = JSON.parse(response.choices[0].message.content || '{}')

  // Validate required fields
  if (
    !content.title ||
    !content.introduction?.paragraphs ||
    !content.neighborhoods?.length ||
    !content.localCulture?.paragraphs ||
    !content.styleGuide?.paragraphs ||
    !content.practicalAdvice?.paragraphs
  ) {
    throw new Error(`Invalid response structure for ${cityName}`)
  }

  console.log(`   ✅ Generated: ${content.title}`)

  return {
    citySlug,
    stateSlug,
    title: content.title,
    metaDescription: content.metaDescription,
    introduction: content.introduction,
    neighborhoods: content.neighborhoods,
    localCulture: content.localCulture,
    styleGuide: content.styleGuide,
    practicalAdvice: content.practicalAdvice,
    keywords: content.keywords || [],
    relatedStyles: content.relatedStyles || [],
  }
}

function formatAsTypeScript(guides: GeneratedGuide[]): string {
  const today = new Date().toISOString().split('T')[0]

  return guides
    .map((guide) => {
      const neighborhoodsStr = guide.neighborhoods
        .map(
          (n) => `      {
        name: '${n.name.replace(/'/g, "\\'")}',
        slug: '${n.slug}',
        description: [
${n.description.map((d) => `          "${d.replace(/"/g, '\\"')}"`).join(',\n')}
        ],
        characteristics: [${n.characteristics.map((c) => `'${c}'`).join(', ')}],
      }`
        )
        .join(',\n')

      return `  {
    citySlug: '${guide.citySlug}',
    stateSlug: '${guide.stateSlug}',
    title: '${guide.title.replace(/'/g, "\\'")}',
    metaDescription: '${guide.metaDescription.replace(/'/g, "\\'")}',
    publishedAt: '${today}',
    updatedAt: '${today}',

    introduction: {
      heading: '${guide.introduction.heading.replace(/'/g, "\\'")}',
      paragraphs: [
${guide.introduction.paragraphs.map((p) => `        "${p.replace(/"/g, '\\"')}"`).join(',\n')}
      ],
    },

    neighborhoods: [
${neighborhoodsStr}
    ],

    localCulture: {
      heading: '${guide.localCulture.heading.replace(/'/g, "\\'")}',
      paragraphs: [
${guide.localCulture.paragraphs.map((p) => `        "${p.replace(/"/g, '\\"')}"`).join(',\n')}
      ],
    },

    styleGuide: {
      heading: '${guide.styleGuide.heading.replace(/'/g, "\\'")}',
      paragraphs: [
${guide.styleGuide.paragraphs.map((p) => `        "${p.replace(/"/g, '\\"')}"`).join(',\n')}
      ],
    },

    practicalAdvice: {
      heading: '${guide.practicalAdvice.heading.replace(/'/g, "\\'")}',
      paragraphs: [
${guide.practicalAdvice.paragraphs.map((p) => `        "${p.replace(/"/g, '\\"')}"`).join(',\n')}
      ],
    },

    keywords: [${guide.keywords.map((k) => `'${k}'`).join(', ')}],
    relatedStyles: [${guide.relatedStyles.map((s) => `'${s}'`).join(', ')}],
  }`
    })
    .join(',\n\n')
}

async function main() {
  console.log('🚀 City Guide Content Generator (GPT-4.1)\n')
  console.log('=' .repeat(60))

  // Parse args
  const args = process.argv.slice(2)
  const limitArg = args.find((a) => a.startsWith('--limit='))
  const limit = limitArg ? parseInt(limitArg.split('=')[1], 10) : undefined
  const dryRun = args.includes('--dry-run')

  // Get cities to generate (exclude existing guides)
  let citiesToGenerate = CITIES.filter((city) => !EXISTING_GUIDES.has(city.slug)).map(
    (city) => {
      const state = STATES.find((s) => s.code === city.state)
      return {
        name: city.name,
        slug: city.slug,
        stateName: state?.name || city.state,
        stateSlug: state?.slug || city.state.toLowerCase().replace(/ /g, '-'),
      }
    }
  )

  // Sort by priority
  citiesToGenerate.sort((a, b) => {
    const aPriority = PRIORITY_CITIES.indexOf(a.slug)
    const bPriority = PRIORITY_CITIES.indexOf(b.slug)
    if (aPriority === -1 && bPriority === -1) return 0
    if (aPriority === -1) return 1
    if (bPriority === -1) return -1
    return aPriority - bPriority
  })

  // Apply limit if specified
  if (limit) {
    citiesToGenerate = citiesToGenerate.slice(0, limit)
  }

  console.log(`\nGenerating guides for ${citiesToGenerate.length} cities...`)
  if (dryRun) {
    console.log('(DRY RUN - no files will be written)\n')
  }

  const generatedGuides: GeneratedGuide[] = []
  let totalCost = 0
  const COST_PER_GUIDE = 0.04 // Estimated GPT-4 cost

  // Generate in batches of 10 to respect rate limits
  const BATCH_SIZE = 10

  for (let i = 0; i < citiesToGenerate.length; i += BATCH_SIZE) {
    const batch = citiesToGenerate.slice(i, i + BATCH_SIZE)
    console.log(
      `\n📦 Batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(citiesToGenerate.length / BATCH_SIZE)}`
    )

    const batchResults = await Promise.allSettled(
      batch.map((city) =>
        generateGuideContent(city.name, city.slug, city.stateName, city.stateSlug)
      )
    )

    batchResults.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        generatedGuides.push(result.value)
        totalCost += COST_PER_GUIDE
      } else {
        console.error(`   ❌ Failed: ${batch[index].name} - ${result.reason.message}`)
      }
    })

    // Rate limit between batches
    if (i + BATCH_SIZE < citiesToGenerate.length) {
      console.log('   ⏳ Waiting 2 seconds...')
      await new Promise((resolve) => setTimeout(resolve, 2000))
    }
  }

  console.log('\n' + '='.repeat(60))
  console.log(`✅ Generated ${generatedGuides.length}/${citiesToGenerate.length} guides`)
  console.log(`Estimated cost: ~$${totalCost.toFixed(2)}`)

  if (dryRun) {
    console.log('\n(DRY RUN - no files written)')
    console.log('\nSample output:')
    console.log(formatAsTypeScript(generatedGuides.slice(0, 1)))
    return
  }

  if (generatedGuides.length === 0) {
    console.log('\nNo guides to save.')
    return
  }

  // Append to guides.ts file
  const guidesFilePath = path.join(__dirname, '../../lib/content/editorial/guides.ts')
  const existingContent = await fs.readFile(guidesFilePath, 'utf-8')

  // Find the closing bracket of CITY_GUIDE_CONTENT array
  const arrayCloseRegex = /(\]\s*\n)(\n\/\*\*|\nexport function)/

  if (!arrayCloseRegex.test(existingContent)) {
    throw new Error('Could not find array closing bracket in guides.ts')
  }

  const newContent = existingContent.replace(
    arrayCloseRegex,
    `,\n\n${formatAsTypeScript(generatedGuides)}\n$1$2`
  )

  await fs.writeFile(guidesFilePath, newContent, 'utf-8')

  console.log(`\n✅ Saved to lib/content/editorial/guides.ts`)
  console.log('\n💡 Next steps:')
  console.log('   1. Review generated content for accuracy')
  console.log('   2. Run npm run build to verify')
  console.log('   3. Submit to IndexNow: npx tsx scripts/seo/submit-guides-indexnow.ts')
}

main().catch(console.error)
