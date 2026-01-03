'use client';

/**
 * Location Picker Component
 *
 * Used in onboarding for artists to select their location(s).
 * Behavior differs based on tier and country:
 * - Free tier US: City OR State (radio toggle)
 * - Free tier International: City + Country required
 * - Pro tier: Multiple locations with free-text city input
 */

import { useState, useEffect } from 'react';
import { Plus, X, MapPin, Globe } from 'lucide-react';
import Select from '@/components/ui/Select';
import CitySelect from '@/components/ui/CitySelect';
import { US_STATE_OPTIONS } from '@/lib/constants/states';
import { COUNTRY_OPTIONS, getCountryName } from '@/lib/constants/countries';

export interface Location {
  city: string | null;
  region: string | null;
  countryCode: string;
  locationType: 'city' | 'region' | 'country';
  isPrimary: boolean;
}

interface LocationPickerProps {
  isPro: boolean;
  locations: Location[];
  onChange: (locations: Location[]) => void;
  error?: string;
}

const MAX_FREE_LOCATIONS = 1;
const MAX_PRO_LOCATIONS = 20;

export default function LocationPicker({
  isPro,
  locations,
  onChange,
  error,
}: LocationPickerProps) {
  const maxLocations = isPro ? MAX_PRO_LOCATIONS : MAX_FREE_LOCATIONS;

  // For free tier single location editing
  const [locationType, setLocationType] = useState<'city' | 'region'>('city');
  const [selectedCountry, setSelectedCountry] = useState<string>('US');
  const [selectedState, setSelectedState] = useState<string | null>(null);
  const [cityInput, setCityInput] = useState<string>('');
  const [regionInput, setRegionInput] = useState<string>('');

  // For Pro tier adding new locations
  const [isAdding, setIsAdding] = useState(false);
  const [newCountry, setNewCountry] = useState<string>('US');
  const [newCity, setNewCity] = useState<string>('');
  const [newRegion, setNewRegion] = useState<string>('');

  // Initialize from existing locations
  useEffect(() => {
    if (locations.length > 0 && !isPro) {
      const loc = locations[0];
      setSelectedCountry(loc.countryCode);
      setLocationType(loc.locationType === 'region' ? 'region' : 'city');
      setCityInput(loc.city || '');
      setRegionInput(loc.region || '');
      setSelectedState(loc.region);
    }
  }, []);

  // Update parent when free tier location changes
  useEffect(() => {
    if (!isPro) {
      const newLocation: Location = {
        countryCode: selectedCountry,
        city: locationType === 'city' ? cityInput || null : null,
        region: selectedCountry === 'US'
          ? selectedState
          : (regionInput || null),
        locationType: locationType,
        isPrimary: true,
      };

      // Only update if we have valid data
      if (
        (locationType === 'city' && cityInput) ||
        (locationType === 'region' && selectedState) ||
        (selectedCountry !== 'US' && cityInput)
      ) {
        onChange([newLocation]);
      }
    }
  }, [isPro, locationType, selectedCountry, selectedState, cityInput, regionInput]);

  const handleAddLocation = () => {
    if (!newCity.trim() && newCountry === 'US' && !newRegion.trim()) return;
    if (!newCity.trim() && newCountry !== 'US') return;

    const newLocation: Location = {
      countryCode: newCountry,
      city: newCity.trim() || null,
      region: newCountry === 'US' ? newRegion || null : (newRegion.trim() || null),
      locationType: newCity.trim() ? 'city' : 'region',
      isPrimary: locations.length === 0,
    };

    onChange([...locations, newLocation]);
    setNewCity('');
    setNewRegion('');
    setIsAdding(false);
  };

  const handleRemoveLocation = (index: number) => {
    const newLocations = locations.filter((_, i) => i !== index);
    // Ensure there's always a primary if locations exist
    if (newLocations.length > 0 && !newLocations.some((l) => l.isPrimary)) {
      newLocations[0].isPrimary = true;
    }
    onChange(newLocations);
  };

  const handleSetPrimary = (index: number) => {
    const newLocations = locations.map((loc, i) => ({
      ...loc,
      isPrimary: i === index,
    }));
    onChange(newLocations);
  };

  const formatLocation = (loc: Location): string => {
    const parts: string[] = [];
    if (loc.city) parts.push(loc.city);
    if (loc.region) parts.push(loc.region);
    if (loc.countryCode !== 'US') {
      parts.push(getCountryName(loc.countryCode) || loc.countryCode);
    }
    return parts.join(', ') || 'Unknown location';
  };

  // ===== FREE TIER UI =====
  if (!isPro) {
    return (
      <div className="space-y-3">
        <label className="block font-mono text-xs tracking-widest uppercase text-gray-700 mb-2">
          Where are you based? <span className="text-[var(--error)]">*</span>
        </label>

        {/* Country Selector */}
        <div>
          <label className="block font-mono text-[10px] tracking-wider uppercase text-[var(--gray-500)] mb-2">
            Country
          </label>
          <Select
            value={selectedCountry}
            onChange={(val) => {
              setSelectedCountry(val || 'US');
              setSelectedState(null);
              setCityInput('');
              setRegionInput('');
            }}
            options={COUNTRY_OPTIONS}
            placeholder="Select country"
            searchable
            searchPlaceholder="Search countries..."
          />
        </div>

        {/* US-specific: City OR State toggle */}
        {selectedCountry === 'US' && (
          <>
            <div className="flex gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="locationType"
                  checked={locationType === 'city'}
                  onChange={() => setLocationType('city')}
                  className="w-3.5 h-3.5 text-[var(--ink-black)] border-2 border-[var(--gray-400)] focus:ring-[var(--ink-black)]"
                />
                <span className="font-body text-[var(--text-primary)]">Specific city</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="locationType"
                  checked={locationType === 'region'}
                  onChange={() => setLocationType('region')}
                  className="w-3.5 h-3.5 text-[var(--ink-black)] border-2 border-[var(--gray-400)] focus:ring-[var(--ink-black)]"
                />
                <span className="font-body text-[var(--text-primary)]">State-wide</span>
              </label>
            </div>

            {locationType === 'city' ? (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-mono text-[10px] tracking-wider uppercase text-[var(--gray-500)] mb-2">
                    City
                  </label>
                  <CitySelect
                    value={cityInput}
                    onChange={setCityInput}
                    onStateAutoFill={(state) => setSelectedState(state)}
                    countryCode="US"
                    placeholder="Select city"
                  />
                </div>
                <div>
                  <label className="block font-mono text-[10px] tracking-wider uppercase text-[var(--gray-500)] mb-2">
                    State
                  </label>
                  <Select
                    value={selectedState}
                    onChange={(val) => setSelectedState(val)}
                    options={US_STATE_OPTIONS}
                    placeholder="Select state"
                    searchable
                    searchPlaceholder="Search states..."
                  />
                </div>
              </div>
            ) : (
              <div>
                <label className="block font-mono text-[10px] tracking-wider uppercase text-[var(--gray-500)] mb-2">
                  State
                </label>
                <Select
                  value={selectedState}
                  onChange={(val) => setSelectedState(val)}
                  options={US_STATE_OPTIONS}
                  placeholder="Select state"
                  searchable
                  searchPlaceholder="Search states..."
                />
                <p className="mt-1 font-body text-sm text-[var(--gray-500)] italic">
                  You'll appear in searches for this entire state
                </p>
              </div>
            )}
          </>
        )}

        {/* International: City + Region (optional) */}
        {selectedCountry !== 'US' && (
          <div className="space-y-3">
            <div>
              <label className="block font-mono text-[10px] tracking-wider uppercase text-[var(--gray-500)] mb-2">
                City <span className="text-[var(--error)]">*</span>
              </label>
              <input
                type="text"
                value={cityInput}
                onChange={(e) => setCityInput(e.target.value)}
                className="input"
                placeholder="London"
              />
            </div>
            <div>
              <label className="block font-mono text-[10px] tracking-wider uppercase text-[var(--gray-500)] mb-2">
                Region / Province
                <span className="ml-2 font-normal text-[var(--gray-400)] normal-case tracking-normal">(Optional)</span>
              </label>
              <input
                type="text"
                value={regionInput}
                onChange={(e) => setRegionInput(e.target.value)}
                className="input"
                placeholder="England"
              />
            </div>
          </div>
        )}

        {error && (
          <p className="text-[var(--error)] text-sm font-body">{error}</p>
        )}
      </div>
    );
  }

  // ===== PRO TIER UI =====
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="block font-mono text-[11px] font-medium tracking-[0.15em] uppercase text-[var(--gray-700)]">
          <Globe className="inline w-4 h-4 mr-1 -mt-0.5" />
          Locations ({locations.length}/{maxLocations})
        </label>
        {locations.length < maxLocations && !isAdding && (
          <button
            type="button"
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-[var(--ink-black)] hover:text-[var(--gray-700)] transition-colors"
          >
            <Plus className="w-3 h-3" /> Add location
          </button>
        )}
      </div>

      {/* Existing locations list */}
      {locations.length > 0 && (
        <div className="space-y-2">
          {locations.map((loc, index) => (
            <div
              key={index}
              className={`flex items-center justify-between p-3 border-2 ${
                loc.isPrimary
                  ? 'border-[var(--ink-black)] bg-[var(--gray-50)]'
                  : 'border-[var(--border-subtle)]'
              }`}
            >
              <div className="flex items-center gap-3">
                <MapPin className={`w-4 h-4 ${loc.isPrimary ? 'text-[var(--ink-black)]' : 'text-[var(--gray-400)]'}`} />
                <span className="font-body text-[var(--text-primary)]">
                  {formatLocation(loc)}
                </span>
                {loc.isPrimary && (
                  <span className="font-mono text-[9px] uppercase tracking-wider bg-[var(--ink-black)] text-[var(--paper-white)] px-2 py-0.5">
                    Primary
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {!loc.isPrimary && (
                  <button
                    type="button"
                    onClick={() => handleSetPrimary(index)}
                    className="font-mono text-[9px] uppercase tracking-wider text-[var(--gray-500)] hover:text-[var(--ink-black)] transition-colors"
                  >
                    Set primary
                  </button>
                )}
                {locations.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveLocation(index)}
                    className="p-1 text-[var(--gray-400)] hover:text-[var(--error)] transition-colors"
                    aria-label="Remove location"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add new location form */}
      {isAdding && (
        <div className="border-2 border-dashed border-[var(--gray-300)] p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--gray-500)]">
              Add new location
            </span>
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="text-[var(--gray-400)] hover:text-[var(--gray-600)]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div>
            <label className="block font-mono text-[10px] tracking-wider uppercase text-[var(--gray-500)] mb-2">
              Country
            </label>
            <Select
              value={newCountry}
              onChange={(val) => {
                setNewCountry(val || 'US');
                setNewRegion('');
              }}
              options={COUNTRY_OPTIONS}
              placeholder="Select country"
              searchable
              searchPlaceholder="Search countries..."
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-mono text-[10px] tracking-wider uppercase text-[var(--gray-500)] mb-2">
                City
              </label>
              <input
                type="text"
                value={newCity}
                onChange={(e) => setNewCity(e.target.value)}
                className="input"
                placeholder="Enter city"
              />
            </div>
            <div>
              <label className="block font-mono text-[10px] tracking-wider uppercase text-[var(--gray-500)] mb-2">
                {newCountry === 'US' ? 'State' : 'Region'}
              </label>
              {newCountry === 'US' ? (
                <Select
                  value={newRegion}
                  onChange={(val) => setNewRegion(val || '')}
                  options={US_STATE_OPTIONS}
                  placeholder="Select state"
                  searchable
                  searchPlaceholder="Search states..."
                />
              ) : (
                <input
                  type="text"
                  value={newRegion}
                  onChange={(e) => setNewRegion(e.target.value)}
                  className="input"
                  placeholder="Province / Region"
                />
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={handleAddLocation}
            disabled={!newCity.trim() && newCountry !== 'US'}
            className="w-full py-2 bg-[var(--ink-black)] text-[var(--paper-white)] font-mono text-[11px] uppercase tracking-wider hover:bg-[var(--gray-800)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Add Location
          </button>
        </div>
      )}

      {/* Empty state */}
      {locations.length === 0 && !isAdding && (
        <button
          type="button"
          onClick={() => setIsAdding(true)}
          className="w-full p-6 border-2 border-dashed border-[var(--gray-300)] text-center hover:border-[var(--gray-400)] transition-colors"
        >
          <MapPin className="w-6 h-6 mx-auto mb-2 text-[var(--gray-400)]" />
          <span className="font-mono text-[11px] uppercase tracking-wider text-[var(--gray-500)]">
            Add your first location
          </span>
        </button>
      )}

      {error && (
        <p className="text-[var(--error)] text-sm font-body">{error}</p>
      )}
    </div>
  );
}
