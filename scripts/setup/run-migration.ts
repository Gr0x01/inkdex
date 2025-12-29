/**
 * Migration Runner - Executes SQL migrations against Supabase database
 * Uses pg client for direct SQL execution
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { Client } from 'pg';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: join(__dirname, '../../.env.local') });

const DATABASE_URL = process.env.DATABASE_URL!;

async function runMigration(migrationFile: string) {
  console.log(`🔄 Running migration: ${migrationFile}\n`);

  if (!DATABASE_URL) {
    console.error('❌ Missing DATABASE_URL in .env.local');
    process.exit(1);
  }

  // Create PostgreSQL client
  const client = new Client({
    connectionString: DATABASE_URL,
  });

  try {
    // Connect to database
    await client.connect();
    console.log('✅ Connected to database');

    // Read migration file
    const migrationPath = join(__dirname, '../../supabase/migrations', migrationFile);
    const migrationSQL = readFileSync(migrationPath, 'utf-8');

    console.log('📝 Executing migration...\n');

    // Execute migration
    await client.query(migrationSQL);

    console.log('✅ Migration completed successfully!');
    console.log('\n📋 Next steps:');
    console.log('   1. Regenerate TypeScript types: npx supabase gen types typescript --db-url="$DATABASE_URL" > types/database.types.ts');
    console.log('   2. Set up Supabase Storage bucket: npm run setup:storage\n');

  } catch (error: any) {
    console.error('❌ Migration failed:', error.message);
    if (error.message.includes('column') && error.message.includes('does not exist')) {
      console.log('\n💡 This error might mean the columns were already changed.');
      console.log('   Check the portfolio_images table schema in Supabase Dashboard.');
    }
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Run migration
const migrationFile = process.argv[2] || '20251229_010_update_storage_paths.sql';
runMigration(migrationFile);
