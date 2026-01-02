import { Metadata } from 'next'
import LegalPageLayout from '@/components/legal/LegalPageLayout'
import { privacyContent } from '@/lib/content/legal/privacy'

export const metadata: Metadata = {
  title: 'Privacy Policy | Inkdex',
  description:
    'Privacy Policy for Inkdex. How we collect, use, and protect your data. GDPR and CCPA compliant. Encrypted OAuth tokens, transparent data practices.',
  openGraph: {
    title: 'Privacy Policy | Inkdex',
    description:
      'Privacy Policy for Inkdex. How we collect, use, and protect your data. GDPR and CCPA compliant.',
    url: 'https://inkdex.io/legal/privacy',
    type: 'website',
  },
}

export default function PrivacyPage() {
  return (
    <LegalPageLayout
      title={privacyContent.title}
      description={privacyContent.description}
      lastUpdated={privacyContent.lastUpdated}
      sections={privacyContent.sections}
    />
  )
}
