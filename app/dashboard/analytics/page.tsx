/**
 * Analytics Dashboard Page
 * Redirects to Overview (analytics now integrated there)
 */

import { redirect } from 'next/navigation'

export default async function AnalyticsPage() {
  // Analytics are now shown on the Overview tab
  redirect('/dashboard')
}
