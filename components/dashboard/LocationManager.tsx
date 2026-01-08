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

  const handleAddLocation = () => {
    if (!newCity.trim() && newCountry === 'US' && newLocationType === 'city') return;
    if (!newCity.trim() && newCountry !== 'US') return;
    if (newLocationType === 'region' && !newRegion) return;

    const newLocation: Location = {
      countryCode: newCountry,
      city: newLocationType === 'city' ? (newCity.trim() || null) : null,
      region: newCountry === 'US' ? (newRegion || null) : (newRegion.trim() || null),
      locationType: newLocationType,
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
        <label className="block font-mono text-[11px] font-medium tracking-[0.15em] uppercase text-[var(--gray-700)]">
          Location <span className="text-[var(--error)]">*</span>
        </label>

        <FreeTierLocationEditor
          location={locations[0] || null}
          onChange={(loc) => onChange(loc ? [loc] : [])}
        />

        {/* Upgrade CTA */}
        <div className="flex items-center gap-2 p-3 border-2 border-dashed border-[var(--gray-200)] bg-[var(--gray-50)]">
          <Crown className="w-3.5 h-3.5 text-amber-500" />
          <span className="font-body text-sm text-[var(--gray-600)]">
            Want to list multiple locations?{' '}
            <Link href="/dashboard/upgrade" className="text-[var(--ink-black)] underline hover:no-underline">
              Upgrade to Pro
            </Link>
          </span>
        </div>

        {error && (
          <p className="text-[var(--error)] text-sm font-body">{error}</p>
        )}
      </div>
    );
  }

  // ===== PRO TIER: Full location management (always editable) =====
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <label className="block font-mono text-[11px] font-medium tracking-[0.15em] uppercase text-[var(--gray-700)]">
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
                ? 'border-[var(--ink-black)] bg-[var(--gray-50)]'
                : 'border-[var(--border-subtle)]'
            }`}
          >
            <div className="flex items-center gap-3">
              <MapPin className={`w-3.5 h-3.5 ${loc.isPrimary ? 'text-[var(--ink-black)]' : 'text-[var(--gray-400)]'}`} />
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
          className="w-full p-3 border-2 border-dashed border-[var(--gray-300)] text-center hover:border-[var(--gray-400)] transition-colors"
        >
          <Plus className="w-3.5 h-3.5 inline mr-1" />
          <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--gray-500)]">
            Add location
          </span>
        </button>
      )}

      {/* Add location form */}
      {isAdding && (
        <div className="border-2 border-dashed border-[var(--gray-300)] p-4 space-y-4">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--gray-500)]">
              Add new location
            </span>
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="text-[var(--gray-400)] hover:text-[var(--gray-600)]"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div>
            <label className="block font-mono text-[10px] tracking-wider uppercase text-[var(--gray-500)] mb-1">
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

          <div className="grid grid-cols-2 gap-4">
            {(newCountry !== 'US' || newLocationType === 'city') && (
              <div>
                <label className="block font-mono text-[10px] tracking-wider uppercase text-[var(--gray-500)] mb-1">
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
            <div className={newCountry !== 'US' || newLocationType === 'city' ? '' : 'col-span-2'}>
              <label className="block font-mono text-[10px] tracking-wider uppercase text-[var(--gray-500)] mb-1">
                {newCountry === 'US' ? 'State' : 'Region / Province'}
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
                  placeholder="Optional"
                />
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={handleAddLocation}
            className="w-full py-2 bg-[var(--ink-black)] text-[var(--paper-white)] font-mono text-[11px] uppercase tracking-wider hover:bg-[var(--gray-800)] transition-colors"
          >
            Add Location
          </button>
        </div>
      )}

      {error && (
        <p className="text-[var(--error)] text-sm font-body">{error}</p>
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
  const [regionInput, setRegionInput] = useState<string>(location?.region || '');

  // Helper to notify parent of changes
  const notifyChange = (updates: Partial<{
    locationType: 'city' | 'region';
    selectedCountry: string;
    selectedState: string | null;
    cityInput: string;
    regionInput: string;
  }>) => {
    const newLocationType = updates.locationType ?? locationType;
    const newCountry = updates.selectedCountry ?? selectedCountry;
    const newState = updates.selectedState !== undefined ? updates.selectedState : selectedState;
    const newCity = updates.cityInput ?? cityInput;
    const newRegion = updates.regionInput ?? regionInput;

    const newLocation: Location = {
      countryCode: newCountry,
      city: newLocationType === 'city' ? (newCity || null) : null,
      region: newCountry === 'US' ? newState : (newRegion || null),
      locationType: newLocationType,
      isPrimary: true,
    };
    onChange(newLocation);
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block font-mono text-[10px] tracking-wider uppercase text-[var(--gray-500)] mb-1">
          Country
        </label>
        <Select
          value={selectedCountry}
          onChange={(val) => {
            const newCountry = val || 'US';
            setSelectedCountry(newCountry);
            setSelectedState(null);
            setCityInput('');
            setRegionInput('');
            notifyChange({ selectedCountry: newCountry, selectedState: null, cityInput: '', regionInput: '' });
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
                <label className="block font-mono text-[10px] tracking-wider uppercase text-[var(--gray-500)] mb-1">
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
                <label className="block font-mono text-[10px] tracking-wider uppercase text-[var(--gray-500)] mb-1">
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
            </div>
          ) : (
            <div>
              <label className="block font-mono text-[10px] tracking-wider uppercase text-[var(--gray-500)] mb-1">
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

      {selectedCountry !== 'US' && (
        <div className="space-y-4">
          <div>
            <label className="block font-mono text-[10px] tracking-wider uppercase text-[var(--gray-500)] mb-1">
              City <span className="text-[var(--error)]">*</span>
            </label>
            <input
              type="text"
              value={cityInput}
              onChange={(e) => {
                setCityInput(e.target.value);
                notifyChange({ cityInput: e.target.value });
              }}
              className="input"
              placeholder="London"
            />
          </div>
          <div>
            <label className="block font-mono text-[10px] tracking-wider uppercase text-[var(--gray-500)] mb-1">
              Region / Province (optional)
            </label>
            <input
              type="text"
              value={regionInput}
              onChange={(e) => {
                setRegionInput(e.target.value);
                notifyChange({ regionInput: e.target.value });
              }}
              className="input"
              placeholder="England"
            />
          </div>
        </div>
      )}
    </div>
  );
}
