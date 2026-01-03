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
    <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center">
            <MapPin className="w-5 h-5 text-violet-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Artists by City</h3>
            <p className="text-sm text-gray-500">{total.toLocaleString()} total from mining</p>
          </div>
        </div>
      </div>

      {topCities.length === 0 ? (
        <p className="text-gray-500 text-sm">No city data available</p>
      ) : (
        <div className="space-y-3">
          {topCities.map((city, index) => {
            const percentage = maxCount > 0 ? (city.count / maxCount) * 100 : 0;

            return (
              <div key={city.city} className="flex items-center gap-4">
                <div className="w-6 text-sm text-gray-400 tabular-nums text-right">
                  {index + 1}
                </div>
                <div className="w-32 shrink-0">
                  <span className="text-sm font-medium text-gray-900 truncate block">
                    {city.city}
                  </span>
                </div>
                <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-violet-500 rounded-full transition-all duration-500"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <div className="w-16 text-right">
                  <span className="text-sm font-medium text-gray-700 tabular-nums">
                    {city.count.toLocaleString()}
                  </span>
                </div>
              </div>
            );
          })}

          {othersCount > 0 && cities.length > 10 && (
            <div className="flex items-center gap-4 pt-3 border-t border-gray-100">
              <div className="w-6" />
              <div className="w-32 shrink-0">
                <span className="text-sm text-gray-500">+{cities.length - 10} more</span>
              </div>
              <div className="flex-1" />
              <div className="w-16 text-right">
                <span className="text-sm text-gray-500 tabular-nums">
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
