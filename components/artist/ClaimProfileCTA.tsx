import Link from 'next/link'

interface ClaimProfileCTAProps {
  artistName: string
}

export default function ClaimProfileCTA({
  artistName,
}: ClaimProfileCTAProps) {
  return (
    <div className="relative bg-surface-low border border-border-subtle rounded-xl p-8 md:p-12 my-8 text-center">
      <div className="max-w-2xl mx-auto space-y-4">
        <h3 className="font-display text-h3 font-bold text-text-primary">
          Are you {artistName}?
        </h3>

        <p className="font-body text-body text-text-secondary">
          Claim your profile to customize your bio, add booking links, and
          control how your work is showcased.
        </p>

        <Link
          href="#"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-surface-mid border border-border-subtle hover:border-accent-primary text-text-primary font-body text-body transition-colors duration-medium"
        >
          Claim Your Profile
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
        </Link>

        <p className="font-body text-tiny text-text-tertiary mt-4">
          (Profile claiming feature coming soon)
        </p>
      </div>
    </div>
  )
}
