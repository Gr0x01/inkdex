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
    <div className="bg-paper border border-ink/10 p-3">
      <div className="flex items-center gap-1.5 mb-3">
        <MapPin className="w-3.5 h-3.5 text-gray-500" />
        <div>
          <h3 className="font-heading text-[13px] font-semibold text-ink">Artists by City</h3>
          <p className="font-mono text-[9px] text-gray-400">{total.toLocaleString()} total from mining</p>
        </div>
      </div>

      {topCities.length === 0 ? (
        <p className="text-gray-500 text-[12px] font-body">No city data available</p>
      ) : (
        <div className="space-y-1.5">
          {topCities.map((city, index) => {
            const percentage = maxCount > 0 ? (city.count / maxCount) * 100 : 0;

            return (
              <div key={city.city} className="flex items-center gap-2">
                <div className="w-4 text-[11px] text-gray-400 font-mono tabular-nums text-right">
                  {index + 1}
                </div>
                <div className="w-24 shrink-0">
                  <span className="text-[12px] font-body text-ink truncate block">
                    {city.city}
                  </span>
                </div>
                <div className="flex-1 h-1.5 bg-gray-100 overflow-hidden">
                  <div
                    className="h-full bg-ink transition-all duration-500"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <div className="w-12 text-right">
                  <span className="text-[12px] font-mono text-ink tabular-nums">
                    {city.count.toLocaleString()}
                  </span>
                </div>
              </div>
            );
          })}

          {othersCount > 0 && cities.length > 10 && (
            <div className="flex items-center gap-2 pt-1.5 border-t border-ink/10">
              <div className="w-4" />
              <div className="w-24 shrink-0">
                <span className="text-[12px] text-gray-400 font-body">+{cities.length - 10} more</span>
              </div>
              <div className="flex-1" />
              <div className="w-12 text-right">
                <span className="text-[12px] text-gray-400 font-mono tabular-nums">
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
