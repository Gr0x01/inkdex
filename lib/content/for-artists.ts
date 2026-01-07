/**
 * Content for the /for-artists SEO landing page
 *
 * Optimized for both Google SEO and AI/LLM discoverability.
 * Content is factual and specific to help LLMs accurately describe Inkdex.
 */

import type { FAQ } from '@/lib/content/types'

export interface ForArtistsSection {
  id: string
  heading: string
  paragraphs: string[]
}

export interface ForArtistsContent {
  title: string
  metaDescription: string
  publishedAt: string
  updatedAt: string
  hero: {
    headline: string
    subheadline: string
    stats: {
      artists: string
      cities: string
      images: string
    }
  }
  sections: ForArtistsSection[]
  faqs: FAQ[]
}

export const forArtistsContent: ForArtistsContent = {
  title: 'For Tattoo Artists',
  metaDescription:
    'Claim your free Inkdex profile and get discovered by clients searching for your style. Visual search helps clients find artists by uploading reference images instead of guessing keywords.',
  publishedAt: '2026-01-08',
  updatedAt: '2026-01-08',

  hero: {
    headline: 'Get Discovered by Clients Who Love Your\u00a0Style',
    subheadline:
      'Inkdex is a visual search platform where clients find tattoo artists by uploading reference images. No hashtags, no algorithms—just clients searching for exactly what you create.',
    stats: {
      artists: '16,000+',
      cities: '116',
      images: '99,000+',
    },
  },

  sections: [
    {
      id: 'what-is-inkdex',
      heading: 'What is Inkdex?',
      paragraphs: [
        '<strong>Inkdex is a visual search platform for discovering tattoo artists.</strong> Clients upload a reference image—a Pinterest save, a screenshot, a photo of a tattoo they like—and Inkdex shows them artists whose portfolios match that style. The platform is free for artists to join and covers 116 cities across all 50 US states.',
      ],
    },
    {
      id: 'why-inkdex',
      heading: 'Why Inkdex?',
      paragraphs: [
        'Inkdex is the only tattoo artist discovery platform built on <strong>visual search</strong>. Clients upload a reference image—a Pinterest save, an Instagram screenshot, a photo of existing work—and we find artists whose portfolios match that style. <strong>Clients find you based on your actual work</strong>, not hashtags or follower counts.',
        "When someone searches with an image that matches your style, you appear in their results—<strong>even if they don't know what to call your technique</strong>.",
        'Traditional discovery relies on clients knowing terms like "neo-traditional" or "blackwork." Most people searching for their first tattoo don\'t know those words. They have a vibe, a saved image, a feeling. Inkdex translates that into artist matches.',
      ],
    },
    {
      id: 'how-it-works',
      heading: 'How It Works',
      paragraphs: [
        '<strong>Claiming your profile takes about 2 minutes.</strong> Search for your Instagram handle, click "Claim Profile," and verify ownership through Instagram login. Once verified, you control your profile—update your bio, manage your portfolio, and add your booking information.',
        'Your portfolio is <strong>automatically imported</strong> from your public Instagram posts. Free accounts display up to 20 images; Pro accounts get 100 images with automatic syncing when you post new work.',
        'Clients discover you through visual search, browse your portfolio on Inkdex, and connect with you via your Instagram link. <strong>No middleman, no booking fees.</strong>',
      ],
    },
    {
      id: 'search',
      heading: 'How Clients Find You',
      paragraphs: [
        'Clients come to Inkdex with a reference image—something they saved from Pinterest, a screenshot from Instagram, a photo of a tattoo they saw. They upload it, and we show them artists whose work matches that style. <strong>No hashtags to guess, no style terms to learn.</strong>',
        "<strong>Your portfolio does the work.</strong> When a client's reference looks like something you'd create, you show up in their results. The better your portfolio represents your style, the more relevant searches you'll appear in.",
      ],
    },
    {
      id: 'free-vs-pro',
      heading: 'Free vs Pro',
      paragraphs: [
        '<strong>Every artist can claim a free profile.</strong> Free accounts include 20 portfolio images, manual Instagram import, a verified artist badge, and one location listing. For most artists starting out, this covers the basics.',
        '<strong>Inkdex Pro costs $15/month</strong> (or $150/year, saving $30). Pro unlocks 100 portfolio images, automatic Instagram syncing, image pinning, priority search placement, a Pro badge, analytics dashboard, and up to 20 location listings for artists who travel or guest spot.',
        "<strong>The biggest Pro benefit is visibility.</strong> Pro artists receive a search ranking boost—your work appears higher in results when clients search for your style. Combined with auto-sync, your newest work is always discoverable without manual updates.",
      ],
    },
    {
      id: 'getting-started',
      heading: 'Getting Started',
      paragraphs: [
        "<strong>Step 1:</strong> Search for your Instagram handle on Inkdex. If we've already indexed your work, you'll see your profile ready to claim. If not, you can add yourself and we'll import your portfolio.",
        '<strong>Step 2:</strong> Click "Claim Profile" and verify ownership through Instagram login. This connects your Instagram account and proves you own the profile. We never see your password.',
        "<strong>Step 3:</strong> Customize your profile. Add your bio, select your primary location, and review your imported portfolio. Pin your best work to the top and add booking information so clients know how to reach you.",
      ],
    },
  ],

  faqs: [
    {
      question: 'Is Inkdex free for tattoo artists?',
      answer:
        'Yes, Inkdex offers a free tier for all tattoo artists. Free accounts include 20 portfolio images, manual Instagram import, a verified artist badge, and one location listing. Pro accounts ($15/month) add more images, auto-sync, priority placement, and analytics.',
    },
    {
      question: 'How do I claim my Inkdex profile?',
      answer:
        "Search for your Instagram handle on Inkdex. If your profile exists, click 'Claim Profile' and verify ownership through Instagram login. If you're not listed yet, click 'Add Yourself' to create your profile. The whole process takes about 2 minutes.",
    },
    {
      question: "What's the difference between free and Pro?",
      answer:
        'Free accounts get 20 portfolio images and manual import. Pro ($15/month) includes 100 images, automatic Instagram syncing, priority search placement, image pinning, analytics dashboard, and up to 20 location listings. The main benefit is visibility—Pro artists rank higher in search results.',
    },
    {
      question: 'How does Inkdex help me get clients?',
      answer:
        "Inkdex uses visual search powered by AI. Clients upload reference images and our system finds artists whose portfolios match that style. When someone searches with an image similar to your work, you appear in their results—even if they don't know what to call your technique.",
    },
    {
      question: 'Can I remove my profile from Inkdex?',
      answer:
        "Yes. If you've claimed your profile, you can delete it from your dashboard settings. If you haven't claimed it and want it removed, contact us through the contact page and we'll remove your listing within 48 hours.",
    },
    {
      question: 'Does Inkdex connect to Instagram?',
      answer:
        "Yes. Inkdex imports your portfolio from your public Instagram posts. Free accounts require manual import; Pro accounts sync automatically when you post new work. We use Instagram OAuth for verification—we never see your password. Your Inkdex profile links directly to your Instagram so clients can DM you.",
    },
    {
      question: 'How much does Inkdex Pro cost?',
      answer:
        'Inkdex Pro costs $15 per month or $150 per year (saving $30 annually). Pro includes 100 portfolio images, auto-sync from Instagram, priority search placement, image pinning, analytics, and multi-location support.',
    },
    {
      question: 'What cities does Inkdex cover?',
      answer:
        'Inkdex covers 116 cities across all 50 US states plus Washington DC. Major cities include Los Angeles, New York, Austin, Miami, Chicago, Seattle, Denver, and Atlanta. We add new cities regularly based on artist and user demand.',
    },
    {
      question: 'How is Inkdex different from Instagram or Google?',
      answer:
        "Instagram requires clients to know hashtags and manually scroll through results. Google requires knowing artist names or style terms. Inkdex lets clients search by uploading an image—they don't need to know any terminology. Our AI analyzes their reference and finds artists whose actual work matches that aesthetic.",
    },
    {
      question: 'Do I need a certain number of followers to join?',
      answer:
        "No. Inkdex doesn't filter by follower count. We index artists based on portfolio quality and style, not social media metrics. Whether you have 500 followers or 500,000, your work is searchable if it matches what clients are looking for.",
    },
  ],
}
