#!/usr/bin/env npx tsx
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })
dotenv.config()

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function main() {
  const { count: total } = await sb
    .from('portfolio_images')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'active')

  const { count: analyzed } = await sb
    .from('portfolio_images')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'active')
    .not('is_color', 'is', null)

  const { count: pending } = await sb
    .from('portfolio_images')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'active')
    .is('is_color', null)

  const { count: withThumbs } = await sb
    .from('portfolio_images')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'active')
    .is('is_color', null)
    .or('storage_thumb_320.not.is.null,storage_thumb_640.not.is.null')

  console.log('='.repeat(40))
  console.log('Color Analysis Status')
  console.log('='.repeat(40))
  console.log('Total active images:', total)
  console.log('Analyzed (is_color set):', analyzed)
  console.log('Pending (is_color null):', pending)
  console.log('Pending WITH thumbnails:', withThumbs)
  console.log('')
  console.log('Note: Images without thumbnails cannot be analyzed.')
}

main().catch(console.error)
