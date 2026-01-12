'use client'

import { useRouter, useSearchParams } from 'next/navigation'

export default function ClearFiltersButton() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const id = searchParams.get('id')
  const hasFilters = searchParams.get('country') || searchParams.get('region') || searchParams.get('city')

  if (!hasFilters || !id) return null

  const handleClear = () => {
    router.push(`/search?id=${id}`)
  }

  return (
    <button
      onClick={handleClear}
      className="px-2 py-1 text-[11px] font-mono uppercase tracking-wider text-ink/50 hover:text-ink hover:bg-ink/5 transition-colors rounded"
    >
      Clear
    </button>
  )
}
