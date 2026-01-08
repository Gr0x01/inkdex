/**
 * Content for the /how-it-works SEO landing page
 *
 * Explains visual search for users (not artists)
 * Optimized for AI/LLM discoverability
 */

import type { FAQ } from '@/lib/content/types'

export interface HowItWorksSection {
  id: string
  heading: string
  paragraphs: string[]
}

export interface HowItWorksContent {
  title: string
  metaDescription: string
  publishedAt: string
  updatedAt: string
  hero: {
    headline: string
    subheadline: string
  }
  definition: string
  sections: HowItWorksSection[]
  faqs: FAQ[]
}

export const howItWorksContent: HowItWorksContent = {
  title: 'How Inkdex Works',
  metaDescription:
    'Inkdex uses visual search to help you find tattoo artists. Upload a reference image and see artists whose portfolios match your style. No hashtags or style terms needed.',
  publishedAt: '2026-01-08',
  updatedAt: '2026-01-08',

  hero: {
    headline: 'Find Tattoo Artists by\u00a0Style',
    subheadline:
      'Upload a reference image and see artists whose work matches. No hashtags to guess, no style terms to learn.',
  },

  definition:
    '<strong>Inkdex is a visual search platform for finding tattoo artists.</strong> Instead of searching by keywords or scrolling through hashtags, you upload a reference image and Inkdex shows you artists whose portfolios match that style. The platform is free to use and covers 116 cities across all 50 US states.',

  sections: [
    {
      id: 'visual-search',
      heading: 'Visual Search',
      paragraphs: [
        '<strong>Search with images, not words.</strong> You probably have a Pinterest board, saved Instagram posts, or screenshots of tattoos you love. Upload any of those and Inkdex finds artists whose work looks similar.',
        "You don't need to know what style you're looking for. Most people can't tell the difference between neo-traditional and new school—and that's fine. <strong>Just upload what you like and let the image do the talking.</strong>",
      ],
    },
    {
      id: 'how-to-search',
      heading: 'How to Search',
      paragraphs: [
        '<strong>Step 1: Upload your reference.</strong> Drag and drop an image, paste from clipboard, or click to browse. Works with Pinterest screenshots, Instagram saves, photos of real tattoos—anything visual.',
        '<strong>Step 2: See your matches.</strong> Inkdex analyzes your image and shows artists whose portfolios match that aesthetic. Each result shows a match percentage and sample work.',
        '<strong>Step 3: Browse portfolios.</strong> Click any artist to see their full portfolio, location, and style breakdown. Find someone whose work consistently matches what you want.',
        '<strong>Step 4: Connect directly.</strong> Every artist profile links to their Instagram. DM them directly to discuss your piece—no middleman, no booking fees.',
      ],
    },
    {
      id: 'what-you-can-search',
      heading: 'What You Can Search',
      paragraphs: [
        '<strong>Reference images:</strong> Pinterest saves, Instagram screenshots, photos from tattoo magazines, pictures of existing tattoos you admire.',
        '<strong>Text descriptions:</strong> If you don\'t have an image, describe what you want. "Dark floral with fine lines" or "Japanese dragon sleeve" works too.',
        '<strong>Instagram links:</strong> Paste a link to an Instagram post or profile. Inkdex extracts the image and finds similar artists.',
      ],
    },
    {
      id: 'filtering-results',
      heading: 'Filtering Results',
      paragraphs: [
        '<strong>Filter by location.</strong> Search globally, then narrow down to your city or state. Useful if you want someone local or are planning to travel for the right artist.',
        '<strong>Filter by style.</strong> Once you see results, filter by styles like blackwork, realism, or traditional. Helpful when your reference image spans multiple aesthetics.',
      ],
    },
    {
      id: 'why-visual-search',
      heading: 'Why Visual Search?',
      paragraphs: [
        'Traditional search requires knowing the right words. <strong>Google needs artist names. Instagram needs hashtags. Both assume you already know what you\'re looking for.</strong>',
        'Visual search flips that around. You show us what you like, and we find who creates it. It\'s how you naturally think about tattoos—in images, not terminology.',
        "This is especially useful for first-time tattoo seekers who don't know style names, people with reference images but no idea where to start, and anyone tired of scrolling through generic hashtag results.",
      ],
    },
    {
      id: 'search-results',
      heading: 'What You See in Results',
      paragraphs: [
        '<strong>Each search result shows a match percentage</strong> indicating how closely an artist\'s portfolio matches your reference. Higher percentages mean stronger visual similarity.',
        '<strong>Pro artists get enhanced visibility.</strong> Their cards display larger with more portfolio images and priority placement in results. Free profiles still appear—Pro just stands out more.',
      ],
    },
  ],

  faqs: [
    {
      question: 'Is Inkdex free to use?',
      answer:
        'Yes, Inkdex is completely free for people searching for tattoo artists. You can upload unlimited images, browse unlimited portfolios, and contact artists directly. There are no fees or subscriptions required to search.',
    },
    {
      question: 'What kind of images work best?',
      answer:
        'Any image of a tattoo works—Pinterest saves, Instagram screenshots, photos of real tattoos, even drawings or artwork. The clearer the tattoo in the image, the better the matches. Avoid blurry images or photos where the tattoo is very small.',
    },
    {
      question: 'How accurate are the matches?',
      answer:
        'Match accuracy depends on your reference image. Clear, well-lit photos of tattoos produce the best results. Each result shows a match percentage so you can gauge relevance. We recommend browsing the top 10-20 results to find artists whose style consistently aligns with yours.',
    },
    {
      question: 'Can I search without an image?',
      answer:
        'Yes. You can type a description like "watercolor flowers" or "geometric blackwork" and Inkdex will find relevant artists. However, image search typically produces more accurate results because it matches visual style, not just keywords.',
    },
    {
      question: 'How do I contact an artist I find?',
      answer:
        "Every artist profile on Inkdex links directly to their Instagram. Once you find someone whose work you love, click through to their profile and DM them on Instagram. There's no booking system or middleman—you connect directly.",
    },
    {
      question: 'What cities does Inkdex cover?',
      answer:
        'Inkdex covers 116 cities across all 50 US states plus Washington DC. Major cities include Los Angeles, New York, Austin, Miami, Chicago, Seattle, Denver, and Atlanta. You can search globally and filter by location.',
    },
    {
      question: 'How many artists are on Inkdex?',
      answer:
        'Inkdex has indexed over 16,000 tattoo artists with nearly 100,000 portfolio images. New artists are added regularly as we expand coverage.',
    },
    {
      question: 'Do I need to create an account?',
      answer:
        'No account is required to search. You can upload images, browse results, and view artist portfolios without signing up. Accounts are only needed if you want to save favorite artists (coming soon).',
    },
  ],
}
