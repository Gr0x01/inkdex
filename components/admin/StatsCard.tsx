import { TrendingUp, TrendingDown } from 'lucide-react';

interface StatsCardProps {
  label: string;
  value: string | number;
  subValue?: string;
  trend?: {
    value: string;
    direction: 'up' | 'down' | 'neutral';
  };
  variant?: 'default' | 'success' | 'warning' | 'error';
  compact?: boolean;
}

export default function StatsCard({
  label,
  value,
  subValue,
  trend,
  variant = 'default',
  compact = false,
}: StatsCardProps) {
  const trendColor =
    trend?.direction === 'up'
      ? 'text-status-success'
      : trend?.direction === 'down'
      ? 'text-status-error'
      : 'text-gray-500';

  const TrendIcon = trend?.direction === 'up' ? TrendingUp : TrendingDown;

  const variantBorder = {
    default: 'border-ink/10',
    success: 'border-status-success/30',
    warning: 'border-status-warning/30',
    error: 'border-status-error/30',
  };

  return (
    <div className={`bg-paper ${compact ? 'border p-2.5' : 'border-2 p-4'} ${variantBorder[variant]} ${compact ? '' : 'hover:-translate-y-0.5'} transition-transform duration-150`}>
      <p className={`font-mono text-gray-500 uppercase tracking-wider ${compact ? 'text-[9px] mb-0.5' : 'text-[10px] tracking-[0.15em] mb-1'}`}>{label}</p>

      <div className="flex items-end justify-between">
        <div>
          <p className={`font-heading font-bold text-ink tabular-nums ${compact ? 'text-lg' : 'text-2xl'}`}>
            {typeof value === 'number' ? value.toLocaleString() : value}
          </p>
          {subValue && (
            <p className={`text-gray-500 font-body ${compact ? 'text-[11px]' : 'text-sm mt-0.5'}`}>{subValue}</p>
          )}
        </div>

        {trend && (
          <div className={`flex items-center gap-1 text-xs font-mono ${trendColor}`}>
            <TrendIcon className="w-3 h-3" />
            {trend.value}
          </div>
        )}
      </div>
    </div>
  );
}
