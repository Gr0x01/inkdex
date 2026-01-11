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
    <div className="bg-paper border border-ink/10 p-3">
      <h3 className="font-heading text-[13px] font-semibold text-ink mb-3">Conversion Funnel</h3>

      <div className="space-y-2">
        {steps.map((step, index) => {
          const percentage = maxValue > 0 ? (step.value / maxValue) * 100 : 0;
          const conversionRate =
            index > 0 && steps[index - 1].value > 0
              ? ((step.value / steps[index - 1].value) * 100).toFixed(1)
              : null;

          return (
            <div key={step.label}>
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-[12px] text-gray-600 font-body">{step.label}</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-[13px] font-heading font-semibold text-ink tabular-nums">
                    {step.value.toLocaleString()}
                  </span>
                  {conversionRate && (
                    <span className="font-mono text-[9px] text-gray-400 tabular-nums">
                      {conversionRate}%
                    </span>
                  )}
                </div>
              </div>
              <div className="h-1.5 bg-gray-100 overflow-hidden">
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
        <div className="mt-3 pt-2 border-t border-ink/10">
          <div className="flex justify-between items-center">
            <span className="text-[12px] text-gray-500 font-body">Overall Conversion</span>
            <span className="text-[13px] font-heading font-bold text-status-success">
              {((steps[steps.length - 1].value / steps[0].value) * 100).toFixed(2)}%
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
