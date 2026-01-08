import Link from 'next/link'

interface CTAButton {
  label: string
  href: string
  variant: 'primary' | 'secondary'
}

interface CTASectionProps {
  headline: string
  description: string
  buttons: CTAButton[]
  className?: string
}

/**
 * Reusable CTA section for bottom of SEO pages
 * Configurable headline, description, and buttons
 */
export default function CTASection({
  headline,
  description,
  buttons,
  className = '',
}: CTASectionProps) {
  return (
    <section className={`p-8 bg-bg-secondary border-2 border-border-subtle ${className}`}>
      <h2 className="font-display text-xl font-bold text-text-primary mb-3">{headline}</h2>
      <p className="font-body text-text-secondary mb-6">{description}</p>
      <div className="flex flex-wrap gap-4">
        {buttons.map((button, i) =>
          button.variant === 'primary' ? (
            <Link
              key={i}
              href={button.href}
              className="inline-flex items-center gap-2 px-6 py-3 bg-ink-black text-paper-white font-mono text-xs uppercase tracking-[0.15em] border-2 border-ink-black hover:-translate-y-0.5 hover:shadow-md transition-all"
            >
              {button.label}
              <span aria-hidden="true">&rarr;</span>
            </Link>
          ) : (
            <Link
              key={i}
              href={button.href}
              className="inline-flex items-center px-6 py-3 font-mono text-xs uppercase tracking-[0.15em] text-text-secondary border-2 border-border-subtle hover:border-ink-black hover:text-ink-black transition-all"
            >
              {button.label}
            </Link>
          )
        )}
      </div>
    </section>
  )
}
