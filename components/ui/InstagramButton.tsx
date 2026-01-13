/**
 * Instagram-styled gradient button with hover inversion effect
 * Used for Instagram OAuth and CTA buttons
 */

import Link from 'next/link'

interface InstagramButtonProps {
  /** Button text */
  children: React.ReactNode
  /** Link destination (uses Next.js Link) */
  href?: string
  /** Click handler (for button mode) */
  onClick?: () => void
  /** Additional CSS classes */
  className?: string
  /** Use anchor tag for external/API routes that need full page redirect */
  asAnchor?: boolean
}

export default function InstagramButton({
  children,
  href,
  onClick,
  className = '',
  asAnchor = false,
}: InstagramButtonProps) {
  const innerContent = (
    <span className="group-hover:bg-gradient-to-r group-hover:from-[#f09433] group-hover:via-[#dc2743] group-hover:to-[#bc1888] group-hover:bg-clip-text group-hover:text-transparent transition-all duration-200">
      {children}
    </span>
  )

  const innerClasses = `
    block w-full py-3 px-6 text-white text-center
    font-mono text-xs tracking-[0.15em] uppercase font-semibold
    focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500
  `

  const wrapperContent = (
    <div
      className={`group relative transition-all duration-200 overflow-hidden ${className}`}
      style={{
        background:
          'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)',
        padding: '2px',
      }}
    >
      <div className="relative bg-gradient-to-r from-[#f09433] via-[#dc2743] to-[#bc1888] group-hover:bg-none group-hover:bg-paper transition-all duration-200">
        {href ? (
          asAnchor ? (
            <a href={href} className={innerClasses}>
              {innerContent}
            </a>
          ) : (
            <Link href={href} className={innerClasses}>
              {innerContent}
            </Link>
          )
        ) : (
          <button onClick={onClick} className={innerClasses}>
            {innerContent}
          </button>
        )}
      </div>
    </div>
  )

  return wrapperContent
}
