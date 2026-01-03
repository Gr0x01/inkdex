interface StatsCardProps {
  label: string;
  value: string | number;
  subValue?: string;
  trend?: string;
  variant?: 'default' | 'success' | 'warning' | 'error';
}

export default function StatsCard({
  label,
  value,
  subValue,
  trend,
  variant = 'default',
}: StatsCardProps) {
  const variantConfig = {
    default: {
      bg: 'bg-neutral-900/30',
      border: 'border-neutral-800/50',
      dot: 'bg-neutral-600',
      label: 'text-neutral-500',
    },
    success: {
      bg: 'bg-emerald-500/5',
      border: 'border-emerald-500/20',
      dot: 'bg-emerald-500',
      label: 'text-emerald-500/70',
    },
    warning: {
      bg: 'bg-amber-500/5',
      border: 'border-amber-500/20',
      dot: 'bg-amber-500',
      label: 'text-amber-500/70',
    },
    error: {
      bg: 'bg-red-500/5',
      border: 'border-red-500/20',
      dot: 'bg-red-500',
      label: 'text-red-500/70',
    },
  };

  const config = variantConfig[variant];

  const trendColor = trend?.startsWith('+')
    ? 'text-emerald-500'
    : trend?.startsWith('-')
    ? 'text-red-500'
    : 'text-neutral-500';

  return (
    <div className={`rounded-lg border p-4 ${config.bg} ${config.border}`}>
      <div className="flex items-center gap-1.5 mb-2">
        <div className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
        <p className={`text-[10px] uppercase tracking-wider font-mono ${config.label}`}>
          {label}
        </p>
      </div>
      <div className="flex items-baseline gap-2">
        <p className="text-xl font-semibold text-white tabular-nums font-[family-name:var(--font-space-grotesk)]">
          {typeof value === 'number' ? value.toLocaleString() : value}
        </p>
        {trend && (
          <span className={`text-xs font-mono ${trendColor}`}>{trend}</span>
        )}
      </div>
      {subValue && (
        <p className="text-[11px] text-neutral-500 mt-1 font-mono">{subValue}</p>
      )}
    </div>
  );
}
