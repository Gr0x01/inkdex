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

// Fallback mock data for Storybook and offline development
const MOCK_US_CITIES: CityResult[] = [
  { city: 'New York', state: 'NY', stateName: 'New York', label: 'New York, NY' },
  { city: 'Los Angeles', state: 'CA', stateName: 'California', label: 'Los Angeles, CA' },
  { city: 'Chicago', state: 'IL', stateName: 'Illinois', label: 'Chicago, IL' },
  { city: 'Houston', state: 'TX', stateName: 'Texas', label: 'Houston, TX' },
  { city: 'Phoenix', state: 'AZ', stateName: 'Arizona', label: 'Phoenix, AZ' },
  { city: 'Philadelphia', state: 'PA', stateName: 'Pennsylvania', label: 'Philadelphia, PA' },
  { city: 'San Antonio', state: 'TX', stateName: 'Texas', label: 'San Antonio, TX' },
  { city: 'San Diego', state: 'CA', stateName: 'California', label: 'San Diego, CA' },
  { city: 'Dallas', state: 'TX', stateName: 'Texas', label: 'Dallas, TX' },
  { city: 'Austin', state: 'TX', stateName: 'Texas', label: 'Austin, TX' },
  { city: 'San Jose', state: 'CA', stateName: 'California', label: 'San Jose, CA' },
  { city: 'San Francisco', state: 'CA', stateName: 'California', label: 'San Francisco, CA' },
  { city: 'Seattle', state: 'WA', stateName: 'Washington', label: 'Seattle, WA' },
  { city: 'Denver', state: 'CO', stateName: 'Colorado', label: 'Denver, CO' },
  { city: 'Boston', state: 'MA', stateName: 'Massachusetts', label: 'Boston, MA' },
  { city: 'Nashville', state: 'TN', stateName: 'Tennessee', label: 'Nashville, TN' },
  { city: 'Portland', state: 'OR', stateName: 'Oregon', label: 'Portland, OR' },
  { city: 'Las Vegas', state: 'NV', stateName: 'Nevada', label: 'Las Vegas, NV' },
  { city: 'Miami', state: 'FL', stateName: 'Florida', label: 'Miami, FL' },
  { city: 'Atlanta', state: 'GA', stateName: 'Georgia', label: 'Atlanta, GA' },
  { city: 'Minneapolis', state: 'MN', stateName: 'Minnesota', label: 'Minneapolis, MN' },
  { city: 'Detroit', state: 'MI', stateName: 'Michigan', label: 'Detroit, MI' },
  { city: 'Brooklyn', state: 'NY', stateName: 'New York', label: 'Brooklyn, NY' },
  { city: 'Oakland', state: 'CA', stateName: 'California', label: 'Oakland, CA' },
  { city: 'Tampa', state: 'FL', stateName: 'Florida', label: 'Tampa, FL' },
];

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

  // Fetch cities from API (falls back to mock data for Storybook/offline)
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
        console.error('[CitySelect] Failed to fetch cities, using mock data:', error);
        // Fall back to mock data (for Storybook and offline development)
        if (!cancelled) {
          setCities(MOCK_US_CITIES);
          const newMap = new Map<string, string>();
          MOCK_US_CITIES.forEach((city) => {
            if (city.state) {
              newMap.set(city.city.toLowerCase(), city.state);
            }
          });
          cityMapRef.current = newMap;
        }
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
