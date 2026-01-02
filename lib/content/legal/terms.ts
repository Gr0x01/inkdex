import type { ContentSection } from '@/lib/content/types'

interface LegalContent {
  title: string
  description: string
  lastUpdated: string
  sections: ContentSection[]
}

export const termsContent: LegalContent = {
  title: 'Terms of Service',
  description: 'Please read these terms carefully before using Inkdex.',
  lastUpdated: 'January 3, 2026',
  sections: [
    {
      heading: '1. Acceptance of Terms',
      paragraphs: [
        'By accessing or using Inkdex ("the Service"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, you may not use the Service.',
        'These Terms constitute a legally binding agreement between you and Inkdex. By creating an account, claiming an artist profile, or using any part of the Service, you acknowledge that you have read, understood, and agreed to be bound by these Terms.',
        'If you are using the Service on behalf of an organization, you represent and warrant that you have the authority to bind that organization to these Terms.',
      ],
    },
    {
      heading: '2. Service Description',
      paragraphs: [
        'Inkdex is an AI-powered tattoo artist discovery platform that helps users find tattoo artists through visual similarity search and natural language queries. We use multi-modal CLIP embeddings and vector similarity algorithms to match user searches with artist portfolios.',
        'The Service includes: (a) public artist profiles aggregated from Instagram and other public sources; (b) visual and text search functionality; (c) city and style browse pages; (d) artist claiming and verification; and (e) optional Pro subscriptions for artists with enhanced features.',
        'We provide the Service on an "as is" and "as available" basis. We do not guarantee that the Service will be uninterrupted, error-free, or that search results will always be accurate or relevant.',
      ],
    },
    {
      heading: '3. Account Types and Eligibility',
      paragraphs: [
        'Inkdex offers three types of access: (a) Public browsing (no account required); (b) Free Artist accounts (claimed via Instagram OAuth); and (c) Pro Artist accounts (paid subscription at $15/month or $150/year).',
        'To claim an artist profile or create an account, you must: (a) be at least 18 years old or the age of majority in your jurisdiction; (b) have a valid Instagram account (Business or Creator account required for full functionality); (c) be a professional tattoo artist or authorized to represent one; and (d) provide accurate and truthful information.',
        'You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You must notify us immediately of any unauthorized use of your account at support@inkdex.io.',
      ],
    },
    {
      heading: '4. Subscription Terms',
      paragraphs: [
        'Pro Artist subscriptions are available for $15 per month or $150 per year. Payment is processed through Stripe, our third-party payment processor. By subscribing, you authorize us to charge your payment method on a recurring basis.',
        'Subscriptions automatically renew at the end of each billing period unless you cancel before the renewal date. You can cancel your subscription at any time through your dashboard or the Stripe Customer Portal. Cancellation takes effect at the end of the current billing period.',
        'Pro features include: unlimited portfolio syncing from Instagram, automatic import of new posts, analytics dashboard, search ranking boost, and Pro badge. Free accounts are limited to 20 manually imported images with no automatic syncing.',
        'We may change subscription pricing with 30 days notice to existing subscribers. Price changes will take effect at your next renewal date. If you do not accept the new pricing, you may cancel your subscription.',
      ],
    },
    {
      heading: '5. No Refund Policy',
      paragraphs: [
        '**All sales are final. We do not offer refunds for any reason.** This includes partial refunds for unused time in a billing period.',
        'You may cancel your subscription at any time, and your account will remain active with Pro features until the end of the current billing period. After cancellation, your account will automatically downgrade to a Free account. No refunds or credits will be issued for the unused portion of your subscription.',
        'Annual subscriptions are non-refundable. If you cancel an annual subscription, you will retain Pro access for the full 12-month period you paid for, but no refund will be provided.',
        'By subscribing to Inkdex Pro, you acknowledge and agree to this no-refund policy. If you are unsure whether Pro features are right for you, we recommend starting with a monthly subscription.',
      ],
    },
    {
      heading: '6. Instagram OAuth and Data Access',
      paragraphs: [
        'Artist accounts require Instagram OAuth authentication. By connecting your Instagram account, you grant us permission to access your Instagram profile information, media, and username for the purposes of: (a) verifying artist identity; (b) importing portfolio images; (c) syncing new posts (Pro accounts); and (d) updating profile information.',
        'We store OAuth access tokens securely using Supabase Vault with authenticated encryption. Tokens are never stored in plaintext. We use these tokens only for the purposes described in our Privacy Policy and only while your account is active.',
        'You may revoke our access to your Instagram account at any time through Instagram settings. If you revoke access, automatic syncing will stop, but your Inkdex profile will remain active with existing imported content. You will need to reconnect Instagram to re-enable syncing.',
        'Instagram requires Business or Creator accounts for full API access. Personal Instagram accounts may have limited functionality. We are not responsible for limitations imposed by Instagram\'s platform policies.',
      ],
    },
    {
      heading: '7. Content Ownership and License',
      paragraphs: [
        'You retain all ownership rights to content you post or import to Inkdex, including tattoo images, profile information, and other materials. By using the Service, you grant us a worldwide, non-exclusive, royalty-free license to display, reproduce, and distribute your content solely for the purpose of operating and promoting the Service.',
        'For unclaimed artist profiles created through automated scraping of public Instagram data, we rely on fair use principles for search indexing. Artists may claim their profiles at any time to gain full control over their content, including the ability to delete the profile entirely.',
        'We respect intellectual property rights. If you believe content on Inkdex infringes your copyright, please submit a DMCA takedown notice to support@inkdex.io with: (a) identification of the copyrighted work; (b) identification of the infringing material and its location on our Service; (c) your contact information; (d) a statement of good faith belief; and (e) a statement of accuracy under penalty of perjury.',
        'Upon receiving a valid DMCA notice, we will remove or disable access to the allegedly infringing content. We may terminate accounts of repeat infringers.',
      ],
    },
    {
      heading: '8. Prohibited Uses',
      paragraphs: [
        'You may not use the Service to: (a) violate any applicable law or regulation; (b) infringe intellectual property rights; (c) transmit malicious code or interfere with the Service; (d) scrape, crawl, or harvest content without authorization; (e) impersonate another person or misrepresent your affiliation; (f) claim an artist profile you are not authorized to represent; or (g) upload content that is illegal, harmful, or violates these Terms.',
        'Artists must not: (a) upload images of tattoos they did not create without permission; (b) use the Service to compete with Inkdex or create a similar service; (c) manipulate search rankings through artificial means; or (d) abuse Pro features or attempt to circumvent account limitations.',
        'We reserve the right to investigate and terminate accounts that violate these prohibited uses. Termination may be immediate and without notice for serious violations.',
      ],
    },
    {
      heading: '9. Account Termination and Data Deletion',
      paragraphs: [
        'You may delete your artist account at any time through your dashboard settings. Deletion is permanent and irreversible. When you delete your account: (a) all imported portfolio images are removed from our Service; (b) your profile becomes inaccessible; (c) analytics data is deleted; and (d) we add your artist record to an exclusion list to prevent re-scraping.',
        'If you have an active Pro subscription when you delete your account, your subscription will be canceled immediately. No refunds will be provided for unused subscription time.',
        'We reserve the right to suspend or terminate accounts that violate these Terms, with or without notice. Reasons for termination may include: (a) prohibited uses; (b) fraudulent activity; (c) chargebacks or payment disputes; (d) impersonation; or (e) other violations of these Terms. Terminated accounts are not eligible for refunds.',
        'After account deletion or termination, some data may be retained for legal or operational purposes, including: (a) transaction records (7 years for tax compliance); (b) fraud prevention records; and (c) anonymized analytics data. For details, see our Privacy Policy.',
      ],
    },
    {
      heading: '10. Disclaimers and Limitation of Liability',
      paragraphs: [
        'THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED. WE DISCLAIM ALL WARRANTIES, INCLUDING BUT NOT LIMITED TO MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.',
        'We do not guarantee that: (a) the Service will be uninterrupted or error-free; (b) search results will be accurate or complete; (c) imported Instagram content will always sync correctly; (d) Pro features will meet your specific business needs; or (e) the Service will be available at all times. Technical issues, Instagram API changes, or third-party service outages may cause disruptions.',
        'TO THE MAXIMUM EXTENT PERMITTED BY LAW, OUR LIABILITY TO YOU IS LIMITED TO THE AMOUNT YOU PAID US IN THE 12 MONTHS BEFORE THE EVENT GIVING RISE TO LIABILITY, OR $100, WHICHEVER IS GREATER. WE ARE NOT LIABLE FOR INDIRECT, INCIDENTAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING LOST PROFITS, LOST REVENUE, OR LOST BUSINESS OPPORTUNITIES.',
        'Some jurisdictions do not allow limitations on implied warranties or liability for incidental damages. In such jurisdictions, our liability is limited to the extent permitted by law.',
      ],
    },
    {
      heading: '11. Indemnification',
      paragraphs: [
        'You agree to indemnify, defend, and hold harmless Inkdex, its affiliates, officers, directors, employees, and agents from any claims, damages, liabilities, costs, or expenses (including reasonable attorneys\' fees) arising out of: (a) your use of the Service; (b) your content; (c) your violation of these Terms; (d) your violation of any rights of another party; or (e) any fraudulent or illegal activity.',
        'We reserve the right to assume exclusive defense and control of any matter subject to indemnification by you, at your expense. You will cooperate with us in defending such claims.',
      ],
    },
    {
      heading: '12. Changes to Terms',
      paragraphs: [
        'We may update these Terms from time to time. When we make material changes, we will notify you by: (a) posting a notice on our homepage; (b) sending an email to your registered email address; or (c) displaying an in-app notification in your dashboard.',
        'Changes will take effect 30 days after notification. Your continued use of the Service after the effective date constitutes acceptance of the updated Terms. If you do not agree to the changes, you must stop using the Service and may delete your account.',
        'For non-material changes (such as clarifications or formatting updates), we will update the "Last Updated" date at the top of this page. We encourage you to review these Terms periodically.',
      ],
    },
    {
      heading: '13. Governing Law and Dispute Resolution',
      paragraphs: [
        'These Terms are governed by the laws of the United States, without regard to conflict of law principles. Any disputes arising out of or related to these Terms or the Service will be resolved through binding arbitration in accordance with the rules of the American Arbitration Association.',
        'You and Inkdex agree to waive the right to a jury trial and to participate in class action lawsuits. Arbitration will be conducted on an individual basis only. Each party will bear its own costs of arbitration unless the arbitrator awards costs to the prevailing party.',
        'Notwithstanding the above, either party may seek injunctive relief in a court of competent jurisdiction to prevent irreparable harm.',
      ],
    },
    {
      heading: '14. General Provisions',
      paragraphs: [
        'These Terms constitute the entire agreement between you and Inkdex regarding the Service and supersede all prior agreements. If any provision of these Terms is found to be invalid or unenforceable, the remaining provisions will continue in full force and effect.',
        'Our failure to enforce any right or provision of these Terms will not be deemed a waiver of that right or provision. We may assign these Terms or any rights hereunder without your consent. You may not assign these Terms without our prior written consent.',
        'Section headings are for convenience only and do not affect the interpretation of these Terms.',
      ],
    },
    {
      heading: '15. Contact Information',
      paragraphs: [
        'If you have questions about these Terms of Service, please contact us at support@inkdex.io. We aim to respond to all inquiries within 24-48 hours.',
      ],
    },
  ],
}
