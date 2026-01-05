'use client'

import { useState, useEffect, memo } from 'react'

interface TOCItem {
  id: string
  label: string
  indent?: boolean
}

interface TableOfContentsProps {
  items: TOCItem[]
}

/**
 * Sticky table of contents for guide pages
 * Highlights current section based on scroll position
 */
const TableOfContents = memo(function TableOfContents({
  items,
}: TableOfContentsProps) {
  const [activeId, setActiveId] = useState<string>('')

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id)
          }
        })
      },
      {
        rootMargin: '-20% 0% -60% 0%',
        threshold: 0,
      }
    )

    // Observe all section headings
    items.forEach((item) => {
      const element = document.getElementById(item.id)
      if (element) {
        observer.observe(element)
      }
    })

    return () => observer.disconnect()
  }, [items])

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault()
    const element = document.getElementById(id)
    if (element) {
      const offset = 96 // Account for sticky header
      const top = element.getBoundingClientRect().top + window.scrollY - offset
      window.scrollTo({ top, behavior: 'smooth' })
    }
  }

  return (
    <nav
      className="sticky top-24"
      aria-label="Table of contents"
    >
      <h2 className="font-display text-sm font-semibold text-text-primary mb-4 uppercase tracking-wider">
        On This Page
      </h2>
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item.id}>
            <a
              href={`#${item.id}`}
              onClick={(e) => handleClick(e, item.id)}
              className={`
                block text-sm py-1 transition-colors duration-150
                ${item.indent ? 'pl-4' : ''}
                ${
                  activeId === item.id
                    ? 'text-text-primary font-medium'
                    : 'text-text-tertiary hover:text-text-secondary'
                }
              `}
            >
              {item.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
})

export default TableOfContents
