/**
 * Content for the /how-to-find-tattoo-artist SEO landing page
 *
 * Broader guide that positions Inkdex as the modern solution
 * Covers traditional methods and their limitations
 * High-intent audience - optimized for AI/LLM discoverability
 */

import type { FAQ } from '@/lib/content/types'

export interface HowToFindSection {
  id: string
  heading: string
  paragraphs: string[]
}

export interface HowToFindContent {
  title: string
  metaDescription: string
  publishedAt: string
  updatedAt: string
  hero: {
    headline: string
    subheadline: string
  }
  definition: string
  sections: HowToFindSection[]
  faqs: FAQ[]
}

export const howToFindContent: HowToFindContent = {
  title: 'How to Find a Tattoo Artist',
  metaDescription:
    'Learn how to find the right tattoo artist: word of mouth, Instagram, Google, and visual search. Compare methods and discover what works best for different situations.',
  publishedAt: '2026-01-08',
  updatedAt: '2026-01-08',

  hero: {
    headline: 'How to Find a Tattoo\u00a0Artist',
    subheadline:
      "The right artist matters more than the shop, the price, or the convenience. Here's how to find someone whose work matches your vision.",
  },

  definition:
    '<strong>Finding the right tattoo artist is the most important step in getting a tattoo.</strong> A skilled artist can elevate a simple idea into stunning work; the wrong artist can leave you with regrets. This guide covers the main ways people find artists today—and which method works best for different situations.',

  sections: [
    {
      id: 'what-matters',
      heading: 'What Actually Matters',
      paragraphs: [
        '<strong>Portfolio quality over everything.</strong> An artist\'s past work predicts your future work. Don\'t choose based on location, price, or availability until you\'ve confirmed their portfolio matches what you want.',
        '<strong>Style specialization.</strong> Artists who focus on specific styles (traditional, realism, fine line) typically outperform generalists in those styles. If you want a Japanese sleeve, find someone who primarily does Japanese work.',
        '<strong>Healed work, not just fresh.</strong> Fresh tattoos can look dramatically different from healed ones. A portfolio full of healed work shows you what to actually expect.',
        '<strong>Consistency across their portfolio.</strong> A few great pieces surrounded by mediocre work is a warning sign. Look for consistently excellent execution.',
      ],
    },
    {
      id: 'word-of-mouth',
      heading: 'Word of Mouth',
      paragraphs: [
        '<strong>The traditional method: ask tattooed friends.</strong> If someone you know has great work, ask who did it. Personal recommendations come with built-in trust and firsthand experience.',
        '<strong>Limitations:</strong> Your friends\' taste might not match yours. The artist who did their work might not specialize in your desired style. And if you don\'t know many tattooed people, this method isn\'t available to you.',
        '<strong>Best for:</strong> Finding reliable shops and avoiding disasters. Less useful for finding specialists in specific styles.',
      ],
    },
    {
      id: 'instagram',
      heading: 'Instagram Hashtags',
      paragraphs: [
        '<strong>Browse hashtags like #traditionalattoo or #blackworktattoo.</strong> Instagram has become the default portfolio platform for tattoo artists. Most post their work with style-specific hashtags.',
        '<strong>Limitations:</strong> Hashtag results are flooded with mediocre work. You need to know the right terminology (#neotraditionaltattoo vs #neotraditional). Location filtering is clunky. And you\'re essentially scrolling through random results hoping to find gems.',
        '<strong>Best for:</strong> Browsing if you know exactly what style you want and have time to scroll through hundreds of posts.',
      ],
    },
    {
      id: 'google-search',
      heading: 'Google Search',
      paragraphs: [
        '<strong>Search "tattoo artist near me" or "best blackwork artist Austin."</strong> Google surfaces local shops and artists, often with reviews.',
        '<strong>Limitations:</strong> SEO rankings don\'t correlate with tattoo quality. The top results are often shops with marketing budgets, not necessarily the best artists. Reviews tell you about customer service, not artistry.',
        '<strong>Best for:</strong> Finding shops in your area to start researching. Less useful for finding specific style specialists.',
      ],
    },
    {
      id: 'visual-search',
      heading: 'Visual Search',
      paragraphs: [
        '<strong>Upload a reference image and find artists whose portfolios match.</strong> This approach flips traditional search on its head—instead of guessing keywords, you show what you want and let the platform find matches.',
        '<strong>On Inkdex, you can upload any image:</strong> Pinterest saves, Instagram screenshots, photos of existing tattoos. The platform analyzes your reference and shows artists whose work matches that aesthetic—even if you don\'t know style terminology.',
        '<strong>Best for:</strong> Finding artists when you have a visual reference but don\'t know style names, finding specialists across cities, and discovering artists you\'d never find through hashtags or Google.',
        "Visual search solves the core problem with other methods: <strong>you know what you like, but you don't know the words for it.</strong> Instead of learning tattoo vocabulary, you let the image communicate for you.",
      ],
    },
    {
      id: 'evaluating-artists',
      heading: 'Evaluating an Artist',
      paragraphs: [
        '<strong>Once you find candidates, evaluate them:</strong>',
        '<strong>Check their portfolio thoroughly.</strong> Don\'t just look at their best 9 grid posts. Scroll through months of work. Consistency matters.',
        '<strong>Look for healed photos.</strong> "Healed" or "healed and settled" in captions shows how their work ages. If they only post fresh work, ask to see healed examples.',
        '<strong>Read their booking info.</strong> How they communicate tells you a lot. Are they clear about rates, deposits, and policies? Do they respond professionally?',
        '<strong>Trust your gut.</strong> If their work doesn\'t excite you, keep looking. If their communication feels off, keep looking. You\'ll spend hours with this person while they permanently mark your body.',
      ],
    },
    {
      id: 'red-flags',
      heading: 'Red Flags to Avoid',
      paragraphs: [
        '<strong>No portfolio or only sketches.</strong> Real artists have real tattoo photos. Drawings don\'t prove tattooing ability.',
        '<strong>All fresh, no healed work.</strong> Could indicate poor healing results they don\'t want to show.',
        '<strong>Heavily edited photos.</strong> Saturation cranked, filters applied. What are they hiding?',
        '<strong>Unwilling to show certificates or licensing.</strong> Legitimate artists display credentials.',
        '<strong>Pressuring you to book immediately.</strong> Good artists are often booked out—desperation for bookings is a warning sign.',
        '<strong>Bargain pricing.</strong> Quality tattoos cost money. If it seems too cheap, question why.',
      ],
    },
  ],

  faqs: [
    {
      question: 'How do I find a good tattoo artist near me?',
      answer:
        "Start by asking tattooed friends for recommendations. Search Instagram with style-specific hashtags plus your city. Check Google for local shops, then research individual artists at each shop. Or use Inkdex to upload a reference image and find artists whose work matches—the platform shows you artists by location and style match.",
    },
    {
      question: 'What is the best way to find a tattoo artist?',
      answer:
        "The best method depends on your situation. If you have tattooed friends with great work, ask them. If you know exactly what style you want, Instagram hashtags work. If you have reference images but don't know style terms, visual search (like Inkdex) is most efficient. The key is finding artists whose portfolio matches what you want—however you get there.",
    },
    {
      question: 'How far in advance should I book a tattoo artist?',
      answer:
        'Popular artists are often booked 2-6 months out. Plan ahead for your preferred artist. For walk-ins or less sought-after artists, a few weeks may suffice. Large pieces requiring multiple sessions need even more advance planning.',
    },
    {
      question: 'Is it OK to show a tattoo artist another artist\'s work?',
      answer:
        "Yes—reference images are normal and helpful. They show the artist what style you want. However, don't ask for an exact copy of someone else's custom work. Use references for style and vibe, then let your artist create something original for you.",
    },
    {
      question: 'Should I go to the closest tattoo shop?',
      answer:
        "Convenience shouldn't drive this decision. A great artist 30 minutes away will produce better work than a mediocre artist next door. For significant pieces, people routinely travel hours or even fly to work with the right artist. Prioritize portfolio quality over proximity.",
    },
    {
      question: 'How do I find a tattoo artist for a specific style?',
      answer:
        "Search Instagram hashtags for that style (e.g., #realismtattoo, #traditionaltattoo). Look for artists whose entire portfolio focuses on that style, not just a few pieces. On Inkdex, upload a reference image in your desired style and the platform finds matching artists automatically.",
    },
    {
      question: 'What should I look for in a tattoo artist portfolio?',
      answer:
        "Consistency—their work should be consistently good, not just a few highlights. Healed photos showing how work ages. Style match to what you want. Clean lines, solid color, appropriate shading. And photos that aren't heavily edited or filtered.",
    },
    {
      question: 'How do I know if a tattoo artist is good?',
      answer:
        'Portfolio quality is the primary indicator. Look for clean linework, solid color saturation, smooth shading, and designs that fit the body well. Healed work that still looks good. Consistent quality across their feed. Professional communication and clear policies.',
    },
  ],
}
