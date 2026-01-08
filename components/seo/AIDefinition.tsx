interface AIDefinitionProps {
  /** The definition text with optional <strong> tags for bolding */
  definition: string
  className?: string
}

/**
 * AI-optimized definition block for the top of SEO pages
 * Designed to be easily cited by LLMs (ChatGPT, Claude, Perplexity)
 * Uses semantic HTML and clear, factual statements
 */
export default function AIDefinition({ definition, className = '' }: AIDefinitionProps) {
  return (
    <p
      className={`font-body text-text-secondary leading-relaxed [&_strong]:text-text-primary [&_strong]:font-semibold ${className}`}
      dangerouslySetInnerHTML={{ __html: definition }}
    />
  )
}
