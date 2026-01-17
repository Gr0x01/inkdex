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
    headline: 'Instagram Is for Sharing.\u00a0Inkdex Is for Getting Booked.',
    subheadline:
      'You built your portfolio on Instagram. We put it in front of clients who are actively looking for their next artist—not just scrolling for inspiration.',
    stats: {
      artists: '16,000+',
      cities: '147',
      images: '99,000+',
    },
  },

  sections: [
    {
      id: 'what-is-inkdex',
      heading: 'What is Inkdex?',
      paragraphs: [
        '<strong>Inkdex is a discovery layer for Instagram artists.</strong> Clients upload a reference image—a Pinterest save, a screenshot, a tattoo they saw—and we show them artists whose portfolios match that style. You stay on Instagram. We send you clients with booking intent.',
      ],
    },
    {
      id: 'why-inkdex',
      heading: 'Instagram Built Your Audience. Inkdex Builds Your Clientele.',
      paragraphs: [
        "Instagram is essential for tattoo artists—it's where you build your brand, share your work, and connect with your community. But <strong>Instagram's algorithm doesn't optimize for bookings.</strong> It optimizes for engagement. Time on app. Scrolling.",
        'Inkdex is different. <strong>Every user on Inkdex has booking intent.</strong> They\'re not scrolling for entertainment—they\'re actively searching for their next artist. When their reference image matches your style, you show up.',
        "We're not replacing Instagram. We're the discovery layer that turns your Instagram portfolio into a client pipeline.",
      ],
    },
    {
      id: 'how-it-works',
      heading: 'How It Works',
      paragraphs: [
        '<strong>Claiming takes 2 minutes.</strong> Search for your Instagram handle, click "Claim Profile," and verify via Instagram login. Once verified, you control your profile—update your bio, curate your portfolio, add booking info.',
        'Your portfolio <strong>imports automatically</strong> from Instagram. Free accounts show 20 images; Pro unlocks 100 with daily auto-sync.',
        'Clients discover you through visual search, browse your work, and connect via your Instagram or booking link. <strong>No middleman. No booking fees.</strong>',
      ],
    },
    {
      id: 'search',
      heading: 'Clients With Intent, Not Just Likes',
      paragraphs: [
        "Instagram followers might like your posts. Inkdex users want to book appointments. That's the difference.",
        "<strong>Here's how it works:</strong> A client uploads a reference image—something from Pinterest, a photo of a tattoo they love. Our AI scans thousands of portfolios and shows them artists whose work matches that aesthetic. No hashtags. No algorithm games. Just visual matching.",
        'When someone searches with an image that looks like your work, you appear. <strong>Your portfolio does the talking.</strong>',
      ],
    },
    {
      id: 'free-vs-pro',
      heading: 'Free vs Pro',
      paragraphs: [
        '<strong>Every artist can claim a free profile.</strong> Free includes 20 portfolio images, manual Instagram import, verified badge, and one location. Enough to get discovered.',
        '<strong>Pro costs $15/month</strong> (or $150/year). You get 100 images, automatic Instagram sync, priority search ranking, image pinning, analytics, and up to 20 locations for traveling artists.',
        '<strong>The real Pro benefit is visibility.</strong> Pro artists rank higher when clients search for your style. Combined with auto-sync, your newest work is always discoverable—without you lifting a finger.',
      ],
    },
    {
      id: 'getting-started',
      heading: 'Getting Started',
      paragraphs: [
        "<strong>Step 1:</strong> Search for your Instagram handle. If we've indexed your work, you'll see your profile. If not, add yourself and we'll import your portfolio.",
        '<strong>Step 2:</strong> Click "Claim Profile" and verify via Instagram login. This proves ownership—we never see your password.',
        '<strong>Step 3:</strong> Customize. Add your bio, set your location, review your portfolio. Pin your best work and add booking info so clients know how to reach you.',
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
        'Inkdex covers 147 cities across 6 countries: US (all 50 states + DC), Canada, Australia, New Zealand, India, and Pakistan. Major cities include Los Angeles, New York, Austin, Toronto, Sydney, and Mumbai. We add new cities regularly.',
    },
    {
      question: 'How is Inkdex different from Instagram or Google?',
      answer:
        "Instagram's algorithm optimizes for engagement (keeping users scrolling), not discovery. Google requires knowing artist names or style terms. Inkdex lets clients search by uploading an image—no terminology needed. Our AI matches their reference to artists whose work looks like what they want.",
    },
    {
      question: 'Do I need to stop using Instagram?',
      answer:
        "Absolutely not. Inkdex complements Instagram—it doesn't replace it. Keep posting to Instagram as usual. We import your public portfolio and make it searchable by clients uploading reference images. Instagram for community, Inkdex for discovery.",
    },
    {
      question: 'How is this different from Instagram search?',
      answer:
        "Instagram search relies on hashtags and an algorithm optimized for engagement (keeping users on the app). Inkdex uses visual AI to match client reference images to your actual portfolio—no hashtags needed. Every Inkdex user is actively looking for an artist to book, not just browsing.",
    },
    {
      question: 'Do I need a certain number of followers to join?',
      answer:
        "No. Inkdex doesn't filter by follower count. We index artists based on portfolio quality and style, not social media metrics. Whether you have 500 followers or 500,000, your work is searchable if it matches what clients are looking for.",
    },
  ],
}
