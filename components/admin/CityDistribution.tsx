'use client';

import { MapPin } from 'lucide-react';

interface CityData {
  city: string;
  count: number;
}

interface CityDistributionProps {
  cities: CityData[];
  total: number;
}

export default function CityDistribution({ cities, total }: CityDistributionProps) {
  // Show top 10 cities
  const topCities = cities.slice(0, 10);
  const maxCount = topCities.length > 0 ? topCities[0].count : 0;
  const othersCount = total - topCities.reduce((sum, c) => sum + c.count, 0);

  return (
    <div className="bg-neutral-900/30 border border-neutral-800/50 rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-cyan-500" />
          <h3 className="text-xs font-mono uppercase tracking-wider text-cyan-400">
            City Distribution
          </h3>
        </div>
        <span className="text-[10px] text-neutral-600 font-mono">
          {total.toLocaleString()} mined
        </span>
      </div>

      {topCities.length === 0 ? (
        <p className="text-neutral-600 text-xs font-mono">No city data</p>
      ) : (
        <div className="space-y-1.5">
          {topCities.map((city, index) => {
            const percentage = maxCount > 0 ? (city.count / maxCount) * 100 : 0;

            return (
              <div key={city.city} className="flex items-center gap-3">
                <div className="w-3 text-[10px] text-neutral-600 font-mono tabular-nums">
                  {index + 1}
                </div>
                <div className="w-28 shrink-0">
                  <span className="text-xs text-neutral-400 truncate block">
                    {city.city}
                  </span>
                </div>
                <div className="flex-1 h-3 bg-neutral-800/50 rounded-sm overflow-hidden">
                  <div
                    className="h-full bg-cyan-500/40 transition-all duration-500"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <div className="w-12 text-right">
                  <span className="text-xs text-white tabular-nums font-mono">
                    {city.count.toLocaleString()}
                  </span>
                </div>
              </div>
            );
          })}

          {othersCount > 0 && cities.length > 10 && (
            <div className="flex items-center gap-3 pt-2 border-t border-neutral-800/50">
              <div className="w-3" />
              <div className="w-28 shrink-0">
                <span className="text-xs text-neutral-600">
                  +{cities.length - 10} more
                </span>
              </div>
              <div className="flex-1" />
              <div className="w-12 text-right">
                <span className="text-xs text-neutral-500 tabular-nums font-mono">
                  {othersCount.toLocaleString()}
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
