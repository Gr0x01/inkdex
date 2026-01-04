import StyleCard from './StyleCard'

interface StyleSeed {
  id: string
  style_name: string
  display_name: string
  seed_image_url: string
  description?: string | null
}

interface StyleExplorerProps {
  styles: StyleSeed[]
}

export default function StyleExplorer({ styles }: StyleExplorerProps) {
  if (!styles || styles.length === 0) {
    return null
  }

  return (
    <section className="relative pt-8 pb-12 md:pt-12 md:pb-20 bg-paper overflow-hidden">
      <div className="container mx-auto px-4 relative z-10">
        {/* Section Header */}
        <div className="text-center mb-8 md:mb-12">
          <p className="font-mono text-xs font-medium text-gray-400 tracking-[0.4em] uppercase mb-3">
            Quick Search
          </p>
          <h2
            className="font-display leading-tight tracking-tight mb-4 text-ink"
            style={{
              fontSize: 'clamp(2rem, 5vw, 3.5rem)',
            }}
          >
            EXPLORE BY STYLE
          </h2>
          <p className="font-body text-base md:text-lg max-w-xl mx-auto text-gray-600">
            Tap a vibe to discover artists who specialize in that style
          </p>
        </div>

        {/* Style Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4">
          {styles.map((style, index) => (
            <div
              key={style.id}
              className="animate-fade-up"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <StyleCard
                styleName={style.style_name}
                displayName={style.display_name}
                imageUrl={style.seed_image_url}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
