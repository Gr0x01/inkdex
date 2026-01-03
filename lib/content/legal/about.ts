import type { ContentSection } from '@/lib/content/types'

interface LegalContent {
  title: string
  description: string
  lastUpdated: string
  sections: ContentSection[]
}

export const aboutContent: LegalContent = {
  title: 'About Inkdex',
  description: 'AI-powered tattoo artist discovery for everyone.',
  lastUpdated: 'January 3, 2026',
  sections: [
    {
      heading: 'What We Do',
      paragraphs: [
        'Inkdex is an AI-powered discovery platform that helps you find the perfect tattoo artist without knowing industry jargon. Upload a reference image, describe what you want in plain language, or paste an Instagram link—our multi-modal search understands your vision and matches you with artists whose work aligns with your style.',
        'We solve a simple problem: you have Pinterest screenshots and vague vibes, but no idea what to call them. Traditional tattoo directories force you into dropdown menus of styles you don\'t understand. Inkdex lets you search in your language—visual and intuitive.',
        'Whether you\'re looking for "dark floral sketchy" work in Austin or trying to find an artist who does realism like your favorite Instagram post, Inkdex translates your intent into artist matches using advanced computer vision.',
      ],
    },
    {
      heading: 'How It Works',
      paragraphs: [
        'Behind the scenes, Inkdex uses CLIP (Contrastive Language-Image Pre-training), a multi-modal AI model that understands both images and text in the same vector space. When you upload an image or type a description, we generate a semantic embedding—a mathematical representation of your search—and compare it against over 9,800 portfolio images from 1,500+ artists across 8 cities.',
        'Our search engine uses vector similarity algorithms (pgvector with IVFFlat indexing) to find the closest visual matches in milliseconds. This is the same technology that powers reverse image search at Google, but optimized specifically for tattoo art discovery.',
        'Artist portfolios are sourced from Instagram through two paths: automated scraping of public artist profiles (unclaimed pages), and direct OAuth integration for artists who claim their profiles. Claimed artists can import unlimited work, auto-sync new posts, and control exactly how their portfolio appears.',
        'We currently cover 8 cities (Austin, Atlanta, Los Angeles, New York, Chicago, Portland, Seattle, and Miami) with plans to expand nationwide. Our library includes traditional, realism, Japanese, neo-traditional, blackwork, illustrative, watercolor, new-school, tribal, and Chicano styles—all searchable without knowing which is which.',
      ],
    },
    {
      heading: 'Who It\'s For',
      paragraphs: [
        'For fans and collectors, Inkdex is your visual search engine. No account required—just upload, search, and discover. Find artists by style, location, or visual similarity. Click through to Instagram to see their full portfolio, read reviews, and book consultations. Whether you\'re getting your first tattoo or adding to a full sleeve, we help you find artists whose aesthetic matches your vision.',
        'For tattoo artists, Inkdex offers two tiers: Free and Pro. Free accounts let you claim your page, import 20 images from Instagram, manually curate your portfolio, and add a booking link. Pro accounts ($15/month or $150/year) unlock unlimited portfolio syncing, automatic import of new posts, analytics dashboard (profile views, clicks, search appearances), search ranking boost, and a Pro badge.',
        'Artists can claim their pages at any time by connecting via Instagram OAuth. Claiming gives you full control: delete the page entirely, hide images from search, pin your best work to the top, or upgrade to Pro for auto-sync and analytics. Your Instagram is already your portfolio—Inkdex just makes it discoverable.',
      ],
    },
    {
      heading: 'Our Story',
      paragraphs: [
        'Inkdex was built to bridge the gap between how people search for tattoo inspiration (visual, intuitive) and how traditional directories work (taxonomies, dropdowns, jargon). We believe finding the right artist shouldn\'t require a degree in tattoo history.',
        'We\'re based in the United States and focused on making tattoo artist discovery accessible, visual, and fair. Artists own their content and can opt out at any time. Fans get a better search experience. Everyone wins.',
        'Questions, feedback, or partnership inquiries? Reach us at support@inkdex.io. We typically respond within 24-48 hours.',
      ],
    },
    {
      heading: 'Data Sources',
      paragraphs: [
        'City and location data provided by SimpleMaps (https://simplemaps.com/data/us-cities). SimpleMaps offers comprehensive, accurate geographic databases used by developers worldwide.',
      ],
    },
  ],
}
