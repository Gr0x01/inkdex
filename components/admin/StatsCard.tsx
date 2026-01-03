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
  accentColor?: string;
}

export default function StatsCard({
  label,
  value,
  subValue,
  trend,
  variant = 'default',
  accentColor,
}: StatsCardProps) {
  const variantConfig = {
    default: {
      accent: accentColor || 'bg-gray-500',
      text: 'text-gray-900',
    },
    success: {
      accent: 'bg-emerald-500',
      text: 'text-emerald-600',
    },
    warning: {
      accent: 'bg-amber-500',
      text: 'text-amber-600',
    },
    error: {
      accent: 'bg-red-500',
      text: 'text-red-600',
    },
  };

  const config = variantConfig[variant];

  const trendColor =
    trend?.direction === 'up'
      ? 'text-emerald-600 bg-emerald-50'
      : trend?.direction === 'down'
      ? 'text-red-600 bg-red-50'
      : 'text-gray-600 bg-gray-50';

  const TrendIcon = trend?.direction === 'up' ? TrendingUp : TrendingDown;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow">
      {/* Accent bar */}
      <div className={`w-12 h-1 rounded-full ${config.accent} mb-4`} />

      <p className="text-sm text-gray-500 font-medium mb-1">{label}</p>

      <div className="flex items-end justify-between">
        <div>
          <p className={`text-3xl font-semibold ${config.text} tabular-nums font-[family-name:var(--font-space-grotesk)]`}>
            {typeof value === 'number' ? value.toLocaleString() : value}
          </p>
          {subValue && (
            <p className="text-sm text-gray-400 mt-1">{subValue}</p>
          )}
        </div>

        {trend && (
          <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium ${trendColor}`}>
            <TrendIcon className="w-3.5 h-3.5" />
            {trend.value}
          </div>
        )}
      </div>
    </div>
  );
}
