/**
 * Onboarding Progress Indicator
 *
 * Displays current step in the 5-step onboarding flow
 * Steps: Fetch → Preview → Portfolio → Booking → Complete
 */

interface ProgressIndicatorProps {
  currentStep: number; // 1-5
}

const STEPS = [
  { id: 1, name: 'Fetch', short: 'Fetch' },
  { id: 2, name: 'Preview', short: 'Preview' },
  { id: 3, name: 'Portfolio', short: 'Portfolio' },
  { id: 4, name: 'Booking', short: 'Booking' },
  { id: 5, name: 'Complete', short: 'Launch' },
];

export function ProgressIndicator({ currentStep }: ProgressIndicatorProps) {
  return (
    <div className="w-full max-w-3xl mx-auto px-4 py-8">
      {/* Step labels (desktop) */}
      <div className="hidden md:flex justify-between mb-4">
        {STEPS.map((step) => (
          <div key={step.id} className="flex-1 text-center">
            <span
              className={`text-sm font-body transition-colors ${
                step.id === currentStep
                  ? 'text-ether font-medium'
                  : step.id < currentStep
                  ? 'text-gray-400'
                  : 'text-gray-600'
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
        <div className="absolute top-1/2 left-0 right-0 h-0.5 -translate-y-1/2 bg-gray-800" />

        {/* Progress fill */}
        <div
          className="absolute top-1/2 left-0 h-0.5 -translate-y-1/2 bg-ether transition-all duration-500"
          style={{
            width: `${((currentStep - 1) / (STEPS.length - 1)) * 100}%`,
          }}
        />

        {/* Step dots */}
        {STEPS.map((step) => {
          const isCompleted = step.id < currentStep;
          const isCurrent = step.id === currentStep;
          const isPending = step.id > currentStep;

          return (
            <div
              key={step.id}
              className="relative z-10 flex flex-col items-center"
            >
              {/* Dot */}
              <div
                className={`w-8 h-8 rounded-full border-2 transition-all duration-300 ${
                  isCurrent
                    ? 'bg-ether border-ether scale-110'
                    : isCompleted
                    ? 'bg-ether border-ether'
                    : 'bg-ink border-gray-800'
                }`}
              >
                {isCompleted && (
                  <svg
                    className="w-full h-full p-1.5 text-ink"
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
                className={`md:hidden mt-2 text-xs font-body transition-colors ${
                  isCurrent
                    ? 'text-ether font-medium'
                    : isCompleted
                    ? 'text-gray-400'
                    : 'text-gray-600'
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
