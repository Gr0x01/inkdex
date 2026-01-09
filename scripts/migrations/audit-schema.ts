#!/usr/bin/env npx tsx
/**
 * Database Schema Audit Tool
 *
 * Compares production database against baseline schema to detect:
 * - Missing tables
 * - Missing functions
 * - Functions with incorrect search_path (the '' bug)
 * - Missing indexes
 * - Missing triggers
 *
 * Usage:
 *   npx tsx scripts/migrations/audit-schema.ts              # Generate audit SQL
 *   npx tsx scripts/migrations/audit-schema.ts --query      # Run queries via MCP (if available)
 *   npx tsx scripts/migrations/audit-schema.ts --fix        # Output fix SQL
 *
 * The script auto-extracts expected objects from the baseline file.
 */

import * as fs from 'fs'
import * as path from 'path'

const BASELINE_PATH = path.join(
  process.cwd(),
  'supabase/migrations/00000000000000_baseline.sql'
)

interface SchemaAuditResult {
  functions: {
    expected: string[]
    badSearchPathQuery: string
  }
  tables: {
    expected: string[]
  }
  indexes: {
    expected: string[]
  }
  triggers: {
    expected: string[]
  }
}

/**
 * Extract expected schema objects from baseline SQL file
 */
function extractFromBaseline(): SchemaAuditResult {
  if (!fs.existsSync(BASELINE_PATH)) {
    console.error(`Baseline file not found: ${BASELINE_PATH}`)
    process.exit(1)
  }

  const content = fs.readFileSync(BASELINE_PATH, 'utf-8')

  // Extract function names (CREATE FUNCTION or CREATE OR REPLACE FUNCTION)
  // Handles both quoted ("public"."function_name") and unquoted (public.function_name) formats
  const functionRegex =
    /CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION\s+(?:"?public"?\.)?"?(\w+)"?\s*\(/gi
  const functions = new Set<string>()
  let match
  while ((match = functionRegex.exec(content)) !== null) {
    functions.add(match[1])
  }

  // Extract table names (CREATE TABLE IF NOT EXISTS or CREATE TABLE)
  // Handles both quoted ("public"."table_name") and unquoted formats
  const tableRegex =
    /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:"?public"?\.)?"?(\w+)"?\s*\(/gi
  const tables = new Set<string>()
  while ((match = tableRegex.exec(content)) !== null) {
    tables.add(match[1])
  }

  // Extract index names (CREATE INDEX or CREATE UNIQUE INDEX)
  // Handles both quoted and unquoted formats
  const indexRegex =
    /CREATE\s+(?:UNIQUE\s+)?INDEX\s+(?:IF\s+NOT\s+EXISTS\s+)?"?(\w+)"?\s+ON/gi
  const indexes = new Set<string>()
  while ((match = indexRegex.exec(content)) !== null) {
    indexes.add(match[1])
  }

  // Extract trigger names (CREATE TRIGGER)
  const triggerRegex =
    /CREATE\s+(?:OR\s+REPLACE\s+)?TRIGGER\s+"?(\w+)"?\s+/gi
  const triggers = new Set<string>()
  while ((match = triggerRegex.exec(content)) !== null) {
    triggers.add(match[1])
  }

  // Validate extracted names (prevent SQL injection from malicious baseline)
  const validateName = (name: string, type: string): boolean => {
    if (!/^[a-z_][a-z0-9_]*$/i.test(name)) {
      console.warn(`Warning: Invalid ${type} name detected and skipped: ${name}`)
      return false
    }
    return true
  }

  return {
    functions: {
      expected: Array.from(functions).filter(n => validateName(n, 'function')).sort(),
      badSearchPathQuery: generateSearchPathAuditQuery(),
    },
    tables: {
      expected: Array.from(tables).filter(n => validateName(n, 'table')).sort(),
    },
    indexes: {
      expected: Array.from(indexes).filter(n => validateName(n, 'index')).sort(),
    },
    triggers: {
      expected: Array.from(triggers).filter(n => validateName(n, 'trigger')).sort(),
    },
  }
}

/**
 * Generate SQL to find functions with bad search_path
 */
function generateSearchPathAuditQuery(): string {
  return `
-- AUDIT: Functions with empty or missing search_path (SECURITY DEFINER)
-- These will fail with "relation does not exist" errors
SELECT
  p.proname AS function_name,
  p.prosecdef AS is_security_definer,
  CASE
    WHEN array_to_string(p.proconfig, ',') LIKE '%search_path=%'
    THEN substring(array_to_string(p.proconfig, ',') FROM 'search_path=([^,]+)')
    ELSE 'NOT SET'
  END AS search_path_value,
  CASE
    WHEN p.prosecdef AND (
      array_to_string(p.proconfig, ',') NOT LIKE '%search_path=%'
      OR array_to_string(p.proconfig, ',') LIKE '%search_path=""%'
      OR array_to_string(p.proconfig, ',') LIKE E'%search_path=\\'\\'%'
    ) THEN 'CRITICAL'
    ELSE 'OK'
  END AS status
FROM pg_proc p
WHERE p.pronamespace = 'public'::regnamespace
  AND p.prosecdef = true
ORDER BY status DESC, p.proname;
`.trim()
}

/**
 * Generate SQL to check for missing functions
 */
function generateMissingFunctionsQuery(expected: string[]): string {
  const arrayLiteral = expected.map((f) => `'${f}'`).join(',\n    ')
  return `
-- AUDIT: Missing functions compared to baseline
WITH expected AS (
  SELECT unnest(ARRAY[
    ${arrayLiteral}
  ]) AS name
),
existing AS (
  SELECT proname AS name FROM pg_proc WHERE pronamespace = 'public'::regnamespace
)
SELECT e.name AS missing_function
FROM expected e
LEFT JOIN existing x ON e.name = x.name
WHERE x.name IS NULL
ORDER BY e.name;
`.trim()
}

/**
 * Generate SQL to check for missing tables
 */
function generateMissingTablesQuery(expected: string[]): string {
  const arrayLiteral = expected.map((t) => `'${t}'`).join(',\n    ')
  return `
-- AUDIT: Missing tables compared to baseline
WITH expected AS (
  SELECT unnest(ARRAY[
    ${arrayLiteral}
  ]) AS name
),
existing AS (
  SELECT table_name AS name FROM information_schema.tables WHERE table_schema = 'public'
)
SELECT e.name AS missing_table
FROM expected e
LEFT JOIN existing x ON e.name = x.name
WHERE x.name IS NULL
ORDER BY e.name;
`.trim()
}

/**
 * Generate SQL to check for missing indexes
 */
function generateMissingIndexesQuery(expected: string[]): string {
  const arrayLiteral = expected.map((i) => `'${i}'`).join(',\n    ')
  return `
-- AUDIT: Missing indexes compared to baseline
WITH expected AS (
  SELECT unnest(ARRAY[
    ${arrayLiteral}
  ]) AS name
),
existing AS (
  SELECT indexname AS name FROM pg_indexes WHERE schemaname = 'public'
)
SELECT e.name AS missing_index
FROM expected e
LEFT JOIN existing x ON e.name = x.name
WHERE x.name IS NULL
ORDER BY e.name;
`.trim()
}

/**
 * Generate SQL to check for missing triggers
 */
function generateMissingTriggersQuery(expected: string[]): string {
  const arrayLiteral = expected.map((t) => `'${t}'`).join(',\n    ')
  return `
-- AUDIT: Missing triggers compared to baseline
WITH expected AS (
  SELECT unnest(ARRAY[
    ${arrayLiteral}
  ]) AS name
),
existing AS (
  SELECT tgname AS name FROM pg_trigger WHERE tgisinternal = false
)
SELECT e.name AS missing_trigger
FROM expected e
LEFT JOIN existing x ON e.name = x.name
WHERE x.name IS NULL
ORDER BY e.name;
`.trim()
}

/**
 * Generate SQL to check tables without RLS
 */
function generateRLSAuditQuery(): string {
  return `
-- AUDIT: Tables without RLS enabled
SELECT
  t.tablename,
  CASE WHEN c.relrowsecurity THEN 'Enabled' ELSE 'DISABLED' END as rls_status
FROM pg_tables t
JOIN pg_class c ON c.relname = t.tablename
WHERE t.schemaname = 'public'
  AND NOT c.relrowsecurity
ORDER BY t.tablename;
`.trim()
}

/**
 * Generate summary stats query
 */
function generateSummaryQuery(): string {
  return `
-- AUDIT: Schema summary statistics
SELECT
  'Functions' as object_type,
  COUNT(*) as count
FROM pg_proc WHERE pronamespace = 'public'::regnamespace
UNION ALL
SELECT
  'Tables' as object_type,
  COUNT(*) as count
FROM information_schema.tables WHERE table_schema = 'public'
UNION ALL
SELECT
  'Indexes' as object_type,
  COUNT(*) as count
FROM pg_indexes WHERE schemaname = 'public'
UNION ALL
SELECT
  'Triggers' as object_type,
  COUNT(*) as count
FROM pg_trigger WHERE tgisinternal = false
  AND tgrelid IN (SELECT oid FROM pg_class WHERE relnamespace = 'public'::regnamespace);
`.trim()
}

/**
 * Check if pgcrypto objects exist
 */
function generatePgcryptoCheckQuery(): string {
  return `
-- AUDIT: pgcrypto infrastructure (new token encryption)
-- Table should exist
SELECT EXISTS (
  SELECT 1 FROM information_schema.tables
  WHERE table_schema = 'public' AND table_name = 'encrypted_instagram_tokens'
) AS encrypted_tokens_table_exists;

-- Functions should exist
SELECT proname AS function_name
FROM pg_proc
WHERE pronamespace = 'public'::regnamespace
  AND proname IN ('store_encrypted_token', 'get_decrypted_token', 'delete_encrypted_token');
`.trim()
}

async function main() {
  const args = process.argv.slice(2)
  const showFix = args.includes('--fix')

  console.log('🔍 Database Schema Audit Tool\n')
  console.log(`📄 Extracting expected schema from: ${BASELINE_PATH}\n`)

  const schema = extractFromBaseline()

  console.log('📊 Schema Summary:')
  console.log(`   Functions: ${schema.functions.expected.length}`)
  console.log(`   Tables: ${schema.tables.expected.length}`)
  console.log(`   Indexes: ${schema.indexes.expected.length}`)
  console.log(`   Triggers: ${schema.triggers.expected.length}`)
  console.log('')

  console.log('=' .repeat(80))
  console.log('Run these queries in Supabase SQL Editor to audit your production database:')
  console.log('=' .repeat(80))
  console.log('')

  // Summary stats
  console.log('-- ============================================')
  console.log('-- 1. SUMMARY STATISTICS')
  console.log('-- ============================================')
  console.log(generateSummaryQuery())
  console.log('\n')

  // Search path audit (most critical)
  console.log('-- ============================================')
  console.log('-- 2. CRITICAL: Functions with bad search_path')
  console.log('-- (These cause "relation does not exist" errors)')
  console.log('-- ============================================')
  console.log(schema.functions.badSearchPathQuery)
  console.log('\n')

  // pgcrypto infrastructure
  console.log('-- ============================================')
  console.log('-- 3. pgcrypto Token Infrastructure')
  console.log('-- ============================================')
  console.log(generatePgcryptoCheckQuery())
  console.log('\n')

  // Missing functions
  console.log('-- ============================================')
  console.log('-- 4. Missing Functions')
  console.log('-- ============================================')
  console.log(generateMissingFunctionsQuery(schema.functions.expected))
  console.log('\n')

  // Missing tables
  console.log('-- ============================================')
  console.log('-- 5. Missing Tables')
  console.log('-- ============================================')
  console.log(generateMissingTablesQuery(schema.tables.expected))
  console.log('\n')

  // Missing indexes
  console.log('-- ============================================')
  console.log('-- 6. Missing Indexes')
  console.log('-- ============================================')
  console.log(generateMissingIndexesQuery(schema.indexes.expected))
  console.log('\n')

  // Missing triggers
  console.log('-- ============================================')
  console.log('-- 7. Missing Triggers')
  console.log('-- ============================================')
  console.log(generateMissingTriggersQuery(schema.triggers.expected))
  console.log('\n')

  // RLS audit
  console.log('-- ============================================')
  console.log('-- 8. Tables without RLS')
  console.log('-- ============================================')
  console.log(generateRLSAuditQuery())
  console.log('\n')

  console.log('=' .repeat(80))
  console.log('✅ Copy and run the above queries in Supabase SQL Editor.')
  console.log('')
  console.log('Expected results for a healthy database:')
  console.log('  - Query 2: All functions show "OK" status')
  console.log('  - Query 3: encrypted_tokens_table_exists = true, 3 functions listed')
  console.log('  - Queries 4-7: No rows returned (nothing missing)')
  console.log('  - Query 8: Only system tables without RLS (if any)')
  console.log('')

  if (showFix) {
    console.log('=' .repeat(80))
    console.log('🔧 To fix issues, apply the reconciliation migration:')
    console.log('=' .repeat(80))
    console.log('')
    console.log('  npm run db:push')
    console.log('')
    console.log('This will apply: supabase/migrations/20260111_001_reconcile_schema.sql')
  } else {
    console.log('💡 Run with --fix to see how to fix issues.')
  }
}

main().catch(console.error)
