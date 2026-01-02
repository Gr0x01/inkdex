/**
 * Onboarding Layout
 *
 * Wraps all onboarding pages with:
 * - Progress indicator showing current step
 * - Dark editorial background
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
    <div className="min-h-screen bg-zinc-950">
      {/* Grain overlay */}
      <div className="fixed inset-0 bg-grain-overlay opacity-[0.015] pointer-events-none" />

      {/* Content */}
      <div className="relative">
        {/* Progress indicator */}
        <ProgressIndicator currentStep={currentStep} />

        {/* Page content */}
        <main className="container mx-auto px-4 py-8 max-w-5xl">
          {children}
        </main>
      </div>
    </div>
  );
}
