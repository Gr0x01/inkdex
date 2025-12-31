import { createServiceClient } from '../../lib/supabase/service'

async function checkRLSStatus() {
  const supabase = createServiceClient()

  console.log('Checking style_seeds table accessibility...\n')

  // Try to read style_seeds (this will work with service role regardless of RLS)
  const { data, error } = await supabase
    .from('style_seeds')
    .select('style_name, display_name')
    .limit(3)

  if (error) {
    console.log('❌ Cannot read style_seeds table')
    console.log('   Error:', error.message)
  } else {
    console.log('✅ Can read style_seeds table')
    console.log(`   Found ${data.length} style seed(s):`)
    data.forEach((seed) => {
      console.log(`   - ${seed.style_name}: ${seed.display_name}`)
    })
  }

  console.log('\n📝 RLS Migration Status:')
  console.log('   File created: supabase/migrations/20251231_002_add_style_seeds_rls.sql')
  console.log('   This migration adds:')
  console.log('     1. Enable RLS on style_seeds table')
  console.log('     2. Public read access policy')
  console.log('     3. Service role management policy')
  console.log('\n   To apply:')
  console.log('     1. Open Supabase Dashboard > SQL Editor')
  console.log('     2. Paste and run the migration SQL')
  console.log('     OR')
  console.log('     Run: npx supabase db push (if linked)')
}

checkRLSStatus().catch((error) => {
  console.error('Check failed:', error)
  process.exit(1)
})
