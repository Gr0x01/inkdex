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
    <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-gray-900 mb-6">Conversion Funnel</h3>

      <div className="space-y-4">
        {steps.map((step, index) => {
          const percentage = maxValue > 0 ? (step.value / maxValue) * 100 : 0;
          const conversionRate =
            index > 0 && steps[index - 1].value > 0
              ? ((step.value / steps[index - 1].value) * 100).toFixed(1)
              : null;

          return (
            <div key={step.label}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">{step.label}</span>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-gray-900 tabular-nums">
                    {step.value.toLocaleString()}
                  </span>
                  {conversionRate && (
                    <span className="text-xs text-gray-400 tabular-nums bg-gray-50 px-2 py-0.5 rounded">
                      {conversionRate}%
                    </span>
                  )}
                </div>
              </div>
              <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
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
        <div className="mt-6 pt-5 border-t border-gray-100">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-500">Overall Conversion</span>
            <span className="text-lg font-semibold text-emerald-600">
              {((steps[steps.length - 1].value / steps[0].value) * 100).toFixed(2)}%
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
