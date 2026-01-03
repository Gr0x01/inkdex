import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-bg-primary relative noise-overlay flex items-center justify-center px-4">
      <div className="max-w-md mx-auto text-center space-y-6">
        <h1 className="font-display text-display font-[700] text-text-primary">
          404
        </h1>

        <div className="space-y-2">
          <h2 className="font-display text-h2 font-[700] text-text-primary">
            Artist Not Found
          </h2>
          <p className="font-body text-body text-text-secondary">
            The artist profile you&apos;re looking for doesn&apos;t exist or may have been
            removed.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
          <Link href="/" className="btn btn-primary">
            Back to Home
          </Link>
          <Link href="/us/tx/austin" className="btn btn-secondary">
            Browse Austin Artists
          </Link>
        </div>
      </div>
    </div>
  )
}
