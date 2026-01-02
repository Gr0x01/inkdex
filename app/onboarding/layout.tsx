/**
 * Onboarding Layout
 *
 * Wraps all onboarding pages with:
 * - Progress indicator showing current step
 * - Paper-white editorial background with grain texture
 * - Centered content area
 */

'use client';

import { usePathname } from 'next/navigation';
import { ProgressIndicator } from '@/components/onboarding/ProgressIndicator';

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  // Determine current step from pathname
  const getCurrentStep = () => {
    if (pathname.includes('/fetch')) return 1;
    if (pathname.includes('/preview')) return 2;
    if (pathname.includes('/portfolio')) return 3;
    if (pathname.includes('/booking')) return 4;
    if (pathname.includes('/complete')) return 5;
    return 1;
  };

  const currentStep = getCurrentStep();

  return (
    <div className="min-h-screen bg-[var(--paper-white)] relative">
      {/* Grain texture overlay */}
      <div className="grain-overlay absolute inset-0 pointer-events-none" />

      {/* Content */}
      <div className="relative">
        {/* Progress indicator */}
        <ProgressIndicator currentStep={currentStep} />

        {/* Page content */}
        <main className="container mx-auto px-4 py-8 max-w-4xl">
          {children}
        </main>
      </div>
    </div>
  );
}
