/**
 * Import Google Ads artists from local CSV to production
 */

import * as fs from 'fs';

// Read the CSV file
const csv = fs.readFileSync('/tmp/google_ads_artists.csv', 'utf-8');
const lines = csv.trim().split('\n');

interface Artist {
  instagram_handle: string;
  name: string;
  slug: string;
  city: string;
  state: string;
}

const artists: Artist[] = [];

for (const line of lines) {
  // Parse CSV (handle commas in name field)
  const parts = line.split(',');
  const instagram_handle = parts[0];
  const city_state = parts[parts.length - 1]; // Last part is "City,State"
  const state = city_state; // Actually this is just state since city is second to last
  const city = parts[parts.length - 2];
  const slug = parts[parts.length - 3];
  // Name is everything in between
  const name = parts.slice(1, parts.length - 3).join(',');

  // Skip invalid handles (gmail.com, etc)
  if (instagram_handle.includes('.com') || instagram_handle.includes('gmail') || instagram_handle.length < 3) {
    continue;
  }

  // Clean up the handle (remove trailing dots)
  const cleanHandle = instagram_handle.replace(/\.+$/, '');

  artists.push({
    instagram_handle: cleanHandle,
    name: name.substring(0, 100), // Truncate long names
    slug,
    city,
    state,
  });
}

// Deduplicate by handle
const seen = new Set<string>();
const uniqueArtists = artists.filter(a => {
  if (seen.has(a.instagram_handle)) return false;
  seen.add(a.instagram_handle);
  return true;
});

console.log(`Total artists: ${lines.length}`);
console.log(`Valid artists after filtering: ${uniqueArtists.length}`);

// Group by city
const byCity = new Map<string, Artist[]>();
for (const a of uniqueArtists) {
  const key = `${a.city}, ${a.state}`;
  const list = byCity.get(key) || [];
  list.push(a);
  byCity.set(key, list);
}

console.log('\nBy city:');
for (const [city, list] of byCity) {
  console.log(`  ${city}: ${list.length} artists`);
}

// Output SQL for production import
const sqlFile = '/tmp/google_ads_import.sql';
let sql = `-- Google Ads Artists Import
-- Generated: ${new Date().toISOString()}
-- Total: ${uniqueArtists.length} artists

BEGIN;

`;

for (const a of uniqueArtists) {
  const escapedName = a.name.replace(/'/g, "''");
  const escapedHandle = a.instagram_handle.replace(/'/g, "''");

  sql += `
-- ${a.instagram_handle} (${a.city}, ${a.state})
INSERT INTO artists (instagram_handle, name, slug, verification_status)
VALUES ('${escapedHandle}', '${escapedName}', '${a.slug}', 'unclaimed')
ON CONFLICT (instagram_handle) DO NOTHING;

INSERT INTO artist_locations (artist_id, city, region, country, country_code, is_primary)
SELECT id, '${a.city}', '${a.state}', 'United States', 'US', true
FROM artists WHERE instagram_handle = '${escapedHandle}'
ON CONFLICT DO NOTHING;
`;
}

sql += `
COMMIT;
`;

fs.writeFileSync(sqlFile, sql);
console.log(`\nSQL file written to: ${sqlFile}`);
console.log(`Run with: psql <production_url> -f ${sqlFile}`);
