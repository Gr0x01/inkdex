import { Metadata } from 'next'
import LegalPageLayout from '@/components/legal/LegalPageLayout'
import { aboutContent } from '@/lib/content/legal/about'

export const metadata: Metadata = {
  title: 'About Inkdex | Visual Tattoo Artist Discovery',
  description:
    'Inkdex is a visual search platform for tattoo artist discovery. Search by image, text, or Instagram link to find artists across 100+ cities. No jargon required.',
  openGraph: {
    title: 'About Inkdex | Visual Tattoo Artist Discovery',
    description:
      'Find tattoo artists by uploading reference images or describing what you want. Discover 15,000+ artists across 100+ cities.',
    url: 'https://inkdex.io/about',
    type: 'website',
  },
}

export default function AboutPage() {
  return (
    <LegalPageLayout
      title={aboutContent.title}
      description={aboutContent.description}
      lastUpdated={aboutContent.lastUpdated}
      sections={aboutContent.sections}
    />
  )
}
