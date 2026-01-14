/**
 * Pain point card for competitor comparison pages
 * Editorial design with clear problem/solution structure
 */

import type { PainPoint } from '@/lib/content/alternatives'

interface PainPointCardProps extends PainPoint {
  index: number
}

export default function PainPointCard({
  title,
  description,
  quote,
  quoteSource,
  inkdexSolution,
  index,
}: PainPointCardProps) {
  return (
    <article className="group relative">
      {/* Large background number */}
      <div className="absolute -left-2 -top-4 font-display text-[120px] font-bold text-gray-100 leading-none select-none pointer-events-none opacity-60 -z-10">
        {String(index).padStart(2, '0')}
      </div>

      <div className="relative bg-paper-white border-2 border-border-subtle p-6 md:p-8 transition-all duration-300 hover:border-ink-black hover:shadow-lg">
        {/* Problem section */}
        <div className="mb-6">
          <span className="inline-block font-mono text-[9px] uppercase tracking-[0.2em] text-red-600 mb-3">
            The Problem
          </span>
          <h3 className="font-display text-xl md:text-2xl font-bold text-text-primary mb-3 tracking-tight">
            {title}
          </h3>
          <p className="font-body text-text-secondary leading-relaxed">
            {description}
          </p>
        </div>

        {/* Quote */}
        {quote && (
          <div className="relative mb-6 pl-5 py-4 border-l-4 border-ink-black bg-gray-50">
            <svg
              className="absolute left-6 -top-2 w-8 h-8 text-gray-200"
              fill="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
            </svg>
            <blockquote className="relative z-10">
              <p className="font-body text-sm md:text-base italic text-text-secondary leading-relaxed pl-6">
                &ldquo;{quote}&rdquo;
              </p>
              {quoteSource && (
                <footer className="mt-2 pl-6">
                  <cite className="font-mono text-[10px] uppercase tracking-wider text-text-tertiary not-italic">
                    — {quoteSource}
                  </cite>
                </footer>
              )}
            </blockquote>
          </div>
        )}

        {/* Solution section */}
        <div className="relative p-4 md:p-5 bg-ink-black text-paper-white">
          <div className="flex items-start gap-3">
            <div className="shrink-0 w-8 h-8 flex items-center justify-center bg-green-500 text-white">
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                strokeWidth={2.5}
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <div>
              <span className="block font-mono text-[9px] uppercase tracking-[0.2em] text-green-400 mb-1">
                Inkdex Solution
              </span>
              <p className="font-body text-sm md:text-base text-paper-white/90 leading-relaxed">
                {inkdexSolution}
              </p>
            </div>
          </div>
        </div>
      </div>
    </article>
  )
}
