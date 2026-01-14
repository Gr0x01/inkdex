/**
 * Onboarding Progress Indicator
 *
 * Displays current step in the 3-step streamlined onboarding flow
 * Steps: Basic Info → Locations → Launch
 *
 * Design: Paper-white editorial with ink-black accents
 */

interface ProgressIndicatorProps {
  currentStep: number; // 1-3
}

const STEPS = [
  { id: 1, name: 'Basic Info', short: 'Info' },
  { id: 2, name: 'Locations', short: 'Location' },
  { id: 3, name: 'Launch', short: 'Launch' },
];

export function ProgressIndicator({ currentStep }: ProgressIndicatorProps) {
  return (
    <div className="w-full max-w-xl mx-auto px-3 sm:px-4 lg:px-6 pt-4 sm:pt-6 pb-3 sm:pb-4">
      {/* Progress bar */}
      <div className="relative flex">
        {/* Background line - connects the dots */}
        <div
          className="absolute top-1/2 h-px -translate-y-1/2 bg-(--gray-300)"
          style={{
            left: `${(1 / (STEPS.length * 2)) * 100}%`,
            right: `${(1 / (STEPS.length * 2)) * 100}%`,
          }}
        />

        {/* Progress fill */}
        <div
          className="absolute top-1/2 h-px -translate-y-1/2 bg-(--ink-black) transition-all duration-500"
          style={{
            left: `${(1 / (STEPS.length * 2)) * 100}%`,
            width: `${((currentStep - 1) / (STEPS.length - 1)) * ((STEPS.length - 1) / STEPS.length) * 100}%`,
          }}
        />

        {/* Step dots - same grid structure as labels */}
        {STEPS.map((step) => {
          const isCompleted = step.id < currentStep;
          const isCurrent = step.id === currentStep;

          return (
            <div
              key={step.id}
              className="flex-1 flex justify-center"
            >
              <div className="relative z-10 flex flex-col items-center">
                {/* Dot */}
                <div
                  className={`w-3 h-3 sm:w-4 sm:h-4 rounded-full border-2 transition-all duration-300 flex items-center justify-center ${
                    isCurrent
                      ? 'bg-(--ink-black) border-(--ink-black) scale-110'
                      : isCompleted
                        ? 'bg-(--ink-black) border-(--ink-black)'
                        : 'bg-(--paper-white) border-(--gray-300)'
                  }`}
                >
                  {/* Completed checkmark */}
                  {isCompleted && (
                    <svg
                      className="w-2 h-2 sm:w-3 sm:h-3 text-(--paper-white)"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </div>

                {/* Step label (mobile/tablet only - hidden on desktop) */}
                <span
                  className={`block lg:hidden mt-1.5 sm:mt-2 font-mono text-[9px] sm:text-[10px] tracking-widest uppercase transition-colors ${
                    isCurrent
                      ? 'text-(--ink-black) font-medium'
                      : isCompleted
                        ? 'text-(--gray-500)'
                        : 'text-(--gray-400)'
                  }`}
                >
                  {step.short}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
