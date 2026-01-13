/**
 * Tattoodo comparison content for /alternatives/tattoodo
 *
 * Content sourced from competitive research (Jan 2026):
 * - Tattoodo shifted to studio-only partnerships in 2024
 * - Public reviews from Trustpilot, JustUseApp, Kimola analysis
 * - Artist complaints about locked-out access, broken matching
 */

import type { CompetitorComparison } from './types'

export const tattoodoContent: CompetitorComparison = {
  // --- Metadata ---
  slug: 'tattoodo',
  competitorName: 'Tattoodo',
  publishedAt: '2026-01-13',
  updatedAt: '2026-01-13',

  // --- SEO ---
  title: 'Tattoodo Alternative for Independent Tattoo Artists',
  metaDescription:
    'No studio partnership required. Get discovered by clients searching for your exact style. Free profile, visual search, auto-imported portfolio.',
  keywords: [
    'tattoodo alternative',
    'tattoodo for independent artists',
    'tattoodo alternative 2026',
    'better than tattoodo',
    'tattoodo vs inkdex',
  ],

  // --- Hero Section ---
  hero: {
    headline: 'Tattoodo Alternative for Independent Tattoo Artists',
    subheadline:
      'Get discovered by clients searching for your style\u2014no studio partnership required.',
  },

  // --- Content Sections ---
  introduction: {
    heading: 'Looking for a Tattoodo Alternative?',
    paragraphs: [
      "If you're an independent tattoo artist who recently lost access to Tattoodo leads, you're not alone. In 2024, Tattoodo shifted to a studio partnership model, cutting off lead generation for artists without studio backing.",
      "Inkdex takes a different approach. We're a visual search platform where clients find artists by uploading reference images\u2014not by browsing studio partnerships. Your portfolio does the work, and you don't need anyone's permission to be discovered.",
    ],
  },

  // --- Pain Points ---
  painPoints: [
    {
      title: 'Studio Partnership Lock-Out',
      description:
        'Tattoodo now requires artists to work through partnered studios to access client leads. Independent artists and those at non-partnered shops lost access to the platform.',
      quote:
        "We're partnering with studios in these cities and providing booking assistants... access to client leads will no longer be open.",
      quoteSource: 'Tattoodo announcement (via JustUseApp reviews)',
      inkdexSolution:
        'Inkdex is open to all artists. No studio partnership required\u2014claim your profile and start appearing in search results.',
    },
    {
      title: 'Broken Style Matching',
      description:
        "Tattoodo's lead matching often sends artists clients looking for completely different styles, wasting everyone's time.",
      quote:
        'After requesting neo-traditional/new school color work, they received multiple black/gray artists instead.',
      quoteSource: 'Trustpilot review',
      inkdexSolution:
        "Inkdex uses visual AI search. Clients upload a reference image and we match them with artists whose actual portfolio work looks similar\u2014not just location.",
    },
    {
      title: 'Manual Portfolio Management',
      description:
        "Artists report frustration with Tattoodo's limited portfolio features: can't rearrange gallery order, can't easily update work.",
      quote: "Can't rearrange gallery, edit calendar, edit shop address.",
      quoteSource: 'Trustpilot review',
      inkdexSolution:
        'Inkdex auto-imports your portfolio from Instagram. Pro users get automatic syncing when you post new work\u2014no manual uploads required.',
    },
    {
      title: 'Data Security Concerns',
      description:
        'Some artists have reported receiving phishing emails immediately after signing up for Tattoodo, raising questions about data handling.',
      quote:
        'Artist signed up with new email, immediately got phishing emails.',
      quoteSource: 'Trustpilot review',
      inkdexSolution:
        "We never sell your data. Your profile exists to help clients find you\u2014that's it. We use Instagram OAuth for verification, so we never see your password.",
    },
  ],

  // --- Comparison Features ---
  comparisonFeatures: [
    {
      feature: 'Independent artist access',
      inkdex: 'Open to all artists',
      competitor: 'Studio partnership required',
      highlight: true,
    },
    {
      feature: 'Client matching',
      inkdex: 'Visual AI matches by actual work',
      competitor: 'Platform assigns leads',
      highlight: true,
    },
    {
      feature: 'Portfolio setup',
      inkdex: 'Auto-import from Instagram',
      competitor: 'Manual upload',
      highlight: false,
    },
    {
      feature: 'Pricing',
      inkdex: 'Free tier + $15/mo Pro',
      competitor: 'Pro subscription for leads',
      highlight: false,
    },
    {
      feature: 'Client connection',
      inkdex: 'Direct to your Instagram',
      competitor: 'Through platform',
      highlight: false,
    },
    {
      feature: 'Booking integration',
      inkdex: 'Link to any booking system',
      competitor: 'Built-in (studio only)',
      highlight: false,
    },
  ],

  // --- How It Works ---
  howItWorks: {
    heading: 'How Inkdex Works',
    steps: [
      {
        number: 1,
        title: 'Your work is already indexed',
        description:
          "We've imported public Instagram portfolios from over 16,000 tattoo artists. Search for your handle\u2014your profile may already exist.",
      },
      {
        number: 2,
        title: 'Claim your profile (free)',
        description:
          'Verify ownership through Instagram login. Takes about 2 minutes. Once claimed, you control your bio, portfolio, and booking link.',
      },
      {
        number: 3,
        title: 'Clients find you through visual search',
        description:
          "When someone uploads a reference image that matches your style, you appear in their results\u2014even if they don't know what to call your technique.",
      },
      {
        number: 4,
        title: 'See your analytics',
        description:
          "Track which searches your work appears in, how many people view your profile, and where your traffic comes from.",
      },
    ],
  },

  // --- FAQs ---
  faqs: [
    {
      question: 'Is Inkdex really free for independent artists?',
      answer:
        "Yes. Every artist can claim a free profile with 20 portfolio images, manual Instagram import, and one location listing. There's no studio partnership or subscription required to be discovered. Pro ($15/month) adds more images, auto-sync, priority placement, and analytics.",
    },
    {
      question: 'How is Inkdex different from Tattoodo?',
      answer:
        "Tattoodo shifted to a studio partnership model in 2024\u2014independent artists can no longer access client leads without studio backing. Inkdex is open to all artists. We also use visual AI search to match clients by actual portfolio similarity, not platform-assigned categories.",
    },
    {
      question: 'Can I import my Tattoodo portfolio to Inkdex?',
      answer:
        "We don't have a direct Tattoodo import, but if your work is on Instagram, we can import it automatically. Search for your Instagram handle, claim your profile, and your public posts become your Inkdex portfolio.",
    },
    {
      question: 'What happened to Tattoodo\u2019s artist program?',
      answer:
        "In 2024, Tattoodo announced they're partnering with studios in select cities and providing booking assistants. Access to client leads is no longer open to independent artists\u2014only those working through partnered studios can receive leads through the platform.",
    },
    {
      question: 'How does visual search help me get found?',
      answer:
        "Clients come to Inkdex with reference images\u2014Pinterest saves, Instagram screenshots, photos of tattoos they like. Our AI analyzes the visual style and shows them artists whose portfolios match. You get discovered based on what you actually create, not hashtags or follower counts.",
    },
  ],

  // --- Related Comparisons ---
  relatedComparisons: ['instagram', 'booking-apps'],
}
