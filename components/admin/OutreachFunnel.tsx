'use client';

import { ArrowRight } from 'lucide-react';

interface FunnelData {
  pending: number;
  generated: number;
  posted: number;
  dm_sent: number;
  responded: number;
  claimed: number;
  converted: number;
  skipped: number;
}

interface OutreachFunnelProps {
  funnel: FunnelData;
}

export default function OutreachFunnel({ funnel }: OutreachFunnelProps) {
  // Main funnel steps (skipped is excluded from visualization)
  const steps = [
    { label: 'Pending', value: funnel.pending, color: '#8B8985' },
    { label: 'Posted', value: funnel.posted, color: '#6B6965' },
    { label: 'DM Sent', value: funnel.dm_sent, color: '#4A4845' },
    { label: 'Responded', value: funnel.responded, color: '#2A2826' },
    { label: 'Claimed', value: funnel.claimed, color: '#10b981' },
    { label: 'Converted', value: funnel.converted, color: '#059669' },
  ];

  const maxValue = Math.max(...steps.map((s) => s.value), 1);

  return (
    <div className="bg-paper border border-ink/10 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-heading text-[13px] font-semibold text-ink">
          Outreach Funnel
        </h3>
        {funnel.skipped > 0 && (
          <span className="text-[11px] font-mono text-gray-400">
            {funnel.skipped} skipped
          </span>
        )}
      </div>

      <div className="flex items-center gap-1">
        {steps.map((step, index) => {
          const widthPercent = Math.max((step.value / maxValue) * 100, 15);

          return (
            <div key={step.label} className="flex items-center">
              <div className="flex flex-col items-center min-w-[60px]">
                <div
                  className="w-full h-8 flex items-center justify-center text-white text-[11px] font-mono"
                  style={{
                    backgroundColor: step.color,
                    width: `${widthPercent}%`,
                    minWidth: '60px',
                  }}
                >
                  {step.value}
                </div>
                <span className="text-[10px] text-gray-500 mt-1 font-body">
                  {step.label}
                </span>
              </div>

              {index < steps.length - 1 && (
                <ArrowRight className="w-3 h-3 text-gray-400 mx-0.5 flex-shrink-0" />
              )}
            </div>
          );
        })}
      </div>

      {/* Conversion rates */}
      <div className="flex gap-4 mt-3 text-[11px] font-mono text-gray-500">
        <span>
          DM → Claim:{' '}
          {funnel.dm_sent + funnel.responded > 0
            ? `${(((funnel.claimed + funnel.converted) / (funnel.dm_sent + funnel.responded + funnel.claimed + funnel.converted)) * 100).toFixed(0)}%`
            : '—'}
        </span>
        <span>
          Claim → Convert:{' '}
          {funnel.claimed + funnel.converted > 0
            ? `${((funnel.converted / (funnel.claimed + funnel.converted)) * 100).toFixed(0)}%`
            : '—'}
        </span>
      </div>
    </div>
  );
}
