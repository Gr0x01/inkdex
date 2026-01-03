/**
 * API Endpoint: Search cities by name
 * GET /api/locations/cities?country=US&search=miami
 *
 * Returns cities matching search query for location dropdowns
 * Supports auto-fill by including state codes
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface CityResult {
  city: string;
  state: string | null;
  stateName: string | null;
  label: string; // "Miami" or "Springfield, IL" for duplicates
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const countryCode = searchParams.get('country') || 'US';
    const searchQuery = searchParams.get('search') || '';
    const rawLimit = parseInt(searchParams.get('limit') || '100', 10);
    const limit = Math.min(Math.max(rawLimit, 1), 500); // Cap at 500, min 1

    const supabase = await createClient();

    // Build query
    let query = supabase
      .from('locations')
      .select('city, city_ascii, state_code, state_name')
      .eq('country_code', countryCode)
      .order('population', { ascending: false }) // Popular cities first
      .limit(limit);

    // Add search filter if provided
    if (searchQuery) {
      // Case-insensitive search on city_ascii
      query = query.ilike('city_ascii', `${searchQuery}%`);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[API] City search error:', error);
      return NextResponse.json(
        { error: 'Failed to search cities' },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json({ cities: [] });
    }

    // Group cities by name to detect duplicates (e.g., multiple Springfields)
    const cityGroups = new Map<string, typeof data>();
    data.forEach((location) => {
      const cityName = location.city;
      if (!cityGroups.has(cityName)) {
        cityGroups.set(cityName, []);
      }
      cityGroups.get(cityName)!.push(location);
    });

    // Format results with labels
    const cities: CityResult[] = [];

    cityGroups.forEach((locations, _cityName) => {
      if (locations.length === 1) {
        // Unique city name - use city only
        const loc = locations[0];
        cities.push({
          city: loc.city,
          state: loc.state_code,
          stateName: loc.state_name,
          label: loc.city
        });
      } else {
        // Multiple cities with same name - show "City, State"
        locations.forEach((loc) => {
          cities.push({
            city: loc.city,
            state: loc.state_code,
            stateName: loc.state_name,
            label: loc.state_code ? `${loc.city}, ${loc.state_code}` : loc.city
          });
        });
      }
    });

    // Sort by label for better UX
    cities.sort((a, b) => a.label.localeCompare(b.label));

    const response = NextResponse.json({ cities });

    // Cache for 1 hour (locations data rarely changes)
    response.headers.set('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');

    return response;

  } catch (error) {
    console.error('[API] City search error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
