import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { config } from 'dotenv';

config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const sql = readFileSync('supabase/migrations/20260103_atomic_pipeline_progress.sql', 'utf8');

async function applyMigration() {
  // Just print the SQL - user can apply manually via Supabase dashboard
  console.log('Migration SQL:');
  console.log(sql);
  console.log('\n📋 Apply this migration manually via Supabase dashboard SQL editor');
  console.log('Or run: npx supabase db push (after linking project)');
}

applyMigration();
