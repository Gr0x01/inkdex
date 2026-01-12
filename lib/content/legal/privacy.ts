import type { ContentSection } from '@/lib/content/types'

interface LegalContent {
  title: string
  description: string
  lastUpdated: string
  sections: ContentSection[]
}

export const privacyContent: LegalContent = {
  title: 'Privacy Policy',
  description: 'How we collect, use, and protect your data.',
  lastUpdated: 'January 12, 2026',
  sections: [
    {
      heading: '1. Introduction',
      paragraphs: [
        'Inkdex ("we," "us," or "our") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our Service.',
        'By using Inkdex, you consent to the data practices described in this policy. If you do not agree with this Privacy Policy, please do not use the Service.',
        'This policy applies to information we collect through: (a) our website and web application; (b) Instagram OAuth authentication; (c) payment processing via Stripe; and (d) any other interactions with our Service.',
      ],
    },
    {
      heading: '2. Information We Collect',
      paragraphs: [
        '**Instagram OAuth Data (Artists Only):** When you claim an artist profile or create an account, we collect information from your Instagram account including: profile username, Instagram user ID, profile picture URL, bio, and URLs to your Instagram posts. We request permissions to access your media for portfolio import and syncing.',
        '**Profile Information:** Artists provide additional information such as: artist name, location, shop affiliation, booking links, bio text, pricing information, and availability status. Public users browse without providing any personal information.',
        '**Usage and Analytics (Pro Artists Only):** We collect analytics data for Pro accounts including: profile views, Instagram link clicks, booking link clicks, search appearances, and image view counts. This data is aggregated daily and used solely to provide analytics features to Pro subscribers.',
        '**Payment Information:** We do not store your credit card or payment details. All payment information is processed and stored by Stripe, our PCI-DSS compliant payment processor. We store the following subscription-related data: (a) Stripe customer ID (anonymized identifier); (b) subscription status (active, past_due, canceled, etc.); (c) billing period (monthly or yearly); and (d) subscription start and renewal dates. This data is necessary to manage your subscription, send payment notifications, and process account changes.',
        '**Technical Data:** We automatically collect certain information including: IP address (for rate limiting and fraud prevention), browser type, device type, operating system, referring URLs, and access times. This data is used for security, fraud prevention, and service improvement.',
        '**Analytics and Advertising Data:** We use Google Analytics, PostHog, and Google Ads to understand user behavior and serve relevant advertisements. This includes: pages visited, time on site, search queries, click behavior, session recordings (PostHog), demographic information (age range, gender, interests inferred by Google), and geographic location. This data is collected via cookies and may be used for personalized advertising and remarketing.',
      ],
    },
    {
      heading: '3. How We Store Your Data',
      paragraphs: [
        '**OAuth Tokens - Encrypted Storage:** Instagram OAuth access tokens are stored using Supabase Vault with authenticated encryption. Tokens are NEVER stored in plaintext. The encryption key is managed separately by Supabase and is not accessible to our application code. Tokens are only decrypted when needed for API requests and are used solely for authorized purposes (importing content, syncing posts).',
        '**Portfolio Images:** Images imported from Instagram are downloaded, converted to WebP format, resized to three sizes (320px, 640px, 1280px), and stored in Supabase Storage with global CDN distribution. Original Instagram URLs are preserved in our database for attribution.',
        '**Database:** All other data (artist profiles, analytics, subscription records) is stored in Supabase PostgreSQL databases hosted in the United States with automatic backups. We implement Row-Level Security (RLS) policies to ensure users can only access their own data.',
        '**Data Location:** All data is stored in U.S.-based data centers operated by Supabase (AWS infrastructure). We do not transfer data internationally except as required for service delivery (e.g., CDN distribution for images).',
      ],
    },
    {
      heading: '4. Third-Party Services',
      paragraphs: [
        '**Stripe (Payment Processing):** We use Stripe to process subscription payments. Stripe is PCI DSS Level 1 certified and handles all payment card data. We never see or store your full credit card information. We receive webhook notifications from Stripe for subscription lifecycle events (successful payments, failed payments, subscription updates, cancellations). These webhooks contain only subscription metadata, not payment card details. We also provide access to Stripe\'s Customer Portal, which allows you to update payment methods and view billing history directly through Stripe\'s secure interface. Stripe\'s privacy policy is available at stripe.com/privacy.',
        '**Supabase (Database and Authentication):** We use Supabase for database hosting, file storage, and authentication services. Supabase is SOC 2 Type II certified and implements industry-standard security measures. Supabase\'s privacy policy is available at supabase.com/privacy.',
        '**Instagram Graph API:** When you connect your Instagram account via OAuth, we access Instagram\'s API to fetch your profile and media data. We only access data you explicitly authorize. Instagram\'s Data Policy is available at instagram.com/legal/privacy.',
        '**Vercel (Hosting):** Our web application is hosted on Vercel\'s global edge network. Vercel may collect technical data (IP addresses, request logs) for service delivery. Vercel\'s privacy policy is available at vercel.com/legal/privacy-policy.',
        '**Google Analytics and Google Ads:** We use Google Analytics to analyze user behavior and Google Ads to serve advertisements. Google collects data via cookies including: IP address, device information, browsing behavior, and inferred demographics. Google may use this data for personalized advertising across Google\'s ad network. You can opt out using Google\'s Ad Settings (adssettings.google.com) or the NAI opt-out tool. Google\'s privacy policy is available at policies.google.com/privacy.',
        '**PostHog (Product Analytics):** We use PostHog for product analytics including: pageview tracking, session recordings, feature usage analytics, and funnel analysis. PostHog collects: pages visited, user interactions, device information, IP address (anonymized), and session data. PostHog is EU-GDPR compliant and data is stored on PostHog\'s US cloud infrastructure. PostHog\'s privacy policy is available at posthog.com/privacy.',
        'We share data with these third parties to the extent necessary to provide our Service, improve user experience, and serve relevant advertisements. We do not sell your personal information to third parties for their independent marketing purposes.',
      ],
    },
    {
      heading: '5. How We Use Your Information',
      paragraphs: [
        '**To Provide the Service:** We use your data to: (a) create and maintain artist profiles; (b) import and sync portfolio images from Instagram; (c) process subscription payments; (d) provide search functionality; (e) display analytics to Pro accounts; and (f) respond to support requests.',
        '**For Search Indexing:** Public artist profiles (claimed or unclaimed) are indexed in our search system to help users discover tattoo artists. This includes portfolio images, artist names, locations, and styles. This constitutes fair use for search engine purposes.',
        '**For Service Improvement:** We use aggregated, anonymized data to: (a) improve search result relevance; (b) optimize our AI/ML models; (c) monitor service performance; and (d) identify and fix bugs. Individual user data is never used for training AI models without explicit consent.',
        '**For Communication:** We send transactional emails related to: (a) account creation and verification; (b) subscription confirmations and renewals; (c) failed payment notifications; (d) account status changes; (e) security alerts; and (f) responses to support inquiries. We do not send marketing emails without your explicit opt-in consent.',
        '**For Advertising:** We use Google Analytics and Google Ads to serve personalized advertisements based on your browsing behavior, search queries, and inferred interests. This may include remarketing (showing ads to users who previously visited our site) and interest-based advertising across Google\'s ad network. You can opt out of personalized advertising via Google Ad Settings or browser settings.',
        'We do not sell, rent, or trade your personal information to third parties for their independent marketing purposes. However, we do share anonymized behavioral data with Google for advertising purposes as described above.',
      ],
    },
    {
      heading: '6. Your Rights Under GDPR and CCPA',
      paragraphs: [
        '**Right to Access:** You may request a copy of the personal data we hold about you. For artists, this includes profile information, portfolio images, analytics data, and subscription records. We will provide this data in a machine-readable format (JSON or CSV) within 30 days of your request.',
        '**Right to Deletion:** You may request deletion of your personal data at any time by deleting your account through your dashboard settings. Upon deletion: (a) your profile becomes inaccessible; (b) imported portfolio images are removed; (c) analytics data is deleted; and (d) OAuth tokens are permanently deleted from Supabase Vault. Some data may be retained for legal compliance (e.g., transaction records for 7 years for tax purposes).',
        '**Right to Portability:** You may request a machine-readable export of your data, including: profile information, portfolio image URLs, analytics data, and subscription history. We will provide this within 30 days of your request.',
        '**Right to Rectification:** You may update your profile information at any time through your dashboard. If you believe we have incorrect data, contact us at support@inkdex.io and we will correct it within 30 days.',
        '**Right to Opt-Out (CCPA):** California residents may opt out of the sale of personal information. While we do not sell personal information in the traditional sense, sharing data with Google for advertising purposes may be considered a "sale" under CCPA. You can opt out of personalized advertising by: (a) using Google Ad Settings (adssettings.google.com); (b) enabling "Do Not Track" in your browser; or (c) contacting us at support@inkdex.io to disable advertising cookies for your session.',
        'To exercise any of these rights, contact us at support@inkdex.io with your request. We may require identity verification before fulfilling requests.',
      ],
    },
    {
      heading: '7. Cookies and Tracking',
      paragraphs: [
        '**Essential Cookies:** We use session cookies to: (a) maintain your login state; (b) remember your preferences; and (c) enable core functionality. These cookies are necessary for the Service to function and cannot be disabled.',
        '**Analytics Cookies:** We use Google Analytics to understand how users interact with our Service. These cookies track: page views, session duration, bounce rate, traffic sources, and user demographics. Analytics cookies are set automatically but you can opt out using browser settings or Google\'s opt-out tool (tools.google.com/dlpage/gaoptout).',
        '**Product Analytics Cookies (PostHog):** We use PostHog for product analytics to understand how users interact with our Service. PostHog cookies track: pageviews, user sessions, feature interactions, and funnel completion. These cookies are classified as analytics cookies and follow the same consent rules as Google Analytics (GDPR opt-in required for EU users, auto-consent for non-EU). You can opt out via our cookie banner or by disabling cookies in browser settings.',
        '**Advertising Cookies:** We use Google Ads and remarketing cookies to serve personalized advertisements based on your browsing behavior. These cookies may track you across websites in Google\'s ad network. Advertising cookies require consent under GDPR. You can manage advertising preferences at adssettings.google.com or opt out via the NAI opt-out tool (optout.networkadvertising.org).',
        '**Cookie Consent (GDPR):** For users in the European Economic Area (EEA), United Kingdom, or Switzerland, we obtain explicit consent before setting non-essential cookies (analytics and advertising). You can withdraw consent at any time via our cookie banner or browser settings.',
        '**Global Privacy Control (GPC):** We respect the Global Privacy Control (GPC) standard, a browser-level privacy preference signal. If your browser sends a GPC signal, we will automatically disable analytics tracking without showing a cookie banner. This provides a seamless way to opt out of non-essential cookies. GPC is supported by browsers including Firefox, Brave, and via browser extensions for Chrome and Edge.',
        '**Do Not Track (DNT):** We also respect the Do Not Track (DNT) browser setting. If DNT is enabled, we will automatically disable analytics cookies. Note that DNT is being phased out in favor of GPC, but we continue to support both for maximum privacy protection.',
        'You can control cookies through your browser settings. Disabling essential cookies may prevent you from using certain features of the Service. Disabling analytics or advertising cookies will not affect core functionality but may result in less relevant ads and reduced site improvements.',
      ],
    },
    {
      heading: '8. Data Retention',
      paragraphs: [
        '**Active Accounts:** We retain your data as long as your account is active and for 90 days after deletion (grace period for account recovery). After 90 days, data is permanently deleted from active databases.',
        '**Analytics Data:** Analytics data for Pro accounts is retained for 365 days from the date of collection. After 365 days, analytics data is automatically deleted.',
        '**Transaction Records:** Subscription payment records and invoices are retained for 7 years to comply with tax and accounting regulations. These records are stored securely and access is restricted to authorized personnel.',
        '**Excluded Artist Records:** When you delete your account, we add a minimal record (Instagram ID or username) to an exclusion list to prevent re-scraping. This record contains no personal data beyond the identifier and is retained indefinitely for operational purposes.',
        '**Backup Data:** Deleted data may persist in encrypted backups for up to 30 days. These backups are used solely for disaster recovery and are not accessible for operational purposes.',
      ],
    },
    {
      heading: '9. Security Measures',
      paragraphs: [
        '**Encryption:** All data in transit is encrypted using TLS 1.3 or higher. OAuth tokens are encrypted at rest using Supabase Vault with authenticated encryption (AES-256-GCM). Payment data is handled exclusively by Stripe and is PCI DSS Level 1 compliant.',
        '**Access Controls:** Access to production databases and systems is restricted to authorized personnel only. We implement Role-Based Access Control (RBAC) and require multi-factor authentication for all administrative access.',
        '**Row-Level Security (RLS):** Our database implements RLS policies to ensure users can only access data they are authorized to view. Artists can only access their own profiles, analytics, and subscription data.',
        '**Regular Security Audits:** We conduct regular security reviews and vulnerability assessments. We monitor for suspicious activity and implement automated threat detection.',
        'Despite our security measures, no method of transmission over the internet or electronic storage is 100% secure. We cannot guarantee absolute security. If you discover a security vulnerability, please report it to support@inkdex.io immediately.',
      ],
    },
    {
      heading: '10. Children\'s Privacy',
      paragraphs: [
        'Our Service is not intended for individuals under the age of 18. We do not knowingly collect personal information from children. If you are a parent or guardian and believe your child has provided us with personal information, please contact us at support@inkdex.io.',
        'If we discover that we have collected personal information from a child under 18, we will delete that information immediately.',
      ],
    },
    {
      heading: '11. International Data Transfers',
      paragraphs: [
        'Our Service is hosted in the United States, and data is stored on U.S.-based servers. If you access our Service from outside the United States, your information will be transferred to, stored, and processed in the United States.',
        'By using our Service, you consent to the transfer of your information to the United States and agree that U.S. law will govern the collection and use of your information.',
      ],
    },
    {
      heading: '12. Changes to This Privacy Policy',
      paragraphs: [
        'We may update this Privacy Policy from time to time to reflect changes in our practices, technology, legal requirements, or other factors. When we make material changes, we will notify you by: (a) posting a notice on our homepage; (b) sending an email to your registered email address; or (c) displaying an in-app notification in your dashboard.',
        'Changes will take effect 30 days after notification. Your continued use of the Service after the effective date constitutes acceptance of the updated Privacy Policy. If you do not agree to the changes, you must stop using the Service and may delete your account.',
        'We encourage you to review this Privacy Policy periodically to stay informed about how we protect your data.',
      ],
    },
    {
      heading: '13. Contact Us',
      paragraphs: [
        'If you have questions or concerns about this Privacy Policy or our data practices, please contact us at:',
        'Email: support@inkdex.io',
        'We aim to respond to all privacy inquiries within 24-48 hours. For data access, deletion, or portability requests under GDPR or CCPA, we will respond within 30 days as required by law.',
      ],
    },
  ],
}
