/**
 * Onboarding Layout
 *
 * Wraps all onboarding pages with:
 * - Progress indicator showing current step
 * - Paper-white editorial background with grain texture
 * - Centered content area
 */

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-(--paper-white) relative">
      {/* Grain texture overlay */}
      <div className="grain-overlay absolute inset-0 pointer-events-none" />

      {/* Content */}
      <div className="relative">
        {/* Page content */}
        <main className="container mx-auto px-3 sm:px-4 lg:px-6 py-6 sm:py-8 lg:py-12 max-w-4xl">
          {children}
        </main>
      </div>
    </div>
  );
}
