'use client';

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
    <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-white">Artists by City</h3>
        <span className="text-sm text-neutral-500">
          {total.toLocaleString()} total from mining
        </span>
      </div>

      {topCities.length === 0 ? (
        <p className="text-neutral-500 text-sm">No city data available</p>
      ) : (
        <div className="space-y-3">
          {topCities.map((city) => {
            const percentage = maxCount > 0 ? (city.count / maxCount) * 100 : 0;

            return (
              <div key={city.city} className="flex items-center gap-4">
                <div className="w-32 shrink-0">
                  <span className="text-sm text-neutral-300 truncate block">
                    {city.city}
                  </span>
                </div>
                <div className="flex-1 h-5 bg-neutral-800 rounded-sm overflow-hidden">
                  <div
                    className="h-full bg-amber-500/60 transition-all duration-500"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <div className="w-16 text-right">
                  <span className="text-sm text-white tabular-nums font-medium">
                    {city.count.toLocaleString()}
                  </span>
                </div>
              </div>
            );
          })}

          {othersCount > 0 && cities.length > 10 && (
            <div className="flex items-center gap-4 pt-2 border-t border-neutral-800">
              <div className="w-32 shrink-0">
                <span className="text-sm text-neutral-500">
                  +{cities.length - 10} more
                </span>
              </div>
              <div className="flex-1" />
              <div className="w-16 text-right">
                <span className="text-sm text-neutral-400 tabular-nums">
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
