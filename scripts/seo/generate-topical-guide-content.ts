/**
 * Generate Topical Guide Content using GPT-4.1
 *
 * Creates educational content for topical guide pages (~1,500-2,500 words)
 * Topics include:
 * - First tattoo guide
 * - How to choose an artist
 * - Tattoo aftercare
 * - Pain and healing
 * - Tattoo safety
 *
 * Usage:
 *   npx tsx scripts/seo/generate-topical-guide-content.ts
 *   npx tsx scripts/seo/generate-topical-guide-content.ts --dry-run
 */

import OpenAI from 'openai'
import * as dotenv from 'dotenv'
import * as path from 'path'
import * as fs from 'fs/promises'
import type { TopicalGuideContent, GuideStep, TopicalFAQ } from '../../lib/content/editorial/topical-guides-types'

dotenv.config({ path: path.join(__dirname, '../../.env.local') })

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// Define the topics to generate
const TOPICS = [
  {
    slug: 'first-tattoo',
    title: 'Your First Tattoo: The Complete Guide',
    category: 'getting-started' as const,
    prompt: 'A comprehensive guide for someone getting their first tattoo - what to expect, how to prepare, choosing a design, finding an artist, and the process itself.',
  },
  {
    slug: 'how-to-choose-tattoo-artist',
    title: 'How to Choose a Tattoo Artist',
    category: 'choosing' as const,
    prompt: 'How to find and evaluate tattoo artists - portfolio review, red flags, questions to ask, consultations, and what makes a great artist.',
  },
  {
    slug: 'tattoo-aftercare',
    title: 'Tattoo Aftercare: How to Care for Your New Tattoo',
    category: 'aftercare' as const,
    prompt: 'Complete aftercare guide - day-by-day healing, products to use, what to avoid, signs of infection, and long-term care.',
  },
  {
    slug: 'tattoo-pain-guide',
    title: 'Tattoo Pain: What to Expect and How to Manage It',
    category: 'process' as const,
    prompt: 'Understanding tattoo pain - pain levels by body part, factors affecting pain, pain management tips, and what the experience is really like.',
  },
  {
    slug: 'tattoo-placement-guide',
    title: 'Tattoo Placement Guide: Where to Get Your Tattoo',
    category: 'choosing' as const,
    prompt: 'Choosing tattoo placement - visibility considerations, pain by location, how placement affects design, aging, and career/lifestyle factors.',
  },
  {
    slug: 'tattoo-consultation',
    title: 'What to Expect at a Tattoo Consultation',
    category: 'process' as const,
    prompt: 'The consultation process - what to bring, questions to ask, deposit expectations, timeline, and how to communicate your vision.',
  },
  {
    slug: 'tattoo-safety',
    title: 'Tattoo Safety: What You Need to Know',
    category: 'safety' as const,
    prompt: 'Safety in tattooing - licensing, sanitation, needle safety, ink quality, allergies, medical considerations, and red flags to watch for.',
  },
  {
    slug: 'tattoo-cover-ups',
    title: 'Tattoo Cover-Ups: Everything You Need to Know',
    category: 'choosing' as const,
    prompt: 'Guide to cover-up tattoos - when cover-ups work, design considerations, finding a cover-up specialist, and alternatives like removal.',
  },
  {
    slug: 'small-tattoos-guide',
    title: 'Small Tattoos: Design Ideas and Considerations',
    category: 'choosing' as const,
    prompt: 'Guide to small tattoos - design limitations, placement options, aging considerations, pricing, and what works well at small scale.',
  },
  {
    slug: 'tattoo-pricing',
    title: 'How Much Do Tattoos Cost? A Complete Pricing Guide',
    category: 'getting-started' as const,
    prompt: 'Understanding tattoo pricing - hourly rates vs flat rates, factors affecting cost, tipping etiquette, and budgeting for your tattoo.',
  },
]

interface GeneratedTopicalGuide {
  topicSlug: string
  title: string
  metaDescription: string
  category: 'getting-started' | 'aftercare' | 'choosing' | 'process' | 'safety'
  introduction: {
    heading?: string
    paragraphs: string[]
  }
  sections: Array<{
    heading: string
    paragraphs: string[]
  }>
  steps?: GuideStep[]
  keyTakeaways: string[]
  faqs: TopicalFAQ[]
  keywords: string[]
  relatedTopics: string[]
  relatedStyles: string[]
}

