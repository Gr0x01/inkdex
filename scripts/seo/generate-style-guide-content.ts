/**
 * Generate Style Guide Content using GPT-4.1
 *
 * Creates long-form editorial content for style guide pages (~1,500-2,000 words)
 * Includes:
 * - Introduction to the style
 * - History and origins
 * - Visual characteristics and techniques
 * - Variations and sub-styles
 * - What to expect (pain, sessions, healing)
 * - How to find the right artist
 *
 * Usage:
 *   npx tsx scripts/seo/generate-style-guide-content.ts
 *   npx tsx scripts/seo/generate-style-guide-content.ts --dry-run
 */

import OpenAI from 'openai'
import * as dotenv from 'dotenv'
import * as path from 'path'
import * as fs from 'fs/promises'
import { styleSeedsData } from '../style-seeds/style-seeds-data'
import type { StyleGuideContent, StyleVariation } from '../../lib/content/editorial/style-guides-types'

dotenv.config({ path: path.join(__dirname, '../../.env.local') })

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

interface GeneratedStyleGuide {
  styleSlug: string
  displayName: string
  title: string
  metaDescription: string
  introduction: {
    heading: string
    paragraphs: string[]
  }
  history: {
    heading: string
    paragraphs: string[]
  }
  characteristics: {
    heading: string
    paragraphs: string[]
  }
  variations: StyleVariation[]
  expectations: {
    heading: string
    paragraphs: string[]
  }
  findingArtist: {
    heading: string
    paragraphs: string[]
  }
  keywords: string[]
  relatedStyles: string[]
}

const SYSTEM_PROMPT = `You are an expert tattoo culture writer creating comprehensive style guides. Your writing should be:

1. **Deeply Researched**: Sound like a tattoo historian and industry insider
2. **SEO-Optimized**: Naturally incorporate style + tattoo keywords
3. **Educational**: Explain techniques, history, and cultural significance
4. **Practical**: Include actionable advice for people considering this style
5. **Accurate**: Use correct terminology and historical facts

TARGET LENGTH: 1,500-2,000 words total across all sections

TONE: Authoritative but accessible. You're educating someone who's genuinely curious about tattoo art.

STRUCTURE:
- Introduction (2 paragraphs, 150-200 words): What defines this style, why people love it
- History (3 paragraphs, 200-300 words): Origins, evolution, key figures
- Characteristics (3 paragraphs, 200-300 words): Visual elements, techniques, colors
- Variations (2-4 sub-styles, 100-150 words each): Regional or artistic variations
- Expectations (3 paragraphs, 200-300 words): Pain, sessions, healing, best placements
- Finding an Artist (2 paragraphs, 150-200 words): Portfolio tips, questions to ask

Be specific about techniques. Reference real history. Connect to broader art movements when relevant.`

async function generateStyleGuideContent(
  styleSlug: string,
  displayName: string,
  existingDescription: string
): Promise<GeneratedStyleGuide> {
  console.log(`\n   Generating guide for ${displayName}...`)

  const prompt = `Generate a comprehensive tattoo style guide for "${displayName}" tattoos.

STYLE CONTEXT:
- Style Name: ${displayName}
- Slug: ${styleSlug}
- Brief Description: ${existingDescription}

OUTPUT FORMAT (JSON):
{
  "title": "${displayName} Tattoos: A Complete Guide",
  "metaDescription": "150-160 char SEO description about ${displayName} tattoos",
  "introduction": {
    "heading": "What is ${displayName} Tattooing?",
    "paragraphs": ["150-200 words total across 2 paragraphs"]
  },
  "history": {
    "heading": "The History of ${displayName} Tattoos",
    "paragraphs": ["200-300 words across 3 paragraphs - origins, evolution, key figures"]
  },
  "characteristics": {
    "heading": "Visual Characteristics & Techniques",
    "paragraphs": ["200-300 words across 3 paragraphs - what makes this style distinct"]
  },
  "variations": [
    {
      "name": "Variation Name",
      "slug": "variation-slug",
      "description": ["100-150 words across 1-2 paragraphs"],
      "characteristics": ["3-5 defining features"]
    }
    // 2-4 variations total
  ],
  "expectations": {
    "heading": "What to Expect",
    "paragraphs": ["200-300 words across 3 paragraphs - pain, sessions, healing, placement"]
  },
  "findingArtist": {
    "heading": "Finding the Right Artist",
    "paragraphs": ["150-200 words across 2 paragraphs - portfolio tips, questions"]
  },
  "keywords": ["8-10 SEO keywords for ${displayName} tattoos"],
  "relatedStyles": ["3-5 related style slugs from: traditional, neo-traditional, realism, blackwork, illustrative, geometric, fine-line, japanese, tribal, watercolor, minimalist, black-and-gray, anime, horror, new-school"]
}

Be historically accurate. Use proper tattoo terminology. Make it educational and engaging.`

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

  // Validate required fields
  if (
    !content.title ||
    !content.introduction?.paragraphs ||
    !content.history?.paragraphs ||
    !content.characteristics?.paragraphs ||
    !content.variations?.length ||
    !content.expectations?.paragraphs ||
    !content.findingArtist?.paragraphs
  ) {
    throw new Error(`Invalid response structure for ${displayName}`)
  }

  console.log(`   ✅ Generated: ${content.title}`)

  return {
    styleSlug,
    displayName,
    title: content.title,
    metaDescription: content.metaDescription,
    introduction: content.introduction,
    history: content.history,
    characteristics: content.characteristics,
    variations: content.variations,
    expectations: content.expectations,
    findingArtist: content.findingArtist,
    keywords: content.keywords || [],
    relatedStyles: content.relatedStyles || [],
  }
}

