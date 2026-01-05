'use client'

import { memo, useState, useCallback } from 'react'
import type { FAQ } from '@/lib/content/types'
import { serializeJsonLd, sanitizeForJsonLd } from '@/lib/utils/seo'

interface FAQSectionProps {
  faqs: FAQ[]
  cityName: string
  className?: string
}

/**
 * FAQ Section with accordion UI and FAQPage JSON-LD schema
 * Editorial minimal aesthetic matching Inkdex design system
 */
const FAQSection = memo(function FAQSection({
  faqs,
  cityName,
  className = '',
}: FAQSectionProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  const toggleFAQ = useCallback((index: number) => {
    setOpenIndex(prev => prev === index ? null : index)
  }, [])

  // Generate FAQPage JSON-LD schema
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(faq => ({
      '@type': 'Question',
      name: sanitizeForJsonLd(faq.question),
      acceptedAnswer: {
        '@type': 'Answer',
        text: sanitizeForJsonLd(faq.answer),
      },
    })),
  }

  return (
    <>
      {/* FAQPage Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
      />

      <section
        className={`faq-section max-w-3xl ${className}`}
        aria-labelledby="faq-heading"
      >
        {/* Section Header */}
        <div className="mb-8">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-text-tertiary mb-2">
            FAQ
          </p>
          <h2
            id="faq-heading"
            className="font-display text-2xl md:text-3xl font-bold text-text-primary tracking-tight"
          >
            Common Questions
          </h2>
        </div>

        {/* FAQ List */}
        <div className="divide-y divide-border-subtle">
          {faqs.map((faq, index) => (
            <FAQItem
              key={index}
              question={faq.question}
              answer={faq.answer}
              isOpen={openIndex === index}
              onToggle={() => toggleFAQ(index)}
              index={index}
            />
          ))}
        </div>
      </section>
    </>
  )
})

interface FAQItemProps {
  question: string
  answer: string
  isOpen: boolean
  onToggle: () => void
  index: number
}

const FAQItem = memo(function FAQItem({
  question,
  answer,
  isOpen,
  onToggle,
  index,
}: FAQItemProps) {
  const headingId = `faq-question-${index}`
  const contentId = `faq-answer-${index}`

  return (
    <div className="group">
      <button
        id={headingId}
        aria-expanded={isOpen}
        aria-controls={contentId}
        onClick={onToggle}
        className="w-full py-5 flex items-start justify-between text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-text-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary"
      >
        <span className="font-body text-base md:text-lg font-medium text-text-primary pr-8 leading-snug">
          {question}
        </span>
        <span
          className={`flex-shrink-0 mt-1 w-4 h-4 text-text-tertiary transition-transform duration-300 ease-[var(--ease-smooth)] ${
            isOpen ? 'rotate-45' : ''
          }`}
          aria-hidden="true"
        >
          <svg
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <line x1="8" y1="2" x2="8" y2="14" />
            <line x1="2" y1="8" x2="14" y2="8" />
          </svg>
        </span>
      </button>

      <div
        id={contentId}
        role="region"
        aria-labelledby={headingId}
        className={`grid transition-all duration-300 ease-[var(--ease-smooth)] ${
          isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
        }`}
      >
        <div className="overflow-hidden">
          <p className="pb-6 pr-12 font-body text-base text-text-secondary leading-relaxed">
            {answer}
          </p>
        </div>
      </div>
    </div>
  )
})

export default FAQSection
