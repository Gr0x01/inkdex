/**
 * Fix image URLs for existing Airtable records
 *
 * The original push used wrong bucket name (portfolio vs portfolio-images).
 * This script fetches all records and updates image URLs.
 *
 * Run: npx tsx scripts/airtable/fix-image-urls.ts
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

const AIRTABLE_PAT = process.env.AIRTABLE_PAT;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const AIRTABLE_OUTREACH_TABLE_ID = process.env.AIRTABLE_OUTREACH_TABLE_ID;

if (!AIRTABLE_PAT || !AIRTABLE_BASE_ID || !AIRTABLE_OUTREACH_TABLE_ID) {
  console.error('Missing Airtable environment variables');
  process.exit(1);
}

interface AirtableRecord {
  id: string;
  fields: {
    instagram_handle?: string;
    image_1?: string;
    image_2?: string;
    image_3?: string;
    image_4?: string;
  };
}

async function fetchAllRecords(): Promise<AirtableRecord[]> {
  const records: AirtableRecord[] = [];
  let offset: string | undefined;

  do {
    const params = new URLSearchParams({ pageSize: '100' });
    if (offset) params.set('offset', offset);

    const response = await fetch(
      `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_OUTREACH_TABLE_ID}?${params}`,
      {
        headers: { Authorization: `Bearer ${AIRTABLE_PAT}` },
      }
    );

    if (!response.ok) {
      throw new Error(`Airtable fetch failed: ${response.statusText}`);
    }

    const data = await response.json();
    records.push(...data.records);
    offset = data.offset;

    if (offset) await new Promise((r) => setTimeout(r, 200));
  } while (offset);

  return records;
}

function fixImageUrl(url: string | undefined): string | undefined {
  if (!url) return undefined;
  // Fix: /portfolio/ -> /portfolio-images/
  return url.replace('/storage/v1/object/public/portfolio/', '/storage/v1/object/public/portfolio-images/');
}

async function updateRecords(
  records: Array<{ id: string; fields: Record<string, string | undefined> }>
): Promise<void> {
  // Airtable allows max 10 records per request
  for (let i = 0; i < records.length; i += 10) {
    const batch = records.slice(i, i + 10);

    const response = await fetch(
      `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_OUTREACH_TABLE_ID}`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${AIRTABLE_PAT}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ records: batch }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      console.error('Update failed:', error);
      throw new Error(`Airtable update failed: ${response.statusText}`);
    }

    console.log(`Updated ${Math.min(i + 10, records.length)}/${records.length} records`);

    // Rate limit
    if (i + 10 < records.length) {
      await new Promise((r) => setTimeout(r, 250));
    }
  }
}

async function main() {
  console.log('Fetching all Airtable records...\n');

  const records = await fetchAllRecords();
  console.log(`Found ${records.length} records\n`);

  // Find records with broken image URLs
  const needsUpdate: Array<{ id: string; fields: Record<string, string | undefined> }> = [];

  for (const record of records) {
    const { image_1, image_2, image_3, image_4 } = record.fields;

    // Check if any image has the wrong bucket path
    const hasBrokenUrl = [image_1, image_2, image_3, image_4].some(
      (url) => url?.includes('/storage/v1/object/public/portfolio/') // Note: NOT portfolio-images
    );

    if (hasBrokenUrl) {
      needsUpdate.push({
        id: record.id,
        fields: {
          image_1: fixImageUrl(image_1),
          image_2: fixImageUrl(image_2),
          image_3: fixImageUrl(image_3),
          image_4: fixImageUrl(image_4),
        },
      });
    }
  }

  if (needsUpdate.length === 0) {
    console.log('No records need fixing - all image URLs are correct!');
    return;
  }

  console.log(`Found ${needsUpdate.length} records with broken image URLs\n`);
  console.log('Updating...\n');

  await updateRecords(needsUpdate);

  console.log('\nDone! All image URLs fixed.');
}

main().catch(console.error);
