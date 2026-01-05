import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { isAdminEmail } from '@/lib/admin/whitelist'
import { checkRateLimit } from '@/lib/redis/rate-limiter'
import { submitToIndexNow, getRecentSubmissions } from '@/lib/seo/indexnow'
import { logAdminAction, getClientInfo } from '@/lib/admin/audit-log'
import { z } from 'zod'

// Rate limits per admin per hour
const RATE_LIMIT_SUBMISSIONS = 20  // POST: 20 submissions/hour
const RATE_LIMIT_READS = 100       // GET: 100 reads/hour
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000 // 1 hour

const submitSchema = z.object({
  urls: z.array(z.string().url()).min(1).max(10000),
  engine: z.enum(['bing', 'yandex', 'all']).default('all'),
})

/**
 * POST /api/seo/indexnow
 * Submit URLs to IndexNow (admin only)
 */
export async function POST(request: Request) {
  // CSRF protection
  const origin = request.headers.get('origin')
  const host = request.headers.get('host')
  if (origin && host && !origin.includes(host.split(':')[0])) {
    return NextResponse.json({ error: 'Invalid origin' }, { status: 403 })
  }

  // Verify admin access
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user || !isAdminEmail(user.email)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Rate limiting
  const rateLimitKey = `indexnow-submit:${user.email}`
  const rateLimitResult = await checkRateLimit(
    rateLimitKey,
    RATE_LIMIT_SUBMISSIONS,
    RATE_LIMIT_WINDOW_MS
  )

  if (!rateLimitResult.success) {
    return NextResponse.json(
      {
        error: `Rate limit exceeded. You can submit ${RATE_LIMIT_SUBMISSIONS} times per hour.`,
        remaining: rateLimitResult.remaining,
        reset: rateLimitResult.reset,
      },
      { status: 429 }
    )
  }

  try {
    const body = await request.json()
    const { urls, engine } = submitSchema.parse(body)

    // Submit to IndexNow
    const results = await submitToIndexNow(
      urls,
      engine,
      'admin_manual',
      user.email || undefined
    )

    // Audit log
    const clientInfo = getClientInfo(request)
    await logAdminAction({
      adminEmail: user.email || 'unknown',
      action: 'seo.indexnow_submit',
      resourceType: 'indexnow',
      resourceId: 'manual-submission',
      newValue: { urlCount: urls.length, engine },
      ...clientInfo,
    })

    const allSuccessful = results.every((r) => r.success)

    return NextResponse.json({
      success: allSuccessful,
      results,
      urlCount: urls.length,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0]?.message || 'Invalid request' },
        { status: 400 }
      )
    }

    console.error('[IndexNow API] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Submission failed' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/seo/indexnow
 * Get recent submissions and stats (admin only)
 */
export async function GET(request: Request) {
  // Verify admin access
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user || !isAdminEmail(user.email)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Rate limiting for GET requests
  const rateLimitKey = `indexnow-get:${user.email}`
  const rateLimitResult = await checkRateLimit(
    rateLimitKey,
    RATE_LIMIT_READS,
    RATE_LIMIT_WINDOW_MS
  )

  if (!rateLimitResult.success) {
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      { status: 429 }
    )
  }

  try {
    const url = new URL(request.url)
    const limitParam = url.searchParams.get('limit')

    // Validate and bound the limit parameter
    let limit = 20
    if (limitParam) {
      const parsed = parseInt(limitParam, 10)
      if (isNaN(parsed) || parsed < 1) {
        return NextResponse.json(
          { error: 'Invalid limit parameter' },
          { status: 400 }
        )
      }
      limit = Math.min(Math.max(parsed, 1), 100) // Bound between 1 and 100
    }

    const data = await getRecentSubmissions(limit)

    return NextResponse.json(data)
  } catch (error) {
    console.error('[IndexNow API] Error fetching submissions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch submissions' },
      { status: 500 }
    )
  }
}
