'use client';

/**
 * Location Manager Component - Dashboard
 *
 * Used in the artist dashboard for managing locations.
 * Behavior differs based on tier:
 * - Free tier: Single location with edit modal
 * - Pro tier: Multiple locations with add/remove/reorder
 */

import { useState } from 'react';
import { Plus, X, MapPin, Crown } from 'lucide-react';
import Link from 'next/link';
import Select from '@/components/ui/Select';
import CitySelect from '@/components/ui/CitySelect';
import { US_STATE_OPTIONS, getStateName } from '@/lib/constants/states';
import { COUNTRY_OPTIONS, getCountryName } from '@/lib/constants/countries';
import { ProBadge } from '@/components/badges/ProBadge';

export interface Location {
  id?: string;
  city: string | null;
  region: string | null;
  countryCode: string;
  locationType: 'city' | 'region' | 'country';
  isPrimary: boolean;
  displayOrder?: number;
}

interface LocationManagerProps {
  artistId: string;
  isPro: boolean;
  locations: Location[];
  onChange: (locations: Location[]) => void;
  error?: string;
}

const MAX_FREE_LOCATIONS = 1;
const MAX_PRO_LOCATIONS = 20;

export default function LocationManager({
  artistId: _artistId,
  isPro,
  locations,
  onChange,
  error,
}: LocationManagerProps) {
  const maxLocations = isPro ? MAX_PRO_LOCATIONS : MAX_FREE_LOCATIONS;

  // Add form state
  const [isAdding, setIsAdding] = useState(false);
  const [newCountry, setNewCountry] = useState<string>('US');
  const [newCity, setNewCity] = useState<string>('');
  const [newRegion, setNewRegion] = useState<string>('');
  const [newLocationType, setNewLocationType] = useState<'city' | 'region'>('city');

  const formatLocation = (loc: Location): string => {
    const parts: string[] = [];

    if (loc.city) {
      parts.push(loc.city);
    }

    if (loc.region) {
      if (loc.countryCode === 'US') {
        // For US, show state code or expand to name for region-only
        if (loc.locationType === 'region') {
          const stateName = getStateName(loc.region);
          return stateName ? `${stateName} (statewide)` : `${loc.region} (statewide)`;
        }
        parts.push(loc.region);
      } else {
        parts.push(loc.region);
      }
    }

    if (loc.countryCode !== 'US') {
      const countryName = getCountryName(loc.countryCode);
      parts.push(countryName || loc.countryCode);
    }

    return parts.join(', ') || 'Unknown location';
  };

  // Check if form is valid for adding
  const canAddLocation = (): boolean => {
    if (newCountry === 'US') {
      if (newLocationType === 'city') return !!newCity.trim();
      if (newLocationType === 'region') return !!newRegion;
    }
    // Non-US: country-only, always valid
    return true;
  };

  const handleAddLocation = () => {
    if (!canAddLocation()) return;

    const newLocation: Location = {
      countryCode: newCountry,
      // For non-US, no city/region - just country
      city: newCountry === 'US' && newLocationType === 'city' ? (newCity.trim() || null) : null,
      region: newCountry === 'US' ? (newRegion || null) : null,
      locationType: newCountry === 'US' ? newLocationType : 'country',
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

  // ===== FREE TIER: Inline editable =====
  if (!isPro) {
    return (
      <div className="space-y-3">
        <label className="block font-mono text-[11px] font-medium tracking-[0.15em] uppercase text-(--gray-700)">
          Location <span className="text-(--error)">*</span>
        </label>

        <FreeTierLocationEditor
          location={locations[0] || null}
          onChange={(loc) => onChange(loc ? [loc] : [])}
        />

        {/* Upgrade CTA */}
        <div className="flex items-center gap-2 p-3 border-2 border-dashed border-(--gray-200) bg-(--gray-50)">
          <Crown className="w-3.5 h-3.5 text-amber-500" />
          <span className="font-body text-sm text-(--gray-600)">
            Want to list multiple locations?{' '}
            <Link href="/dashboard/upgrade" className="text-(--ink-black) underline hover:no-underline">
              Upgrade to Pro
            </Link>
          </span>
        </div>

        {error && (
          <p className="text-(--error) text-sm font-body">{error}</p>
        )}
      </div>
    );
  }

  // ===== PRO TIER: Full location management (always editable) =====
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <label className="block font-mono text-[11px] font-medium tracking-[0.15em] uppercase text-(--gray-700)">
          Locations ({locations.length}/{maxLocations})
        </label>
        <ProBadge variant="icon-only" size="sm" />
      </div>

      {/* Locations list */}
      <div className="space-y-2">
        {locations.map((loc, index) => (
          <div
            key={loc.id || index}
            className={`flex items-center justify-between p-3 border-2 ${
              loc.isPrimary
                ? 'border-(--ink-black) bg-(--gray-50)'
                : 'border-(--border-subtle)'
            }`}
          >
            <div className="flex items-center gap-3">
              <MapPin className={`w-3.5 h-3.5 ${loc.isPrimary ? 'text-(--ink-black)' : 'text-(--gray-400)'}`} />
              <span className="font-body text-(--text-primary)">
                {formatLocation(loc)}
              </span>
              {loc.isPrimary && (
                <span className="font-mono text-[9px] uppercase tracking-wider bg-(--ink-black) text-(--paper-white) px-2 py-0.5">
                  Primary
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {!loc.isPrimary && (
                <button
                  type="button"
                  onClick={() => handleSetPrimary(index)}
                  className="font-mono text-[9px] uppercase tracking-wider text-(--gray-500) hover:text-(--ink-black) transition-colors"
                >
                  Set primary
                </button>
              )}
              {locations.length > 1 && (
                <button
                  type="button"
                  onClick={() => handleRemoveLocation(index)}
                  className="p-1 text-(--gray-400) hover:text-(--error) transition-colors"
                  aria-label="Remove location"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Add new location */}
      {locations.length < maxLocations && !isAdding && (
        <button
          type="button"
          onClick={() => setIsAdding(true)}
          className="btn btn-secondary w-full"
        >
          <Plus className="w-3.5 h-3.5 mr-1.5" />
          Add location
        </button>
      )}

      {/* Add location form */}
      {isAdding && (
        <div className="border-2 border-(--gray-200) p-6 space-y-5">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[11px] uppercase tracking-wider text-(--gray-600)">
              Add new location
            </span>
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="text-(--gray-400) hover:text-(--gray-600)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div>
            <label className="block font-mono text-[10px] tracking-wider uppercase text-(--gray-500) mb-1">
              Country
            </label>
            <Select
              value={newCountry}
              onChange={(val) => {
                setNewCountry(val || 'US');
                setNewRegion('');
                setNewCity('');
                setNewLocationType('city');
              }}
              options={COUNTRY_OPTIONS}
              placeholder="Select country"
              searchable
              searchPlaceholder="Search countries..."
            />
          </div>

          {newCountry === 'US' && (
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={newLocationType === 'city'}
                  onChange={() => setNewLocationType('city')}
                  className="w-3.5 h-3.5"
                />
                <span className="font-body text-sm">Specific city</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={newLocationType === 'region'}
                  onChange={() => setNewLocationType('region')}
                  className="w-3.5 h-3.5"
                />
                <span className="font-body text-sm">State-wide</span>
              </label>
            </div>
          )}

          {/* US: Show city/state selection */}
          {newCountry === 'US' && (
            <div className="grid grid-cols-2 gap-4">
              {newLocationType === 'city' && (
                <div>
                  <label className="block font-mono text-[10px] tracking-wider uppercase text-(--gray-500) mb-1">
                    City
                  </label>
                  <CitySelect
                    value={newCity}
                    onChange={setNewCity}
                    onStateAutoFill={(state) => setNewRegion(state)}
                    countryCode={newCountry}
                    placeholder="Select city"
                  />
                </div>
              )}
              <div className={newLocationType === 'city' ? '' : 'col-span-2'}>
                <label className="block font-mono text-[10px] tracking-wider uppercase text-(--gray-500) mb-1">
                  State
                </label>
                <Select
                  value={newRegion}
                  onChange={(val) => setNewRegion(val || '')}
                  options={US_STATE_OPTIONS}
                  placeholder="Select state"
                  searchable
                  searchPlaceholder="Search states..."
                  disabled={newLocationType === 'city' && !!newCity && !!newRegion}
                />
              </div>
            </div>
          )}


          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="btn btn-secondary text-xs px-4 py-2"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleAddLocation}
              disabled={!canAddLocation()}
              className="btn btn-primary text-xs px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Add
            </button>
          </div>
        </div>
      )}

      {error && (
        <p className="text-(--error) text-sm font-body">{error}</p>
      )}
    </div>
  );
}

// ===== Free Tier Location Editor Sub-component =====
interface FreeTierLocationEditorProps {
  location: Location | null;
  onChange: (location: Location | null) => void;
}

function FreeTierLocationEditor({
  location,
  onChange,
}: FreeTierLocationEditorProps) {
  const [locationType, setLocationType] = useState<'city' | 'region'>(
    location?.locationType === 'region' ? 'region' : 'city'
  );
  const [selectedCountry, setSelectedCountry] = useState<string>(location?.countryCode || 'US');
  const [selectedState, setSelectedState] = useState<string | null>(location?.region || null);
  const [cityInput, setCityInput] = useState<string>(location?.city || '');

  // Helper to notify parent of changes
  const notifyChange = (updates: Partial<{
    locationType: 'city' | 'region';
    selectedCountry: string;
    selectedState: string | null;
    cityInput: string;
  }>) => {
    const newLocationType = updates.locationType ?? locationType;
    const newCountry = updates.selectedCountry ?? selectedCountry;
    const newState = updates.selectedState !== undefined ? updates.selectedState : selectedState;
    const newCity = updates.cityInput ?? cityInput;

    // For non-US, we only store country (no city/region)
    const newLocation: Location = {
      countryCode: newCountry,
      city: newCountry === 'US' && newLocationType === 'city' ? (newCity || null) : null,
      region: newCountry === 'US' ? newState : null,
      locationType: newCountry === 'US' ? newLocationType : 'country',
      isPrimary: true,
    };
    onChange(newLocation);
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block font-mono text-[10px] tracking-wider uppercase text-(--gray-500) mb-1">
          Country
        </label>
        <Select
          value={selectedCountry}
          onChange={(val) => {
            const newCountry = val || 'US';
            setSelectedCountry(newCountry);
            setSelectedState(null);
            setCityInput('');
            notifyChange({ selectedCountry: newCountry, selectedState: null, cityInput: '' });
          }}
          options={COUNTRY_OPTIONS}
          placeholder="Select country"
          searchable
          searchPlaceholder="Search countries..."
        />
      </div>

      {selectedCountry === 'US' && (
        <>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                checked={locationType === 'city'}
                onChange={() => {
                  setLocationType('city');
                  notifyChange({ locationType: 'city' });
                }}
                className="w-3.5 h-3.5"
              />
              <span className="font-body text-sm">Specific city</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                checked={locationType === 'region'}
                onChange={() => {
                  setLocationType('region');
                  notifyChange({ locationType: 'region' });
                }}
                className="w-3.5 h-3.5"
              />
              <span className="font-body text-sm">State-wide</span>
            </label>
          </div>

          {locationType === 'city' ? (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block font-mono text-[10px] tracking-wider uppercase text-(--gray-500) mb-1">
                  City
                </label>
                <CitySelect
                  value={cityInput}
                  onChange={(val) => {
                    setCityInput(val);
                    notifyChange({ cityInput: val });
                  }}
                  onStateAutoFill={(state) => {
                    setSelectedState(state);
                    notifyChange({ selectedState: state });
                  }}
                  countryCode="US"
                  placeholder="Select city"
                />
              </div>
              <div>
                <label className="block font-mono text-[10px] tracking-wider uppercase text-(--gray-500) mb-1">
                  State
                </label>
                <Select
                  value={selectedState}
                  onChange={(val) => {
                    setSelectedState(val);
                    notifyChange({ selectedState: val });
                  }}
                  options={US_STATE_OPTIONS}
                  placeholder="Select state"
                  searchable
                  searchPlaceholder="Search states..."
                  disabled={!!cityInput && !!selectedState}
                />
              </div>
            </div>
          ) : (
            <div>
              <label className="block font-mono text-[10px] tracking-wider uppercase text-(--gray-500) mb-1">
                State
              </label>
              <Select
                value={selectedState}
                onChange={(val) => {
                  setSelectedState(val);
                  notifyChange({ selectedState: val });
                }}
                options={US_STATE_OPTIONS}
                placeholder="Select state"
                searchable
                searchPlaceholder="Search states..."
              />
            </div>
          )}
        </>
      )}

    </div>
  );
}
