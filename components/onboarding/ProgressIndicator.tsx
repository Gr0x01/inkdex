/**
 * Onboarding Progress Indicator
 *
 * Displays current step in the 2-step streamlined onboarding flow
 * Steps: Profile Info → Launch
 *
 * Design: Paper-white editorial with ink-black accents
 */

interface ProgressIndicatorProps {
  currentStep: number; // 1-2
}

const STEPS = [
  { id: 1, name: 'Profile Info', short: 'Info' },
  { id: 2, name: 'Launch', short: 'Launch' },
];

export function ProgressIndicator({ currentStep }: ProgressIndicatorProps) {
  return (
    <div className="w-full max-w-xl mx-auto px-4 py-8">
      {/* Step labels (desktop) */}
      <div className="hidden md:flex justify-between mb-4">
        {STEPS.map((step) => (
          <div key={step.id} className="flex-1 text-center">
            <span
              className={`font-mono text-[11px] tracking-[0.15em] uppercase transition-colors ${
                step.id === currentStep
                  ? 'text-[var(--ink-black)] font-medium'
                  : step.id < currentStep
                    ? 'text-[var(--gray-500)]'
                    : 'text-[var(--gray-400)]'
              }`}
            >
              {step.name}
            </span>
          </div>
        ))}
      </div>

      {/* Progress bar */}
      <div className="relative flex items-center justify-between">
        {/* Background line */}
        <div className="absolute top-1/2 left-0 right-0 h-[1px] -translate-y-1/2 bg-[var(--gray-300)]" />

        {/* Progress fill */}
        <div
          className="absolute top-1/2 left-0 h-[1px] -translate-y-1/2 bg-[var(--ink-black)] transition-all duration-500"
          style={{
            width: `${((currentStep - 1) / (STEPS.length - 1)) * 100}%`,
          }}
        />

        {/* Step dots */}
        {STEPS.map((step) => {
          const isCompleted = step.id < currentStep;
          const isCurrent = step.id === currentStep;

          return (
            <div
              key={step.id}
              className="relative z-10 flex flex-col items-center"
            >
              {/* Dot */}
              <div
                className={`w-4 h-4 rounded-full border-2 transition-all duration-300 flex items-center justify-center ${
                  isCurrent
                    ? 'bg-[var(--ink-black)] border-[var(--ink-black)] scale-110'
                    : isCompleted
                      ? 'bg-[var(--ink-black)] border-[var(--ink-black)]'
                      : 'bg-[var(--paper-white)] border-[var(--gray-300)]'
                }`}
              >
                {/* Completed checkmark */}
                {isCompleted && (
                  <svg
                    className="w-3 h-3 text-[var(--paper-white)]"
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

              {/* Step label (mobile) */}
              <span
                className={`md:hidden mt-2 font-mono text-[8px] tracking-[0.1em] uppercase transition-colors ${
                  isCurrent
                    ? 'text-[var(--ink-black)] font-medium'
                    : isCompleted
                      ? 'text-[var(--gray-500)]'
                      : 'text-[var(--gray-400)]'
                }`}
              >
                {step.short}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
