/**
 * Content for the /styles hub page
 *
 * Central directory of tattoo styles with brief descriptions
 * Optimized for AI/LLM discoverability - answers "what tattoo styles are there?"
 */

import type { FAQ } from '@/lib/content/types'

export interface StyleSummary {
  slug: string
  name: string
  description: string
  characteristics: string[]
}

export interface StylesHubContent {
  title: string
  metaDescription: string
  publishedAt: string
  updatedAt: string
  hero: {
    headline: string
    subheadline: string
  }
  definition: string
  styles: StyleSummary[]
  faqs: FAQ[]
}

export const stylesHubContent: StylesHubContent = {
  title: 'Tattoo Styles Guide',
  metaDescription:
    'Explore the major tattoo styles: Traditional, Japanese, Realism, Blackwork, and more. Learn what makes each style unique and find artists who specialize in your preferred aesthetic.',
  publishedAt: '2026-01-08',
  updatedAt: '2026-01-08',

  hero: {
    headline: 'Explore Tattoo\u00a0Styles',
    subheadline:
      'From bold Traditional to delicate Fine Line—learn what defines each style and find artists who specialize in your aesthetic.',
  },

  definition:
    '<strong>Tattoo styles are distinct artistic approaches</strong> defined by their techniques, visual characteristics, and cultural origins. Understanding styles helps you communicate with artists and find someone whose work matches your vision. Below are the major styles you\'ll encounter.',

  styles: [
    {
      slug: 'traditional',
      name: 'Traditional',
      description:
        'Bold black outlines, limited color palette (red, green, yellow, blue), and iconic imagery like anchors, roses, and eagles. Also called American Traditional or Old School.',
      characteristics: ['Bold outlines', 'Solid color fills', 'Classic imagery', '2D appearance'],
    },
    {
      slug: 'neo-traditional',
      name: 'Neo-Traditional',
      description:
        'Evolution of Traditional with more colors, detail, and dimension. Keeps bold outlines but adds gradients, broader subject matter, and Art Nouveau influences.',
      characteristics: [
        'Decorative details',
        'Expanded color palette',
        'Bold but refined lines',
        'Modern subjects',
      ],
    },
    {
      slug: 'japanese',
      name: 'Japanese',
      description:
        'Large-scale work featuring dragons, koi fish, cherry blossoms, and waves. Follows compositional rules (wind bars, background patterns) and often covers full sleeves or backs.',
      characteristics: [
        'Full-body coverage',
        'Mythology-inspired',
        'Flowing composition',
        'Background elements',
      ],
    },
    {
      slug: 'realism',
      name: 'Realism',
      description:
        'Photorealistic tattoos that replicate images with accurate shading and detail. Popular for portraits, animals, and nature scenes. Requires highly skilled artists.',
      characteristics: [
        'Photographic accuracy',
        'Complex shading',
        'No outlines',
        'High detail',
      ],
    },
    {
      slug: 'black-and-gray',
      name: 'Black & Gray',
      description:
        'Uses only black ink diluted to various gray tones. Originally from prison tattooing, now refined into elegant work. Often combined with Realism for portraits.',
      characteristics: ['No color', 'Smooth gradients', 'Subtle shading', 'Timeless look'],
    },
    {
      slug: 'blackwork',
      name: 'Blackwork',
      description:
        'Heavy use of solid black ink for bold, graphic designs. Includes geometric patterns, tribal-influenced work, and large black-filled areas.',
      characteristics: ['Solid black fills', 'High contrast', 'Geometric patterns', 'Bold impact'],
    },
    {
      slug: 'fine-line',
      name: 'Fine Line',
      description:
        'Delicate single-needle work with thin, precise lines. Popular for small tattoos, script, and minimalist designs. Requires steady hands and ages differently than bold work.',
      characteristics: [
        'Single needle',
        'Thin lines',
        'Minimalist',
        'Detailed small-scale work',
      ],
    },
    {
      slug: 'watercolor',
      name: 'Watercolor',
      description:
        'Mimics watercolor paintings with splashes, drips, and soft color transitions. Often lacks traditional outlines. Relatively new style that pushes tattoo boundaries.',
      characteristics: ['Color splashes', 'No outlines', 'Soft edges', 'Painterly effect'],
    },
    {
      slug: 'new-school',
      name: 'New School',
      description:
        'Cartoonish, exaggerated style with bright colors and playful subjects. Think graffiti meets animation. Heavy outlines with wild proportions and saturated hues.',
      characteristics: [
        'Cartoon influence',
        'Exaggerated forms',
        'Bright colors',
        'Playful subjects',
      ],
    },
    {
      slug: 'ornamental',
      name: 'Ornamental',
      description:
        'Decorative patterns inspired by henna, mandalas, and architectural ornamentation. Often symmetrical and flows around body contours. Strong geometric and floral elements.',
      characteristics: [
        'Symmetrical patterns',
        'Mandala influence',
        'Body-flow design',
        'Decorative intent',
      ],
    },
    {
      slug: 'anime',
      name: 'Anime',
      description:
        'Inspired by Japanese animation and manga. Features character portraits, vibrant colors, and distinctive anime aesthetics like large eyes and dynamic poses.',
      characteristics: [
        'Anime/manga characters',
        'Vibrant colors',
        'Clean lines',
        'Pop culture subjects',
      ],
    },
  ],

  faqs: [
    {
      question: 'What are the most popular tattoo styles?',
      answer:
        'The most popular tattoo styles are Traditional (American Traditional), Realism, Japanese, Blackwork, and Fine Line. Popularity varies by region—Traditional dominates in the US, while Japanese is especially popular in Asia and among collectors building large-scale pieces.',
    },
    {
      question: 'How do I choose a tattoo style?',
      answer:
        'Start by collecting reference images of tattoos you like—Pinterest and Instagram are good sources. Notice patterns in what you save: Do you prefer bold lines or delicate work? Color or black-and-gray? Large pieces or small? Your preferences will point toward specific styles. Then find artists who specialize in that style.',
    },
    {
      question: 'Can I mix tattoo styles?',
      answer:
        "Yes, many tattoos blend styles. Common combinations include Realism with Black & Gray, Traditional with Neo-Traditional elements, or Fine Line with Watercolor. However, some styles don't mix well aesthetically. Discuss your vision with an artist who has experience in the styles you want to combine.",
    },
    {
      question: 'Which tattoo style lasts the longest?',
      answer:
        'Styles with bold lines and solid color hold up best over time. Traditional and Japanese tattoos are known for aging well because of their strong outlines. Fine Line, Watercolor, and minimalist styles may fade or blur more over time, especially without touch-ups.',
    },
    {
      question: 'Which tattoo style hurts the most?',
      answer:
        "Pain depends more on placement than style. However, styles requiring heavy shading or color packing (like Realism, Blackwork, or Japanese) may feel more intense because they require more passes over the skin. Fine Line work is generally quicker and may hurt less overall.",
    },
    {
      question: 'What tattoo style is best for beginners?',
      answer:
        "There's no wrong style for a first tattoo—choose what you love. That said, smaller Traditional, Fine Line, or Blackwork pieces are popular first tattoos because they're straightforward, heal predictably, and age well. Avoid rushing into large pieces until you understand how your body heals.",
    },
    {
      question: 'How do I find an artist for a specific style?',
      answer:
        'Look for artists who specialize in your chosen style—generalists may not match specialist quality. Check their portfolio for consistency in that style. On Inkdex, you can search by uploading a reference image in your preferred style to find artists whose work matches.',
    },
    {
      question: 'What style should I get for a portrait tattoo?',
      answer:
        'Realism and Black & Gray are the most common styles for portraits. Realism delivers photographic accuracy, while Black & Gray offers a classic, timeless look. Some artists also do Neo-Traditional portraits for a more stylized approach. Always choose an artist with a strong portrait portfolio.',
    },
  ],
}
