import { Metadata } from 'next'
import LegalPageLayout from '@/components/legal/LegalPageLayout'
import { aboutContent } from '@/lib/content/legal/about'

export const metadata: Metadata = {
  title: 'About Inkdex | AI-Powered Tattoo Artist Discovery',
  description:
    'Inkdex is an AI-powered tattoo artist discovery platform. Search by image, text, or Instagram link to find artists across 8 cities. No jargon required.',
  openGraph: {
    title: 'About Inkdex | AI-Powered Tattoo Artist Discovery',
    description:
      'Inkdex uses AI to help you find tattoo artists by uploading reference images or describing what you want. Discover 1,500+ artists across 8 cities.',
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
