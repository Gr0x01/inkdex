import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { resolve } from 'path';

// Load .env.local explicitly
config({ path: resolve(process.cwd(), '.env.local') });

async function verifyIndex() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Missing Supabase credentials in .env.local');
    process.exit(1);
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        persistSession: false,
      },
    }
  );

  console.log('🔍 Checking for vector index on portfolio_images table...\n');

  // Use raw SQL query to check pg_stat_user_indexes
  const { data: indexStats, error: statsError } = await supabase.rpc('exec_sql', {
    sql: `
      SELECT
        indexrelname as index_name,
        idx_scan as scans,
        idx_tup_read as tuples_read,
        idx_tup_fetch as tuples_fetched
      FROM pg_stat_user_indexes
      WHERE relname = 'portfolio_images'
        AND indexrelname LIKE '%embedding%';
    `
  });

  if (!statsError && indexStats) {
    console.log('📊 Index Statistics:');
    console.log(JSON.stringify(indexStats, null, 2));
  }

  // Check index definition
  const { data: indexDef, error: defError } = await supabase.rpc('exec_sql', {
    sql: `
      SELECT
        schemaname,
        tablename,
        indexname,
        indexdef
      FROM pg_indexes
      WHERE tablename = 'portfolio_images'
        AND indexname = 'idx_portfolio_embeddings';
    `
  });

  if (defError) {
    console.error('❌ Error querying index:', defError.message);
    return;
  }

  if (!indexDef || indexDef.length === 0) {
    console.log('❌ Vector index NOT FOUND!');
    console.log('\n📋 All indexes on portfolio_images:');

    const { data: allIndexes } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT indexname, indexdef
        FROM pg_indexes
        WHERE tablename = 'portfolio_images';
      `
    });

    console.log(JSON.stringify(allIndexes, null, 2));
    return;
  }

  console.log('✅ Vector index EXISTS!\n');
  console.log('📝 Index Definition:');
  console.log(JSON.stringify(indexDef, null, 2));

  // Check index size
  const { data: sizeData } = await supabase.rpc('exec_sql', {
    sql: `
      SELECT
        pg_size_pretty(pg_relation_size('idx_portfolio_embeddings')) as index_size,
        pg_size_pretty(pg_relation_size('portfolio_images')) as table_size;
    `
  });

  if (sizeData) {
    console.log('\n💾 Storage:');
    console.log(JSON.stringify(sizeData, null, 2));
  }
}

verifyIndex().catch(console.error);
