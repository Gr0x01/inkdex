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
  const variantStyles = {
    default: 'bg-neutral-900 border-neutral-800',
    success: 'bg-green-500/5 border-green-500/20',
    warning: 'bg-amber-500/5 border-amber-500/20',
    error: 'bg-red-500/5 border-red-500/20',
  };

  const trendColor = trend?.startsWith('+')
    ? 'text-green-500'
    : trend?.startsWith('-')
    ? 'text-red-500'
    : 'text-neutral-500';

  return (
    <div className={`rounded-lg border p-5 ${variantStyles[variant]}`}>
      <p className="text-xs uppercase tracking-wider text-neutral-500 mb-2">
        {label}
      </p>
      <div className="flex items-baseline gap-2">
        <p className="text-2xl font-bold text-white tabular-nums">
          {typeof value === 'number' ? value.toLocaleString() : value}
        </p>
        {trend && <span className={`text-sm font-medium ${trendColor}`}>{trend}</span>}
      </div>
      {subValue && (
        <p className="text-sm text-neutral-500 mt-1">{subValue}</p>
      )}
    </div>
  );
}
