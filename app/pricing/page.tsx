import { Metadata } from 'next'
import Link from 'next/link'
import PricingCards from '@/components/pricing/PricingCards'
import FAQSection from '@/components/seo/FAQSection'
import { PricingPageTracker } from '@/components/analytics/PricingPageTracker'
import type { FAQ } from '@/lib/content/types'

export const metadata: Metadata = {
  title: 'Pricing | Inkdex',
  description:
    'Choose your Inkdex plan. Free tier for getting started, Pro tier ($15/mo) for 100 portfolio images, auto-sync, analytics, and priority placement.',
  openGraph: {
    title: 'Pricing | Inkdex',
    description:
      'Free tier to get started. Pro tier for 100 portfolio images, auto-sync from Instagram, analytics dashboard, and priority search placement.',
    url: 'https://inkdex.io/pricing',
    type: 'website',
  },
}

const FAQ_ITEMS: FAQ[] = [
  {
    question: 'Can I cancel anytime?',
    answer:
      'Yes, you can cancel your Pro subscription anytime from your dashboard. Your Pro features remain active until the end of your current billing period.',
  },
  {
    question: 'What happens if I downgrade?',
    answer:
      'When your Pro subscription ends, your portfolio is limited to 20 images. We keep the 20 most recently pinned or added images visible. The rest are hidden but not deleted—upgrade again to restore them.',
  },
  {
    question: 'Do you offer refunds?',
    answer:
      'No refunds are provided per our Terms of Service. You can cancel anytime to prevent future charges, and your Pro access continues until the billing period ends.',
  },
  {
    question: 'Can I switch from monthly to yearly?',
    answer:
      'Yes! Manage your subscription through the billing portal in your dashboard. Switching to yearly saves you $30 per year.',
  },
  {
    question: 'What payment methods do you accept?',
    answer:
      'We accept all major credit and debit cards (Visa, Mastercard, American Express, Discover) through Stripe, our secure payment processor.',
  },
]

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-paper">
      {/* Track pricing page view */}
      <PricingPageTracker />

      {/* Hero Section */}
      <section className="pt-16 pb-8 md:pt-24 md:pb-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center">
            <p className="font-mono text-xs font-semibold text-purple-600 tracking-[0.3em] uppercase mb-4">
              Simple Pricing
            </p>
            <h1
              className="font-display leading-[1.1] tracking-tight mb-4"
              style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)' }}
            >
              Get Found by More Clients
            </h1>
            <p className="font-body text-lg text-gray-600 leading-relaxed max-w-xl mx-auto">
              Start free. Upgrade when you&apos;re ready for 100 images, auto-sync, and priority placement in search results.
            </p>
          </div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="pb-16 md:pb-24">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <PricingCards />
        </div>
      </section>

      {/* FAQ Section */}
      <section className="pb-16 md:pb-24 border-t border-border-subtle">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 pt-16 md:pt-24">
          <FAQSection
            faqs={FAQ_ITEMS}
            title="Frequently Asked Questions"
            label="Pricing"
          />
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="pb-16 md:pb-24">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-xl mx-auto text-center">
            <p className="font-body text-gray-600 mb-2">
              Questions about Pro?
            </p>
            <Link
              href="/contact"
              className="font-mono text-sm text-purple-600 hover:text-purple-700 underline underline-offset-4"
            >
              Contact us
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}
