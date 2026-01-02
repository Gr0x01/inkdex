import type { ContentSection } from '@/lib/content/types'

interface LegalContent {
  title: string
  description: string
  lastUpdated: string
  sections: ContentSection[]
}

export const contactContent: LegalContent = {
  title: 'Contact Us',
  description: 'Get in touch with the Inkdex team.',
  lastUpdated: 'January 3, 2026',
  sections: [
    {
      heading: 'How to Reach Us',
      paragraphs: [
        'For all inquiries, please email us at support@inkdex.io. We typically respond within 24-48 hours during business days.',
        'Please include as much detail as possible in your message to help us assist you quickly. If you\'re contacting about a specific artist profile, include the artist name and city. For technical issues, let us know what browser and device you\'re using.',
      ],
    },
    {
      heading: 'What We Can Help With',
      paragraphs: [
        'Support & Technical Issues: Account problems, login issues, search not working, page errors, subscription billing questions, or general technical assistance.',
        'Artist Claiming & Verification: Help claiming your artist profile, Instagram OAuth connection issues, verification problems, or questions about Free vs Pro accounts.',
        'DMCA & Content Removal: Copyright infringement reports, content takedown requests, or questions about removing your profile from Inkdex. Artists can delete their own profiles instantly via the dashboard.',
        'Partnerships & Business Inquiries: Press inquiries, partnership opportunities, API access requests, bulk licensing, or other business-related questions.',
      ],
    },
    {
      heading: 'What to Expect',
      paragraphs: [
        'We review all emails in the order they are received. Most inquiries receive a response within 24-48 hours. Complex issues (such as DMCA takedown requests or verification problems) may require additional time to investigate.',
        'For urgent account issues (such as unauthorized access or payment disputes), please include "URGENT" in your email subject line. We prioritize security and billing issues.',
        'We are a small team and appreciate your patience. Thank you for using Inkdex!',
      ],
    },
  ],
}
