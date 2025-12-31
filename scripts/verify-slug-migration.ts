/**
 * Pre-migration Verification Script
 *
 * Verifies that the slug migration is safe to run by:
 * 1. Counting current invalid slugs
 * 2. Simulating new slug generation
 * 3. Detecting potential collisions
 * 4. Estimating migration impact
 *
 * Run this BEFORE applying the database migration to catch issues early.
 *
 * Usage: npx tsx scripts/verify-slug-migration.ts
 */

import * as dotenv from 'dotenv'
import * as path from 'path'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '../types/database.types'
import { generateSlugFromInstagram } from '../lib/utils/slug'

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env.local') })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_KEY)

const SLUG_REGEX = /^[a-z0-9-]+$/

async function verifySlugMigration() {
  console.log('🔍 Slug Migration Pre-Flight Check\n')
  console.log('='.repeat(70))

  // Fetch all artists
  const { data: artists, error } = await supabase
    .from('artists')
    .select('id, slug, instagram_handle, name, city, state')

  if (error || !artists) {
    console.error('❌ Failed to fetch artists:', error)
    return false
  }

  console.log(`\n📊 Total artists: ${artists.length}`)

  // ============================================================================
  // Check 1: Count current invalid slugs
  // ============================================================================
  const invalidSlugs = artists.filter(
    (a) =>
      !SLUG_REGEX.test(a.slug) ||
      a.slug.startsWith('-') ||
      a.slug.endsWith('-') ||
      a.slug.length > 50 ||
      a.slug.length === 0
  )

  console.log(`❌ Currently invalid slugs: ${invalidSlugs.length}`)

  if (invalidSlugs.length > 0) {
    console.log('\n📋 Examples of invalid slugs (first 15):')
    invalidSlugs.slice(0, 15).forEach((a, i) => {
      const issues: string[] = []
      if (!SLUG_REGEX.test(a.slug)) issues.push('invalid chars')
      if (a.slug.startsWith('-')) issues.push('starts with hyphen')
      if (a.slug.endsWith('-')) issues.push('ends with hyphen')
      if (a.slug.length > 50) issues.push(`too long (${a.slug.length})`)
      if (a.slug.length === 0) issues.push('empty')

      console.log(`  ${i + 1}. "${a.slug}" (@${a.instagram_handle})`)
      console.log(`     Issues: ${issues.join(', ')}`)
    })
    if (invalidSlugs.length > 15) {
      console.log(`  ... and ${invalidSlugs.length - 15} more`)
    }
  }

  // ============================================================================
  // Check 2: Simulate new slug generation
  // ============================================================================
  console.log('\n🔄 Simulating new slug generation...')
  const newSlugMap = new Map<string, string[]>()
  const errors: { handle: string; error: string }[] = []

  for (const artist of artists) {
    try {
      const newSlug = generateSlugFromInstagram(artist.instagram_handle)

      if (!newSlugMap.has(newSlug)) {
        newSlugMap.set(newSlug, [])
      }
      newSlugMap.get(newSlug)!.push(artist.instagram_handle)
    } catch (err: any) {
      errors.push({
        handle: artist.instagram_handle,
        error: err.message
      })
    }
  }

  console.log(`✅ Unique new slugs: ${newSlugMap.size}`)

  // ============================================================================
  // Check 3: Detect slug collisions
  // ============================================================================
  const collisions = Array.from(newSlugMap.entries()).filter(
    ([_, handles]) => handles.length > 1
  )

  console.log(`⚠️  Slug collisions: ${collisions.length}`)

  if (collisions.length > 0) {
    console.log('\n⚠️  COLLISION ALERT:')
    console.log('='.repeat(70))
    collisions.forEach(([slug, handles]) => {
      console.log(`\n  Slug: "${slug}" (${handles.length} artists)`)
      handles.forEach((h, i) => console.log(`    ${i + 1}. @${h}`))
    })
    console.log('\n❌ Migration BLOCKED: Resolve collisions manually.')
    console.log('   Suggestion: Add numeric suffix to one of the handles\n')
    return false
  }

  // ============================================================================
  // Check 4: Slug generation errors
  // ============================================================================
  if (errors.length > 0) {
    console.log(`\n❌ Slug generation errors: ${errors.length}`)
    console.log('='.repeat(70))
    errors.slice(0, 10).forEach(({ handle, error }, i) => {
      console.log(`  ${i + 1}. @${handle}`)
      console.log(`     Error: ${error}`)
    })
    if (errors.length > 10) {
      console.log(`  ... and ${errors.length - 10} more`)
    }
    console.log('\n❌ Migration BLOCKED: Fix invalid handles.')
    return false
  }

  // ============================================================================
  // Check 5: Calculate impact
  // ============================================================================
  let changedCount = 0
  const examples: { old: string; new: string; handle: string }[] = []

  for (const artist of artists) {
    const newSlug = generateSlugFromInstagram(artist.instagram_handle)
    if (newSlug !== artist.slug) {
      changedCount++
      if (examples.length < 10) {
        examples.push({
          old: artist.slug,
          new: newSlug,
          handle: artist.instagram_handle
        })
      }
    }
  }

  console.log(`\n📝 Impact Summary:`)
  console.log('='.repeat(70))
  console.log(`   Total artists:     ${artists.length}`)
  console.log(`   Slugs to change:   ${changedCount}`)
  console.log(`   Slugs unchanged:   ${artists.length - changedCount}`)
  console.log(`   Invalid → Valid:   ${invalidSlugs.length}`)

  if (examples.length > 0) {
    console.log(`\n📋 Example slug changes (first 10):`)
    examples.forEach(({ old, new: newSlug, handle }, i) => {
      console.log(`  ${i + 1}. @${handle}`)
      console.log(`     Old: "${old}"`)
      console.log(`     New: "${newSlug}"`)
    })
  }

  // ============================================================================
  // Final verdict
  // ============================================================================
  console.log('\n' + '='.repeat(70))
  console.log('✅ PRE-FLIGHT CHECK PASSED')
  console.log('='.repeat(70))
  console.log('\n💡 Migration is SAFE to run.')
  console.log('   - No slug collisions detected')
  console.log('   - All new slugs pass validation')
  console.log(`   - Will fix ${invalidSlugs.length} invalid slugs`)
  console.log(`   - Will update ${changedCount}/${artists.length} total slugs`)

  return true
}

// ============================================================================
// Main execution
// ============================================================================
console.log('╔══════════════════════════════════════════════════════════════════════╗')
console.log('║  SLUG MIGRATION VERIFICATION                                         ║')
console.log('║  Checking safety before running database migration                  ║')
console.log('╚══════════════════════════════════════════════════════════════════════╝\n')

verifySlugMigration()
  .then((passed) => {
    if (passed) {
      console.log('\n📋 Next steps:')
      console.log('   1. Run migration: npx supabase db push')
      console.log('   2. Update discovery scripts')
      console.log('   3. Rebuild Next.js: npm run build')
      console.log('   4. Deploy to production\n')
      process.exit(0)
    } else {
      console.log('\n🛑 Migration blocked. Fix issues above before proceeding.\n')
      process.exit(1)
    }
  })
  .catch((err) => {
    console.error('\n💥 Unexpected error:', err)
    process.exit(1)
  })
