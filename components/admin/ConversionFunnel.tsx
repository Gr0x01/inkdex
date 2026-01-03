interface FunnelStep {
  label: string;
  value: number;
  color: string;
}

interface ConversionFunnelProps {
  steps: FunnelStep[];
}

export default function ConversionFunnel({ steps }: ConversionFunnelProps) {
  const maxValue = Math.max(...steps.map((s) => s.value));

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-6">
      <h3 className="text-lg font-semibold text-white mb-6">Conversion Funnel</h3>

      <div className="space-y-4">
        {steps.map((step, index) => {
          const percentage = maxValue > 0 ? (step.value / maxValue) * 100 : 0;
          const conversionRate =
            index > 0 && steps[index - 1].value > 0
              ? ((step.value / steps[index - 1].value) * 100).toFixed(1)
              : null;

          return (
            <div key={step.label}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-neutral-400">{step.label}</span>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-white tabular-nums">
                    {step.value.toLocaleString()}
                  </span>
                  {conversionRate && (
                    <span className="text-xs text-neutral-500 tabular-nums">
                      ({conversionRate}%)
                    </span>
                  )}
                </div>
              </div>
              <div className="h-6 bg-neutral-800 rounded-sm overflow-hidden">
                <div
                  className="h-full transition-all duration-500"
                  style={{
                    width: `${percentage}%`,
                    backgroundColor: step.color,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Overall conversion rate */}
      {steps.length >= 2 && steps[0].value > 0 && (
        <div className="mt-6 pt-4 border-t border-neutral-800">
          <div className="flex justify-between items-center">
            <span className="text-sm text-neutral-500">Overall Conversion</span>
            <span className="text-sm font-medium text-amber-500">
              {((steps[steps.length - 1].value / steps[0].value) * 100).toFixed(2)}%
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
