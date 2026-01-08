import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isAdminEmail } from '@/lib/admin/whitelist'
import {
  isMaintenanceMode,
  enableMaintenanceMode,
  disableMaintenanceMode,
} from '@/lib/redis/maintenance'

/**
 * GET /api/admin/maintenance
 * Check current maintenance mode status
 */
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user || !isAdminEmail(user.email)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const enabled = await isMaintenanceMode()
    return NextResponse.json({ enabled })
  } catch (error) {
    console.error('[API] Maintenance status error:', error)
    return NextResponse.json({ error: 'Failed to check status' }, { status: 500 })
  }
}

/**
 * POST /api/admin/maintenance
 * Toggle maintenance mode
 * Body: { enabled: boolean }
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user || !isAdminEmail(user.email)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { enabled } = body

    if (typeof enabled !== 'boolean') {
      return NextResponse.json({ error: 'enabled must be a boolean' }, { status: 400 })
    }

    const success = enabled
      ? await enableMaintenanceMode()
      : await disableMaintenanceMode()

    if (!success) {
      return NextResponse.json({ error: 'Failed to update maintenance mode' }, { status: 500 })
    }

    console.log(`[Admin] Maintenance mode ${enabled ? 'ENABLED' : 'DISABLED'} by ${user.email}`)

    return NextResponse.json({ enabled, success: true })
  } catch (error) {
    console.error('[API] Maintenance toggle error:', error)
    return NextResponse.json({ error: 'Failed to toggle maintenance mode' }, { status: 500 })
  }
}
