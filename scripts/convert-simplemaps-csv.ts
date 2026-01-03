/**
 * Convert SimpleMaps CSV to TypeScript constant
 * Filters cities with population > 5,000
 * Outputs: lib/constants/us-cities-full.ts
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

interface CityRow {
  city: string;
  city_ascii: string;
  state_id: string;
  state_name: string;
  population: string;
}

interface City {
  city: string;
  state: string;
  stateName: string;
}

const CSV_PATH = join(__dirname, '../tmp/simplemaps_uscities_basicv1.92 (1)/uscities.csv');
const OUTPUT_PATH = join(__dirname, '../lib/constants/us-cities-full.ts');
const MIN_POPULATION = 5000;

console.log('Reading CSV from:', CSV_PATH);

const csvContent = readFileSync(CSV_PATH, 'utf-8');
const lines = csvContent.split('\n');
const header = lines[0];

// Parse CSV (handles quoted fields)
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current);
  return result;
}

const headerCols = parseCSVLine(header);
const cityIdx = headerCols.indexOf('city');
const cityAsciiIdx = headerCols.indexOf('city_ascii');
const stateIdIdx = headerCols.indexOf('state_id');
const stateNameIdx = headerCols.indexOf('state_name');
const populationIdx = headerCols.indexOf('population');

console.log(`Found columns: city=${cityIdx}, state_id=${stateIdIdx}, state_name=${stateNameIdx}, population=${populationIdx}`);

const cities: City[] = [];
let processed = 0;
let filtered = 0;

for (let i = 1; i < lines.length; i++) {
  if (!lines[i].trim()) continue;

  processed++;
  const cols = parseCSVLine(lines[i]);

  const population = parseInt(cols[populationIdx] || '0', 10);

  if (population >= MIN_POPULATION) {
    cities.push({
      city: cols[cityAsciiIdx] || cols[cityIdx], // Use ASCII version for cleaner names
      state: cols[stateIdIdx],
      stateName: cols[stateNameIdx]
    });
  } else {
    filtered++;
  }
}

console.log(`\nProcessed ${processed} cities`);
console.log(`Filtered out ${filtered} cities with population < ${MIN_POPULATION.toLocaleString()}`);
console.log(`Keeping ${cities.length} cities`);

// Sort by city name for easier searching
cities.sort((a, b) => a.city.localeCompare(b.city));

// Generate TypeScript file
const tsContent = `/**
 * US Cities Database from SimpleMaps
 * https://simplemaps.com/data/us-cities
 *
 * Filtered to cities with population >= ${MIN_POPULATION.toLocaleString()}
 * Last updated: ${new Date().toISOString().split('T')[0]}
 * Total cities: ${cities.length.toLocaleString()}
 */

export interface USCity {
  city: string;
  state: string;
  stateName: string;
}

export const US_CITIES_FULL: USCity[] = ${JSON.stringify(cities, null, 2)};

/**
 * Find city by name (case-insensitive)
 */
export function findCityByName(cityName: string): USCity | undefined {
  const searchName = cityName.toLowerCase().trim();
  return US_CITIES_FULL.find(c => c.city.toLowerCase() === searchName);
}

/**
 * Get state code from city name
 */
export function getStateFromCity(cityName: string): string | null {
  const city = findCityByName(cityName);
  return city ? city.state : null;
}
`;

writeFileSync(OUTPUT_PATH, tsContent, 'utf-8');
console.log(`\n✓ Written to: ${OUTPUT_PATH}`);
console.log(`File size: ${(tsContent.length / 1024).toFixed(1)} KB`);
