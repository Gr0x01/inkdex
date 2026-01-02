import { Metadata } from 'next'
import LegalPageLayout from '@/components/legal/LegalPageLayout'
import { contactContent } from '@/lib/content/legal/contact'

export const metadata: Metadata = {
  title: 'Contact Us | Inkdex',
  description:
    'Contact Inkdex for support, artist verification, DMCA requests, or partnership inquiries. Email support@inkdex.io. We respond within 24-48 hours.',
  openGraph: {
    title: 'Contact Us | Inkdex',
    description:
      'Contact Inkdex for support, artist verification, or business inquiries. Email support@inkdex.io.',
    url: 'https://inkdex.io/contact',
    type: 'website',
  },
}

export default function ContactPage() {
  return (
    <LegalPageLayout
      title={contactContent.title}
      description={contactContent.description}
      lastUpdated={contactContent.lastUpdated}
      sections={contactContent.sections}
    />
  )
}