function escapeString(str: string): string {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
}

function formatAsTypeScript(guides: GeneratedStyleGuide[]): string {
  const today = new Date().toISOString().split('T')[0]

  const entries = guides.map((guide) => {
    const variationsStr = guide.variations
      .map(
        (v) => `      {
        name: '${escapeString(v.name)}',
        slug: '${v.slug}',
        description: [
${v.description.map((d) => `          "${escapeString(d)}"`).join(',\n')}
        ],
        characteristics: [${v.characteristics.map((c) => `'${escapeString(c)}'`).join(', ')}],
      }`
      )
      .join(',\n')

    return `  {
    styleSlug: '${guide.styleSlug}',
    displayName: '${guide.displayName}',
    title: '${escapeString(guide.title)}',
    metaDescription: '${escapeString(guide.metaDescription)}',
    publishedAt: '${today}',
    updatedAt: '${today}',

    introduction: {
      heading: '${escapeString(guide.introduction.heading)}',
      paragraphs: [
${guide.introduction.paragraphs.map((p) => `        "${escapeString(p)}"`).join(',\n')}
      ],
    },

    history: {
      heading: '${escapeString(guide.history.heading)}',
      paragraphs: [
${guide.history.paragraphs.map((p) => `        "${escapeString(p)}"`).join(',\n')}
      ],
    },

    characteristics: {
      heading: '${escapeString(guide.characteristics.heading)}',
      paragraphs: [
${guide.characteristics.paragraphs.map((p) => `        "${escapeString(p)}"`).join(',\n')}
      ],
    },

    variations: [
${variationsStr}
    ],

    expectations: {
      heading: '${escapeString(guide.expectations.heading)}',
      paragraphs: [
${guide.expectations.paragraphs.map((p) => `        "${escapeString(p)}"`).join(',\n')}
      ],
    },

    findingArtist: {
      heading: '${escapeString(guide.findingArtist.heading)}',
      paragraphs: [
${guide.findingArtist.paragraphs.map((p) => `        "${escapeString(p)}"`).join(',\n')}
      ],
    },

    keywords: [${guide.keywords.map((k) => `'${escapeString(k)}'`).join(', ')}],
    relatedStyles: [${guide.relatedStyles.map((s) => `'${s}'`).join(', ')}],
  }`
  })

  return `/**
 * Style Guide Editorial Content
 *
 * Long-form guides targeting informational search intent
 * e.g., "what is traditional tattoo", "blackwork tattoo guide"
 *
 * Each guide is ~1,500-2,000 words and covers:
 * - Introduction to the style
 * - History and origins
 * - Visual characteristics
 * - Variations and sub-styles
 * - What to expect
 * - Finding an artist
 */

import type { StyleGuideContent } from './style-guides-types'

export const STYLE_GUIDE_CONTENT: StyleGuideContent[] = [
${entries.join(',\n\n')}
]

/**
 * Get guide content for a specific style
 */
export function getStyleGuide(styleSlug: string): StyleGuideContent | undefined {
  return STYLE_GUIDE_CONTENT.find((guide) => guide.styleSlug === styleSlug)
}

/**
 * Get all available style guides
 */
export function getAllStyleGuides(): StyleGuideContent[] {
  return STYLE_GUIDE_CONTENT
}

/**
 * Check if a guide exists for a style
 */
export function hasStyleGuide(styleSlug: string): boolean {
  return STYLE_GUIDE_CONTENT.some((guide) => guide.styleSlug === styleSlug)
}
`
}

async function main() {
  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry-run')

  console.log('🚀 Style Guide Content Generator (GPT-4.1)')
  console.log('='.repeat(60))

  if (dryRun) {
    console.log('DRY RUN - will not save to file\n')
  }

  // Get all styles from seed data
  const styles = styleSeedsData.map((s) => ({
    slug: s.styleName,
    displayName: s.displayName,
    description: s.description,
  }))

  console.log(`\nGenerating guides for ${styles.length} styles...\n`)

  const guides: GeneratedStyleGuide[] = []
  const BATCH_SIZE = 5

  for (let i = 0; i < styles.length; i += BATCH_SIZE) {
    const batch = styles.slice(i, i + BATCH_SIZE)
    console.log(`\n📦 Batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(styles.length / BATCH_SIZE)}`)

    const batchResults = await Promise.all(
      batch.map((style) =>
        generateStyleGuideContent(style.slug, style.displayName, style.description).catch((err) => {
          console.error(`   ❌ Failed to generate ${style.displayName}: ${err.message}`)
          return null
        })
      )
    )

    guides.push(...batchResults.filter((g): g is GeneratedStyleGuide => g !== null))

    // Rate limiting pause between batches
    if (i + BATCH_SIZE < styles.length) {
      console.log('   ⏳ Waiting 2 seconds...')
      await new Promise((resolve) => setTimeout(resolve, 2000))
    }
  }

  console.log(`\n${'='.repeat(60)}`)
  console.log(`✅ Generated ${guides.length}/${styles.length} guides`)
  console.log(`Estimated cost: ~$${(guides.length * 0.04).toFixed(2)}`)

  if (!dryRun) {
    const outputPath = path.join(__dirname, '../../lib/content/editorial/style-guides.ts')
    const content = formatAsTypeScript(guides)
    await fs.writeFile(outputPath, content, 'utf-8')
    console.log(`\n✅ Saved to ${outputPath}`)
  }

  console.log('\n💡 Next steps:')
  console.log('   1. Review generated content for accuracy')
  console.log('   2. Create /guides/styles/[style] route')
  console.log('   3. Run npm run build to verify')
}

main().catch(console.error)