const SYSTEM_PROMPT = `You are an expert tattoo culture writer creating educational guides. Your writing should be:

1. **Accurate & Trustworthy**: Sound like an experienced tattoo artist or industry professional
2. **SEO-Optimized**: Naturally incorporate relevant keywords
3. **Practical**: Give actionable, specific advice
4. **Reassuring**: Address common fears and concerns
5. **Complete**: Cover the topic thoroughly

TARGET LENGTH: 1,500-2,500 words total

TONE: Friendly expert. You're a knowledgeable friend helping someone navigate the tattoo world.

Be specific with advice. Include real numbers when relevant (prices, healing times, etc.). Address common misconceptions.`

async function generateTopicalGuideContent(
  topic: typeof TOPICS[0]
): Promise<GeneratedTopicalGuide> {
  console.log(`\n   Generating guide: ${topic.title}...`)

  const prompt = `Generate a comprehensive educational guide about: "${topic.title}"

TOPIC CONTEXT:
- Slug: ${topic.slug}
- Category: ${topic.category}
- Focus: ${topic.prompt}

OUTPUT FORMAT (JSON):
{
  "title": "${topic.title}",
  "metaDescription": "150-160 char SEO description",
  "introduction": {
    "heading": "Optional intro heading",
    "paragraphs": ["150-200 words across 2 paragraphs - hook and overview"]
  },
  "sections": [
    {
      "heading": "Section Title",
      "paragraphs": ["200-400 words per section - detailed content"]
    }
    // 4-6 main content sections
  ],
  "steps": [
    // Optional - only include if this is a how-to guide
    {
      "number": 1,
      "title": "Step Title",
      "description": ["Step details"],
      "tips": ["Optional tips for this step"]
    }
  ],
  "keyTakeaways": ["5-7 bullet point takeaways"],
  "faqs": [
    {
      "question": "Common question about this topic?",
      "answer": "Detailed answer"
    }
    // 4-6 FAQs
  ],
  "keywords": ["8-10 SEO keywords"],
  "relatedTopics": ["3-5 related topic slugs from: first-tattoo, how-to-choose-tattoo-artist, tattoo-aftercare, tattoo-pain-guide, tattoo-placement-guide, tattoo-consultation, tattoo-safety, tattoo-cover-ups, small-tattoos-guide, tattoo-pricing"],
  "relatedStyles": ["3-5 style slugs if relevant: traditional, neo-traditional, realism, blackwork, illustrative, japanese, tribal, watercolor, minimalist, black-and-gray"]
}

Make it genuinely helpful. Include specific advice, real numbers, and address common concerns.`

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
    !content.sections?.length ||
    !content.keyTakeaways?.length ||
    !content.faqs?.length
  ) {
    throw new Error(`Invalid response structure for ${topic.title}`)
  }

  console.log(`   ✅ Generated: ${content.title}`)

  return {
    topicSlug: topic.slug,
    title: content.title,
    metaDescription: content.metaDescription,
    category: topic.category,
    introduction: content.introduction,
    sections: content.sections,
    steps: content.steps,
    keyTakeaways: content.keyTakeaways,
    faqs: content.faqs,
    keywords: content.keywords || [],
    relatedTopics: content.relatedTopics || [],
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

function formatAsTypeScript(guides: GeneratedTopicalGuide[]): string {
  const today = new Date().toISOString().split('T')[0]

  const entries = guides.map((guide) => {
    const sectionsStr = guide.sections
      .map(
        (s) => `    {
      heading: '${escapeString(s.heading)}',
      paragraphs: [
${s.paragraphs.map((p) => `        "${escapeString(p)}"`).join(',\n')}
      ],
    }`
      )
      .join(',\n')

    const stepsStr = guide.steps
      ? `steps: [
${guide.steps
          .map(
            (step) => `    {
      number: ${step.number},
      title: '${escapeString(step.title)}',
      description: [
${step.description.map((d) => `        "${escapeString(d)}"`).join(',\n')}
      ],
      ${step.tips ? `tips: [${step.tips.map((t) => `'${escapeString(t)}'`).join(', ')}],` : ''}
    }`
          )
          .join(',\n')}
    ],`
      : ''

    const faqsStr = guide.faqs
      .map(
        (faq) => `    {
      question: '${escapeString(faq.question)}',
      answer: "${escapeString(faq.answer)}",
    }`
      )
      .join(',\n')

    return `  {
    topicSlug: '${guide.topicSlug}',
    title: '${escapeString(guide.title)}',
    metaDescription: '${escapeString(guide.metaDescription)}',
    category: '${guide.category}',
    publishedAt: '${today}',
    updatedAt: '${today}',

    introduction: {
      ${guide.introduction.heading ? `heading: '${escapeString(guide.introduction.heading)}',` : ''}
      paragraphs: [
${guide.introduction.paragraphs.map((p) => `        "${escapeString(p)}"`).join(',\n')}
      ],
    },

    sections: [
${sectionsStr}
    ],

    ${stepsStr}

    keyTakeaways: [
${guide.keyTakeaways.map((t) => `      '${escapeString(t)}'`).join(',\n')}
    ],

    faqs: [
${faqsStr}
    ],

    keywords: [${guide.keywords.map((k) => `'${escapeString(k)}'`).join(', ')}],
    relatedTopics: [${guide.relatedTopics.map((t) => `'${t}'`).join(', ')}],
    relatedStyles: [${guide.relatedStyles.map((s) => `'${s}'`).join(', ')}],
  }`
  })

  return `/**
 * Topical Guide Editorial Content
 *
 * Educational guides targeting informational search intent
 * e.g., "first tattoo guide", "tattoo aftercare", "how to choose tattoo artist"
 *
 * Each guide is ~1,500-2,500 words of practical advice
 */

import type { TopicalGuideContent } from './topical-guides-types'

export const TOPICAL_GUIDE_CONTENT: TopicalGuideContent[] = [
${entries.join(',\n\n')}
]

/**
 * Get guide content for a specific topic
 */
export function getTopicalGuide(topicSlug: string): TopicalGuideContent | undefined {
  return TOPICAL_GUIDE_CONTENT.find((guide) => guide.topicSlug === topicSlug)
}

/**
 * Get all available topical guides
 */
export function getAllTopicalGuides(): TopicalGuideContent[] {
  return TOPICAL_GUIDE_CONTENT
}

/**
 * Get guides by category
 */
export function getTopicalGuidesByCategory(category: string): TopicalGuideContent[] {
  return TOPICAL_GUIDE_CONTENT.filter((guide) => guide.category === category)
}

/**
 * Check if a guide exists for a topic
 */
export function hasTopicalGuide(topicSlug: string): boolean {
  return TOPICAL_GUIDE_CONTENT.some((guide) => guide.topicSlug === topicSlug)
}
`
}

async function main() {
  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry-run')

  console.log('🚀 Topical Guide Content Generator (GPT-4.1)')
  console.log('='.repeat(60))

  if (dryRun) {
    console.log('DRY RUN - will not save to file\n')
  }

  console.log(`\nGenerating guides for ${TOPICS.length} topics...\n`)

  const guides: GeneratedTopicalGuide[] = []
  const BATCH_SIZE = 3

  for (let i = 0; i < TOPICS.length; i += BATCH_SIZE) {
    const batch = TOPICS.slice(i, i + BATCH_SIZE)
    console.log(`\n📦 Batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(TOPICS.length / BATCH_SIZE)}`)

    const batchResults = await Promise.all(
      batch.map((topic) =>
        generateTopicalGuideContent(topic).catch((err) => {
          console.error(`   ❌ Failed to generate ${topic.title}: ${err.message}`)
          return null
        })
      )
    )

    guides.push(...batchResults.filter((g): g is GeneratedTopicalGuide => g !== null))

    // Rate limiting pause between batches
    if (i + BATCH_SIZE < TOPICS.length) {
      console.log('   ⏳ Waiting 2 seconds...')
      await new Promise((resolve) => setTimeout(resolve, 2000))
    }
  }

  console.log(`\n${'='.repeat(60)}`)
  console.log(`✅ Generated ${guides.length}/${TOPICS.length} guides`)
  console.log(`Estimated cost: ~$${(guides.length * 0.05).toFixed(2)}`)

  if (!dryRun) {
    const outputPath = path.join(__dirname, '../../lib/content/editorial/topical-guides.ts')
    const content = formatAsTypeScript(guides)
    await fs.writeFile(outputPath, content, 'utf-8')
    console.log(`\n✅ Saved to ${outputPath}`)
  }

  console.log('\n💡 Next steps:')
  console.log('   1. Review generated content for accuracy')
  console.log('   2. Create /guides/[topic] route')
  console.log('   3. Run npm run build to verify')
}

main().catch(console.error)
