'use client';

/**
 * CitySelect Component
 *
 * Smart city selector that auto-fills state for US cities
 * - US: Async searchable dropdown fetching from database
 * - International: Plain text input
 * - Auto-fills state when known US city is selected
 */

import { useState, useEffect, useRef } from 'react';
import Select from './Select';

interface CityResult {
  city: string;
  state: string | null;
  stateName: string | null;
  label: string;
}

interface CitySelectProps {
  value: string;
  onChange: (city: string) => void;
  onStateAutoFill?: (stateCode: string) => void;
  countryCode: string;
  className?: string;
  placeholder?: string;
}

export default function CitySelect({
  value,
  onChange,
  onStateAutoFill,
  countryCode,
  className = '',
  placeholder = 'Select city...'
}: CitySelectProps) {
  const [cities, setCities] = useState<CityResult[]>([]);
  const [loading, setLoading] = useState(false);
  const isUS = countryCode === 'US';
  const cityMapRef = useRef<Map<string, string>>(new Map()); // city -> state mapping

  // Fetch cities from API
  useEffect(() => {
    if (!isUS) {
      setCities([]);
      return;
    }

    let cancelled = false;

    async function fetchCities() {
      setLoading(true);
      try {
        const response = await fetch(`/api/locations/cities?country=${countryCode}&limit=200`);
        if (!response.ok) throw new Error('Failed to fetch cities');

        const data = await response.json();

        if (!cancelled && data.cities) {
          setCities(data.cities);

          // Build city -> state map for auto-fill
          const newMap = new Map<string, string>();
          data.cities.forEach((city: CityResult) => {
            if (city.state) {
              newMap.set(city.city.toLowerCase(), city.state);
            }
          });
          cityMapRef.current = newMap;
        }
      } catch (error) {
        console.error('[CitySelect] Failed to fetch cities:', error);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchCities();

    return () => {
      cancelled = true;
    };
  }, [countryCode, isUS]);

  // Handle city selection
  const handleCityChange = (selectedCity: string | null) => {
    if (!selectedCity) {
      onChange('');
      return;
    }

    onChange(selectedCity);

    // Auto-fill state for US cities
    if (isUS && onStateAutoFill) {
      const stateCode = cityMapRef.current.get(selectedCity.toLowerCase());
      if (stateCode) {
        onStateAutoFill(stateCode);
      }
    }
  };

  // US: Use Select dropdown with API data
  if (isUS) {
    const options = cities.map(city => ({
      value: city.city,
      label: city.label
    }));

    return (
      <Select
        value={value}
        onChange={handleCityChange}
        options={options}
        placeholder={loading ? 'Loading cities...' : placeholder}
        searchable
        searchPlaceholder="Search cities..."
        className={className}
      />
    );
  }

  // International: Plain text input
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`input ${className}`}
      placeholder={placeholder}
    />
  );
}
