import { sanitizeText } from '@/lib/utils/sanitize'

interface BioInterstitialProps {
  artistName: string
  bio: string
}

export default function BioInterstitial({
  artistName,
  bio,
}: BioInterstitialProps) {
  return (
    <div className="relative bg-surface-low border border-border-subtle rounded-xl p-8 md:p-12 my-8 noise-overlay">
      {/* Border glow effect */}
      <div
        className="absolute inset-0 rounded-xl pointer-events-none"
        style={{
          boxShadow: 'inset 0 0 40px rgba(59, 130, 246, 0.1)',
        }}
      />

      <div className="relative max-w-3xl mx-auto text-center space-y-4">
        <h3 className="font-display text-h3 font-bold text-text-primary">
          About {artistName}
        </h3>

        <p className="font-accent text-body-large leading-relaxed text-text-primary italic">
          {sanitizeText(bio)}
        </p>
      </div>
    </div>
  )
}
