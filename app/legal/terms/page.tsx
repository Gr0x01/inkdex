import { Metadata } from 'next'
import LegalPageLayout from '@/components/legal/LegalPageLayout'
import { termsContent } from '@/lib/content/legal/terms'

export const metadata: Metadata = {
  title: 'Terms of Service | Inkdex',
  description:
    'Terms of Service for Inkdex, the AI-powered tattoo artist discovery platform. Subscription terms, no refund policy, content ownership, and user rights.',
  openGraph: {
    title: 'Terms of Service | Inkdex',
    description:
      'Terms of Service for Inkdex, the AI-powered tattoo artist discovery platform. Subscription terms, no refund policy, and user rights.',
    url: 'https://inkdex.io/legal/terms',
    type: 'website',
  },
}

export default function TermsPage() {
  return (
    <LegalPageLayout
      title={termsContent.title}
      description={termsContent.description}
      lastUpdated={termsContent.lastUpdated}
      sections={termsContent.sections}
    />
  )
}
