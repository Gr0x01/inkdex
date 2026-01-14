export default function MaintenancePage() {
  return (
    <div className="min-h-screen bg-ink relative overflow-hidden flex items-center justify-center">
      {/* Subtle radial glow */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(255, 255, 255, 0.03) 0%, transparent 60%)'
        }}
      />

      {/* Grain texture overlay */}
      <div className="absolute inset-0 grain-overlay pointer-events-none opacity-30" />

      {/* Content */}
      <div className="relative z-10 text-center px-6 max-w-2xl mx-auto">
        {/* Decorative line */}
        <div className="w-16 h-px bg-white/20 mx-auto mb-8" />

        {/* Mono label */}
        <p
          className="font-mono text-xs uppercase tracking-[0.25em] mb-6"
          style={{ color: 'rgba(255, 255, 255, 0.4)' }}
        >
          Scheduled Maintenance
        </p>

        {/* Main headline - editorial display */}
        <h1
          className="font-display leading-[0.95] mb-6"
          style={{
            fontSize: 'clamp(2.5rem, 8vw, 4.5rem)',
            color: '#FFFFFF',
            letterSpacing: '-0.02em'
          }}
        >
          WE&apos;LL BE
          <br />
          <span style={{ color: 'rgba(255, 255, 255, 0.4)' }}>
            RIGHT BACK.
          </span>
        </h1>

        {/* Body text */}
        <p
          className="font-body text-base md:text-lg leading-relaxed mb-10 max-w-md mx-auto"
          style={{ color: 'rgba(255, 255, 255, 0.6)' }}
        >
          Inkdex is undergoing scheduled maintenance to improve your experience.
          We&apos;ll be back online shortly.
        </p>

        {/* Status indicator */}
        <div className="inline-flex items-center gap-3 px-5 py-3 border border-white/10 bg-white/2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
          </span>
          <span
            className="font-mono text-xs uppercase tracking-[0.15em]"
            style={{ color: 'rgba(255, 255, 255, 0.5)' }}
          >
            Maintenance in progress
          </span>
        </div>

        {/* Decorative line */}
        <div className="w-16 h-px bg-white/20 mx-auto mt-12" />
      </div>

      {/* Bottom fade */}
      <div
        className="absolute bottom-0 left-0 right-0 h-32 pointer-events-none"
        style={{
          background: 'linear-gradient(to bottom, transparent 0%, rgba(26, 26, 26, 0.5) 100%)'
        }}
      />
    </div>
  )
}
