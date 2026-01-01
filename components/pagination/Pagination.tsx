import Link from 'next/link'

interface PaginationProps {
  currentPage: number
  totalPages: number
  buildUrl: (page: number) => string
  className?: string
}

/**
 * Generate page numbers with truncation for large page counts
 * Examples:
 *   - 5 pages: [1, 2, 3, 4, 5]
 *   - 10 pages, on page 1: [1, 2, 3, ..., 10]
 *   - 10 pages, on page 5: [1, ..., 4, 5, 6, ..., 10]
 */
function generatePageNumbers(current: number, total: number): (number | '...')[] {
  // Show all pages if 7 or fewer
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1)
  }

  const pages: (number | '...')[] = []

  // Always show first page
  pages.push(1)

  // Calculate range around current page
  const startPage = Math.max(2, current - 1)
  const endPage = Math.min(total - 1, current + 1)

  // Add ellipsis after first page if needed
  if (startPage > 2) {
    pages.push('...')
  }

  // Add pages around current
  for (let i = startPage; i <= endPage; i++) {
    pages.push(i)
  }

  // Add ellipsis before last page if needed
  if (endPage < total - 1) {
    pages.push('...')
  }

  // Always show last page
  if (total > 1) {
    pages.push(total)
  }

  return pages
}

/**
 * Pagination component for browse pages
 * Provides Previous/Next buttons and numbered page links with smart truncation
 */
export default function Pagination({
  currentPage,
  totalPages,
  buildUrl,
  className = '',
}: PaginationProps) {
  // Hide pagination if only one page
  if (totalPages <= 1) {
    return null
  }

  return (
    <nav
      className={`flex items-center justify-center gap-3 flex-wrap mt-16 ${className}`}
      role="navigation"
      aria-label="Pagination"
    >
      {/* Previous Button */}
      {currentPage > 1 ? (
        <Link
          href={buildUrl(currentPage - 1)}
          className="inline-flex items-center gap-2 px-5 py-2.5 font-body text-[15px] text-ink border-2 border-ink/20 hover:border-ink hover:-translate-y-[2px] hover:shadow-md transition-all duration-fast group"
          aria-label="Go to previous page"
        >
          <svg
            className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform duration-fast"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2.5}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          <span>Previous</span>
        </Link>
      ) : (
        <div
          className="inline-flex items-center gap-2 px-5 py-2.5 font-body text-[15px] text-gray-400 border-2 border-gray-200 cursor-not-allowed"
          aria-disabled="true"
        >
          <svg
            className="w-3.5 h-3.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2.5}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          <span>Previous</span>
        </div>
      )}

      {/* Numbered Page Buttons */}
      <div className="flex items-center gap-1.5">
        {generatePageNumbers(currentPage, totalPages).map((pageNum, index) => {
          if (pageNum === '...') {
            return (
              <span
                key={`ellipsis-${index}`}
                className="px-2 font-body text-lg text-gray-500"
                aria-hidden="true"
              >
                &hellip;
              </span>
            )
          }

          const page = pageNum as number
          const isActive = page === currentPage

          return (
            <Link
              key={page}
              href={buildUrl(page)}
              className={`
                min-w-[44px] h-[44px] flex items-center justify-center
                font-body text-[17px] font-medium
                border-2 transition-all duration-fast
                ${isActive
                  ? 'bg-ink border-ink text-paper shadow-sm cursor-default'
                  : 'bg-paper border-ink/20 text-ink hover:border-ink hover:-translate-y-[2px] hover:shadow-md'
                }
              `}
              aria-label={`Go to page ${page}`}
              aria-current={isActive ? 'page' : undefined}
              tabIndex={isActive ? -1 : 0}
            >
              {page}
            </Link>
          )
        })}
      </div>

      {/* Next Button */}
      {currentPage < totalPages ? (
        <Link
          href={buildUrl(currentPage + 1)}
          className="inline-flex items-center gap-2 px-5 py-2.5 font-body text-[15px] text-ink border-2 border-ink/20 hover:border-ink hover:-translate-y-[2px] hover:shadow-md transition-all duration-fast group"
          aria-label="Go to next page"
        >
          <span>Next</span>
          <svg
            className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform duration-fast"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2.5}
              d="M9 5l7 7-7 7"
            />
          </svg>
        </Link>
      ) : (
        <div
          className="inline-flex items-center gap-2 px-5 py-2.5 font-body text-[15px] text-gray-400 border-2 border-gray-200 cursor-not-allowed"
          aria-disabled="true"
        >
          <span>Next</span>
          <svg
            className="w-3.5 h-3.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2.5}
              d="M9 5l7 7-7 7"
            />
          </svg>
        </div>
      )}
    </nav>
  )
}
