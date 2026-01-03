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
    <div className="bg-paper border-2 border-ink/10 p-4">
      <div className="flex items-center gap-2 mb-4">
        <MapPin className="w-4 h-4 text-gray-500" />
        <div>
          <h3 className="font-heading text-sm font-semibold text-ink">Artists by City</h3>
          <p className="font-mono text-[10px] text-gray-500">{total.toLocaleString()} total from mining</p>
        </div>
      </div>

      {topCities.length === 0 ? (
        <p className="text-gray-500 text-sm font-body">No city data available</p>
      ) : (
        <div className="space-y-2">
          {topCities.map((city, index) => {
            const percentage = maxCount > 0 ? (city.count / maxCount) * 100 : 0;

            return (
              <div key={city.city} className="flex items-center gap-3">
                <div className="w-5 text-xs text-gray-500 font-mono tabular-nums text-right">
                  {index + 1}
                </div>
                <div className="w-28 shrink-0">
                  <span className="text-sm font-body text-ink truncate block">
                    {city.city}
                  </span>
                </div>
                <div className="flex-1 h-2 bg-gray-100 overflow-hidden">
                  <div
                    className="h-full bg-ink transition-all duration-500"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <div className="w-14 text-right">
                  <span className="text-sm font-mono text-gray-700 tabular-nums">
                    {city.count.toLocaleString()}
                  </span>
                </div>
              </div>
            );
          })}

          {othersCount > 0 && cities.length > 10 && (
            <div className="flex items-center gap-3 pt-2 border-t border-ink/10">
              <div className="w-5" />
              <div className="w-28 shrink-0">
                <span className="text-sm text-gray-500 font-body">+{cities.length - 10} more</span>
              </div>
              <div className="flex-1" />
              <div className="w-14 text-right">
                <span className="text-sm text-gray-500 font-mono tabular-nums">
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
