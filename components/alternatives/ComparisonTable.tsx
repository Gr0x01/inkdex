/**
 * Feature comparison table for competitor pages
 * Clean table design with visual emphasis on Inkdex column
 */

import type { ComparisonFeature } from '@/lib/content/alternatives'

interface ComparisonTableProps {
  features: ComparisonFeature[]
  competitorName: string
  className?: string
}

export default function ComparisonTable({
  features,
  competitorName,
  className = '',
}: ComparisonTableProps) {
  return (
    <div className={className}>
      {/* Desktop table */}
      <div className="hidden md:block border-2 border-ink-black overflow-hidden">
        <table className="w-full border-collapse">
          <caption className="sr-only">
            Feature comparison between Inkdex and {competitorName}
          </caption>
          <thead>
            <tr>
              <th
                scope="col"
                className="w-[40%] py-4 px-6 text-left font-mono text-[10px] uppercase tracking-[0.15em] text-text-tertiary bg-gray-50 border-b-2 border-ink-black"
              >
                Feature
              </th>
              <th
                scope="col"
                className="w-[30%] py-4 px-6 text-left font-mono text-[10px] uppercase tracking-[0.15em] bg-ink-black text-paper-white border-b-2 border-ink-black"
              >
                <span className="flex items-center gap-2">
                  Inkdex
                  <span className="px-1.5 py-0.5 bg-green-500 text-[8px] tracking-wider">
                    Winner
                  </span>
                </span>
              </th>
              <th
                scope="col"
                className="w-[30%] py-4 px-6 text-left font-mono text-[10px] uppercase tracking-[0.15em] text-text-tertiary bg-gray-50 border-b-2 border-ink-black"
              >
                {competitorName}
              </th>
            </tr>
          </thead>
          <tbody>
            {features.map((row, index) => (
              <tr
                key={row.feature}
                className={`
                  border-b border-border-subtle last:border-b-0
                  ${row.highlight ? 'bg-green-50/60' : index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}
                `}
              >
                {/* Feature name */}
                <td className="py-4 px-6 font-body text-sm text-text-primary">
                  <span className="flex items-center gap-2">
                    {row.feature}
                    {row.highlight && (
                      <span className="px-2 py-0.5 text-[9px] font-mono uppercase tracking-wider bg-green-600 text-white">
                        Key
                      </span>
                    )}
                  </span>
                </td>

                {/* Inkdex value - emphasized */}
                <td className="py-4 px-6 font-body text-sm bg-ink-black text-paper-white">
                  {typeof row.inkdex === 'boolean' ? (
                    row.inkdex ? (
                      <span className="flex items-center gap-2">
                        <span className="w-5 h-5 flex items-center justify-center bg-green-500">
                          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        </span>
                        <span className="font-medium">Yes</span>
                      </span>
                    ) : (
                      <span className="flex items-center gap-2 text-red-400">
                        <span className="w-5 h-5 flex items-center justify-center bg-red-500/20">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </span>
                        No
                      </span>
                    )
                  ) : (
                    <span className="font-medium">{row.inkdex}</span>
                  )}
                </td>

                {/* Competitor value - subdued */}
                <td className="py-4 px-6 font-body text-sm text-text-tertiary">
                  {typeof row.competitor === 'boolean' ? (
                    row.competitor ? (
                      <span className="flex items-center gap-2">
                        <span className="w-5 h-5 flex items-center justify-center bg-gray-200">
                          <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        </span>
                        Yes
                      </span>
                    ) : (
                      <span className="flex items-center gap-2 text-red-400">
                        <span className="w-5 h-5 flex items-center justify-center bg-red-50">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </span>
                        No
                      </span>
                    )
                  ) : (
                    row.competitor
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile: stacked cards */}
      <div className="md:hidden space-y-3">
        {features.map((row) => (
          <div
            key={row.feature}
            className={`
              border-2 overflow-hidden
              ${row.highlight ? 'border-ink-black' : 'border-border-subtle'}
            `}
          >
            {/* Feature name header */}
            <div className={`
              px-4 py-3 border-b
              ${row.highlight ? 'bg-ink-black text-paper-white border-ink-black' : 'bg-gray-50 border-border-subtle'}
            `}>
              <span className="font-body text-sm font-medium">
                {row.feature}
              </span>
              {row.highlight && (
                <span className="ml-2 px-1.5 py-0.5 text-[8px] font-mono uppercase tracking-wider bg-green-500 text-white">
                  Key
                </span>
              )}
            </div>

            {/* Values side by side */}
            <div className="grid grid-cols-2 divide-x divide-border-subtle">
              {/* Inkdex */}
              <div className="p-4 bg-ink-black text-paper-white">
                <span className="block font-mono text-[9px] uppercase tracking-wider text-paper-white/50 mb-1">
                  Inkdex
                </span>
                <span className="font-body text-sm font-medium">
                  {typeof row.inkdex === 'boolean'
                    ? row.inkdex ? '✓ Yes' : '✗ No'
                    : row.inkdex
                  }
                </span>
              </div>

              {/* Competitor */}
              <div className="p-4 bg-gray-50">
                <span className="block font-mono text-[9px] uppercase tracking-wider text-text-tertiary mb-1">
                  {competitorName}
                </span>
                <span className={`font-body text-sm ${typeof row.competitor === 'boolean' && !row.competitor ? 'text-red-400' : 'text-text-secondary'}`}>
                  {typeof row.competitor === 'boolean'
                    ? row.competitor ? 'Yes' : '✗ No'
                    : row.competitor
                  }
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
