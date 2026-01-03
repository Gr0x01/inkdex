/**
 * Import SimpleMaps city data to Supabase locations table
 * Filters cities with population > 5,000
 * Uses batch inserts for performance
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { createClient } from '@supabase/supabase-js';

const CSV_PATH = join(__dirname, '../tmp/simplemaps_uscities_basicv1.92 (1)/uscities.csv');
const MIN_POPULATION = 5000;
const BATCH_SIZE = 500;

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

async function importLocations() {
  // Initialize Supabase client with service role key
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables');
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  console.log('Reading CSV from:', CSV_PATH);

  const csvContent = readFileSync(CSV_PATH, 'utf-8');
  const lines = csvContent.split('\n');
  const header = lines[0];

  const headerCols = parseCSVLine(header);
  const cityIdx = headerCols.indexOf('city');
  const cityAsciiIdx = headerCols.indexOf('city_ascii');
  const stateIdIdx = headerCols.indexOf('state_id');
  const stateNameIdx = headerCols.indexOf('state_name');
  const populationIdx = headerCols.indexOf('population');
  const latIdx = headerCols.indexOf('lat');
  const lngIdx = headerCols.indexOf('lng');

  console.log(`Found columns: city=${cityIdx}, state_id=${stateIdIdx}, population=${populationIdx}`);

  const locations: any[] = [];
  let processed = 0;
  let filtered = 0;

  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;

    processed++;
    const cols = parseCSVLine(lines[i]);

    const population = parseInt(cols[populationIdx] || '0', 10);

    if (population >= MIN_POPULATION) {
      locations.push({
        city: cols[cityIdx],
        city_ascii: cols[cityAsciiIdx] || cols[cityIdx],
        state_code: cols[stateIdIdx],
        state_name: cols[stateNameIdx],
        country_code: 'US',
        country_name: 'United States',
        population: population,
        lat: parseFloat(cols[latIdx]) || null,
        lng: parseFloat(cols[lngIdx]) || null,
      });
    } else {
      filtered++;
    }
  }

  console.log(`\nProcessed ${processed} cities`);
  console.log(`Filtered out ${filtered} cities with population < ${MIN_POPULATION.toLocaleString()}`);
  console.log(`Importing ${locations.length} cities to database...\n`);

  // Clear existing data
  console.log('Clearing existing locations...');
  const { error: deleteError } = await supabase
    .from('locations')
    .delete()
    .eq('country_code', 'US');

  if (deleteError) {
    console.error('Error clearing locations:', deleteError);
    throw deleteError;
  }

  // Batch insert
  let inserted = 0;
  for (let i = 0; i < locations.length; i += BATCH_SIZE) {
    const batch = locations.slice(i, i + BATCH_SIZE);

    const { error } = await supabase
      .from('locations')
      .insert(batch);

    if (error) {
      console.error(`Error inserting batch ${i / BATCH_SIZE + 1}:`, error);
      throw error;
    }

    inserted += batch.length;
    console.log(`Inserted ${inserted}/${locations.length} cities (${Math.round(inserted / locations.length * 100)}%)`);
  }

  console.log(`\n✓ Successfully imported ${inserted} locations to database`);

  // Verify count
  const { count, error: countError } = await supabase
    .from('locations')
    .select('*', { count: 'exact', head: true })
    .eq('country_code', 'US');

  if (!countError) {
    console.log(`✓ Verified: ${count} US locations in database`);
  }
}

importLocations()
  .then(() => {
    console.log('\n✓ Import complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n✗ Import failed:', error);
    process.exit(1);
  });
