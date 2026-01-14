/**
 * Competitor card for the alternatives index page
 * Links to individual comparison page
 */

import Link from 'next/link'

interface CompetitorCardProps {
  slug: string
  name: string
  tagline: string
  keyDifferentiator: string
}

export default function CompetitorCard({
  slug,
  name,
  tagline,
  keyDifferentiator,
}: CompetitorCardProps) {
  return (
    <Link
      href={`/alternatives/${slug}`}
      className="group block p-6 border-2 border-border-subtle bg-bg-primary hover:border-ink-black transition-colors"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h2 className="font-display text-xl font-bold text-text-primary mb-2 group-hover:text-ink-black transition-colors">
            Inkdex vs {name}
          </h2>
          <p className="font-body text-sm text-text-secondary mb-4 line-clamp-2">
            {tagline}
          </p>
          <p className="font-body text-sm text-text-primary">
            <span className="font-medium">Key advantage:</span>{' '}
            <span className="text-text-secondary line-clamp-1">
              {keyDifferentiator}
            </span>
          </p>
        </div>
        <span
          className="shrink-0 mt-1 text-text-tertiary group-hover:text-ink-black group-hover:translate-x-1 transition-all"
          aria-hidden="true"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
        </span>
      </div>
    </Link>
  )
}
