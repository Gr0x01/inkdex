/**
 * Add caption and hashtags fields to Airtable Outreach table
 *
 * Run: npx tsx scripts/airtable/add-caption-fields.ts
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

interface FieldConfig {
  name: string;
  type: string;
  description?: string;
}

async function createField(field: FieldConfig): Promise<boolean> {
  const url = `https://api.airtable.com/v0/meta/bases/${AIRTABLE_BASE_ID}/tables/${AIRTABLE_OUTREACH_TABLE_ID}/fields`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${AIRTABLE_PAT}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(field),
    });

    if (!response.ok) {
      const error = await response.json();
      // Field might already exist
      if (response.status === 422 && error?.error?.message?.includes('already exists')) {
        console.log(`⏭️  Field "${field.name}" already exists, skipping`);
        return true;
      }
      console.error(`❌ Failed to create "${field.name}":`, error);
      return false;
    }

    const result = await response.json();
    console.log(`✅ Created field "${field.name}" (ID: ${result.id})`);
    return true;
  } catch (error) {
    console.error(`❌ Error creating "${field.name}":`, error);
    return false;
  }
}

async function main() {
  console.log('Adding caption and hashtags fields to Airtable Outreach table...\n');

  const fields: FieldConfig[] = [
    {
      name: 'caption',
      type: 'multilineText',
      description: 'AI-generated Instagram caption (2-3 sentences)',
    },
    {
      name: 'hashtags',
      type: 'multilineText',
      description: 'AI-generated hashtags (10-12 strategic tags)',
    },
  ];

  let success = 0;
  for (const field of fields) {
    const result = await createField(field);
    if (result) success++;
    // Rate limit between requests
    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  console.log(`\nDone: ${success}/${fields.length} fields ready`);
}

main().catch(console.error);
