/**
 * Verify Database Query Timeout
 *
 * Checks that statement_timeout is correctly set to 5s
 */

import { Client } from 'pg';
import * as dotenv from 'dotenv';
import { join } from 'path';

dotenv.config({ path: join(__dirname, '../../.env.local') });

async function verifyTimeout() {
  console.log('🔍 Checking database query timeout...\n');

  const client = new Client({ connectionString: process.env.DATABASE_URL });

  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    // Check statement timeout
    const result = await client.query('SHOW statement_timeout');
    const timeout = result.rows[0].statement_timeout;

    console.log(`📊 Current statement_timeout: ${timeout}`);

    if (timeout === '5s' || timeout === '5000ms') {
      console.log('✅ Query timeout is correctly set!\n');
      console.log('💡 All queries will be cancelled after 5 seconds');
      console.log('   This prevents hung connections during traffic spikes\n');
    } else if (timeout === '0' || timeout === '0ms') {
      console.warn('⚠️  WARNING: No timeout set (unlimited)');
      console.warn('   Hung queries can exhaust connection pool');
      console.warn('   Run migration: 20260108_003_set_query_timeouts.sql\n');
    } else {
      console.log(`ℹ️  Timeout is set to: ${timeout}`);
      console.log('   Recommended: 5s for production\n');
    }

  } catch (error: any) {
    console.error('❌ Error checking timeout:', error.message);
  } finally {
    await client.end();
  }
}

verifyTimeout();
