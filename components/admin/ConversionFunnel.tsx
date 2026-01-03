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
    <div className="bg-neutral-900/30 border border-neutral-800/50 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-1.5 h-1.5 rounded-full bg-violet-500" />
        <h3 className="text-xs font-mono uppercase tracking-wider text-violet-400">
          Conversion Funnel
        </h3>
      </div>

      <div className="space-y-2.5">
        {steps.map((step, index) => {
          const percentage = maxValue > 0 ? (step.value / maxValue) * 100 : 0;
          const conversionRate =
            index > 0 && steps[index - 1].value > 0
              ? ((step.value / steps[index - 1].value) * 100).toFixed(1)
              : null;

          return (
            <div key={step.label}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] text-neutral-500">{step.label}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-white tabular-nums">
                    {step.value.toLocaleString()}
                  </span>
                  {conversionRate && (
                    <span className="text-[10px] text-neutral-600 tabular-nums font-mono">
                      {conversionRate}%
                    </span>
                  )}
                </div>
              </div>
              <div className="h-4 bg-neutral-800/50 rounded-sm overflow-hidden">
                <div
                  className="h-full transition-all duration-500"
                  style={{
                    width: `${percentage}%`,
                    backgroundColor: step.color,
                    opacity: 0.7,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Overall conversion rate */}
      {steps.length >= 2 && steps[0].value > 0 && (
        <div className="mt-4 pt-3 border-t border-neutral-800/50">
          <div className="flex justify-between items-center">
            <span className="text-[10px] text-neutral-600 uppercase tracking-wider font-mono">
              Overall Conversion
            </span>
            <span className="text-xs font-mono text-emerald-500">
              {((steps[steps.length - 1].value / steps[0].value) * 100).toFixed(2)}%
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
