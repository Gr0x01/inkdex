'use client';

/**
 * Admin Location Editor Component
 *
 * Used in admin panel to edit artist locations.
 * Matches the admin panel design system.
 */

import { useState } from 'react';
import { Plus, X, MapPin, Check, Loader2, Pencil } from 'lucide-react';
import Select from '@/components/ui/Select';
import CitySelect from '@/components/ui/CitySelect';
import { US_STATE_OPTIONS, getStateName } from '@/lib/constants/states';
import { COUNTRY_OPTIONS, getCountryName } from '@/lib/constants/countries';

export interface Location {
  id?: string;
  city: string | null;
  region: string | null;
  countryCode: string;
  locationType: 'city' | 'region' | 'country';
  isPrimary: boolean;
  displayOrder?: number;
}

interface AdminLocationEditorProps {
  artistId: string;
  isPro: boolean;
  initialLocations: Location[];
  onLocationsUpdated: (locations: Location[]) => void;
}

const MAX_FREE_LOCATIONS = 1;
const MAX_PRO_LOCATIONS = 20;

export default function AdminLocationEditor({
  artistId,
  isPro,
  initialLocations,
  onLocationsUpdated,
}: AdminLocationEditorProps) {
  const maxLocations = isPro ? MAX_PRO_LOCATIONS : MAX_FREE_LOCATIONS;

  const [locations, setLocations] = useState<Location[]>(initialLocations);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Form state (used for both add and edit)
  const [formCountry, setFormCountry] = useState<string>('US');
  const [formCity, setFormCity] = useState<string>('');
  const [formRegion, setFormRegion] = useState<string>('');
  const [formLocationType, setFormLocationType] = useState<'city' | 'region'>('city');

  // Track if there are unsaved changes
  const hasChanges = JSON.stringify(locations) !== JSON.stringify(initialLocations);

  const formatLocation = (loc: Location): string => {
    const parts: string[] = [];

    if (loc.city) {
      parts.push(loc.city);
    }

    if (loc.region) {
      if (loc.countryCode === 'US') {
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

  const resetForm = () => {
    setFormCountry('US');
    setFormCity('');
    setFormRegion('');
    setFormLocationType('city');
  };

  const openAddForm = () => {
    resetForm();
    setEditingIndex(null);
    setIsAdding(true);
  };

  const openEditForm = (index: number) => {
    const loc = locations[index];
    setFormCountry(loc.countryCode);
    setFormCity(loc.city || '');
    setFormRegion(loc.region || '');
    setFormLocationType(loc.locationType === 'region' ? 'region' : 'city');
    setEditingIndex(index);
    setIsAdding(false);
  };

  const closeForm = () => {
    setIsAdding(false);
    setEditingIndex(null);
    resetForm();
  };

  const canSubmitForm = (): boolean => {
    if (formCountry === 'US') {
      if (formLocationType === 'city') return !!formCity.trim();
      if (formLocationType === 'region') return !!formRegion;
    }
    return true;
  };

  const buildLocationFromForm = (isPrimary: boolean): Location => {
    return {
      countryCode: formCountry,
      city: formCountry === 'US' && formLocationType === 'city' ? (formCity.trim() || null) : null,
      region: formCountry === 'US' ? (formRegion || null) : null,
      locationType: formCountry === 'US' ? formLocationType : 'country',
      isPrimary,
    };
  };

  const handleAddLocation = () => {
    if (!canSubmitForm()) return;

    const newLocation = buildLocationFromForm(locations.length === 0);
    setLocations([...locations, newLocation]);
    closeForm();
    setError(null);
    setSuccess(false);
  };

  const handleUpdateLocation = () => {
    if (!canSubmitForm() || editingIndex === null) return;

    const updatedLocation = buildLocationFromForm(locations[editingIndex].isPrimary);
    // Preserve the id if it exists
    if (locations[editingIndex].id) {
      updatedLocation.id = locations[editingIndex].id;
    }

    const newLocations = [...locations];
    newLocations[editingIndex] = updatedLocation;
    setLocations(newLocations);
    closeForm();
    setError(null);
    setSuccess(false);
  };

  const handleRemoveLocation = (index: number) => {
    const newLocations = locations.filter((_, i) => i !== index);
    if (newLocations.length > 0 && !newLocations.some((l) => l.isPrimary)) {
      newLocations[0].isPrimary = true;
    }
    setLocations(newLocations);
    setError(null);
    setSuccess(false);
  };

  const handleSetPrimary = (index: number) => {
    const newLocations = locations.map((loc, i) => ({
      ...loc,
      isPrimary: i === index,
    }));
    setLocations(newLocations);
    setError(null);
    setSuccess(false);
  };

  const handleSave = async () => {
    if (locations.length === 0) {
      setError('At least one location is required');
      return;
    }

    if (locations.length > maxLocations) {
      setError(`${isPro ? 'Pro' : 'Free'} tier allows maximum ${maxLocations} location(s)`);
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch(`/api/admin/artists/${artistId}/locations`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locations }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save locations');
      }

      const data = await response.json();
      setLocations(data.locations);
      onLocationsUpdated(data.locations);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save locations');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setLocations(initialLocations);
    setError(null);
    setSuccess(false);
    closeForm();
  };

  const isFormOpen = isAdding || editingIndex !== null;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h2 className="font-mono text-[10px] uppercase tracking-wider text-gray-500">
            Locations ({locations.length}/{maxLocations})
          </h2>
          {!isPro && (
            <span className="font-mono text-[10px] text-gray-400">(Free tier)</span>
          )}
        </div>
        {locations.length < maxLocations && !isFormOpen && (
          <button
            type="button"
            onClick={openAddForm}
            className="flex items-center gap-1 text-[11px] font-mono uppercase tracking-wide text-ink/60 hover:text-ink transition-colors"
          >
            <Plus className="w-3 h-3" />
            Add
          </button>
        )}
      </div>

      {/* Locations list */}
      {!isFormOpen && (
        <div className="space-y-1">
          {locations.length === 0 ? (
            <div className="py-3 text-center text-[12px] text-gray-400 font-body">
              No locations set
            </div>
          ) : (
            locations.map((loc, index) => (
              <div
                key={loc.id || index}
                className={`flex items-center justify-between py-2 px-3 -mx-3 ${
                  loc.isPrimary ? 'bg-ink/[0.03]' : ''
                }`}
              >
                <div className="flex items-center gap-2">
                  <MapPin className={`w-3.5 h-3.5 ${loc.isPrimary ? 'text-ink/60' : 'text-gray-400'}`} />
                  <span className="text-[13px] text-ink font-body">
                    {formatLocation(loc)}
                  </span>
                  {loc.isPrimary && (
                    <span className="font-mono text-[9px] uppercase tracking-wide bg-ink text-paper px-1.5 py-0.5">
                      Primary
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {!loc.isPrimary && locations.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleSetPrimary(index)}
                      className="text-[10px] font-mono uppercase tracking-wide text-gray-400 hover:text-ink transition-colors"
                    >
                      Set primary
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => openEditForm(index)}
                    className="p-1 text-gray-400 hover:text-ink transition-colors"
                    aria-label="Edit location"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  {locations.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveLocation(index)}
                      className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                      aria-label="Remove location"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Add/Edit location form */}
      {isFormOpen && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] uppercase tracking-wider text-gray-500">
              {isAdding ? 'Add new location' : 'Edit location'}
            </span>
            <button
              type="button"
              onClick={closeForm}
              className="text-gray-400 hover:text-ink transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div>
            <label className="block font-mono text-[10px] uppercase tracking-wider text-gray-500 mb-1.5">
              Country
            </label>
            <Select
              value={formCountry}
              onChange={(val) => {
                setFormCountry(val || 'US');
                setFormRegion('');
                setFormCity('');
                setFormLocationType('city');
              }}
              options={COUNTRY_OPTIONS}
              placeholder="Select country"
              searchable
              searchPlaceholder="Search countries..."
            />
          </div>

          {formCountry === 'US' && (
            <>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={formLocationType === 'city'}
                    onChange={() => setFormLocationType('city')}
                    className="w-3.5 h-3.5 accent-ink"
                  />
                  <span className="text-[12px] text-ink font-body">Specific city</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={formLocationType === 'region'}
                    onChange={() => setFormLocationType('region')}
                    className="w-3.5 h-3.5 accent-ink"
                  />
                  <span className="text-[12px] text-ink font-body">State-wide</span>
                </label>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {formLocationType === 'city' && (
                  <div>
                    <label className="block font-mono text-[10px] uppercase tracking-wider text-gray-500 mb-1.5">
                      City
                    </label>
                    <CitySelect
                      value={formCity}
                      onChange={setFormCity}
                      onStateAutoFill={(state) => setFormRegion(state)}
                      countryCode={formCountry}
                      placeholder="Select city"
                    />
                  </div>
                )}
                <div className={formLocationType === 'city' ? '' : 'col-span-2'}>
                  <label className="block font-mono text-[10px] uppercase tracking-wider text-gray-500 mb-1.5">
                    State
                  </label>
                  <Select
                    value={formRegion}
                    onChange={(val) => setFormRegion(val || '')}
                    options={US_STATE_OPTIONS}
                    placeholder="Select state"
                    searchable
                    searchPlaceholder="Search states..."
                    disabled={formLocationType === 'city' && !!formCity && !!formRegion}
                  />
                </div>
              </div>
            </>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={closeForm}
              className="px-3 py-1.5 text-[11px] font-mono uppercase tracking-wide text-gray-500 hover:text-ink transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={isAdding ? handleAddLocation : handleUpdateLocation}
              disabled={!canSubmitForm()}
              className="px-3 py-1.5 text-[11px] font-mono uppercase tracking-wide bg-ink text-paper hover:bg-ink/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isAdding ? 'Add' : 'Update'}
            </button>
          </div>
        </div>
      )}

      {/* Footer with save/reset */}
      {(hasChanges || error || success) && !isFormOpen && (
        <div className="mt-4 pt-4 border-t border-ink/10 flex items-center justify-between">
          <div className="text-[12px] font-body">
            {error && (
              <span className="text-red-500">{error}</span>
            )}
            {success && (
              <span className="text-status-success flex items-center gap-1">
                <Check className="w-3.5 h-3.5" />
                Saved
              </span>
            )}
          </div>
          {hasChanges && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleReset}
                disabled={saving}
                className="px-3 py-1.5 text-[11px] font-mono uppercase tracking-wide text-gray-500 hover:text-ink disabled:opacity-50 transition-colors"
              >
                Reset
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving || locations.length === 0}
                className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-mono uppercase tracking-wide bg-status-success text-white hover:bg-status-success/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {saving && <Loader2 className="w-3 h-3 animate-spin" />}
                Save Changes
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
