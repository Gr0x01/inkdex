import { NextResponse } from 'next/server';

/**
 * Warmup endpoint to pre-heat Modal.com GPU container
 *
 * Called on homepage load to reduce latency for actual searches.
 * Triggers Modal container startup with a lightweight text embedding.
 *
 * Cost: ~$0.001 per call (0.3s GPU time)
 * Benefit: First user search is 2-5s instead of 25s
 *
 * Disable via NEXT_PUBLIC_ENABLE_WARMUP=false when you have enough traffic
 * to keep containers naturally warm.
 */

// Rate limiting: max 1 warmup per IP per minute
const WARMUP_COOLDOWN_MS = 60000;
const lastWarmupTime = new Map<string, number>();

export async function POST(request: Request) {
  try {
    // Rate limiting
    const ip = request.headers.get('x-forwarded-for') ||
               request.headers.get('x-real-ip') ||
               'unknown';

    const now = Date.now();
    const lastTime = lastWarmupTime.get(ip);

    if (lastTime && now - lastTime < WARMUP_COOLDOWN_MS) {
      console.log(`⏱️  Warmup cooldown for ${ip}, skipping`);
      return NextResponse.json({
        success: false,
        message: 'Warmup on cooldown'
      }, {
        status: 200,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        }
      });
    }

    lastWarmupTime.set(ip, now);

    // Clean up old entries (prevent memory leak)
    if (lastWarmupTime.size > 1000) {
      const cutoff = now - WARMUP_COOLDOWN_MS;
      for (const [key, time] of lastWarmupTime.entries()) {
        if (time < cutoff) lastWarmupTime.delete(key);
      }
    }

    // Get Modal function URL from environment
    const modalUrl = process.env.MODAL_FUNCTION_URL;

    if (!modalUrl) {
      console.warn('⚠️  MODAL_FUNCTION_URL not set, skipping warmup');
      return NextResponse.json({
        success: false,
        message: 'Modal URL not configured'
      }, {
        status: 200,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        }
      });
    }

    // Validate Modal URL to prevent SSRF
    try {
      const url = new URL(modalUrl);

      // Whitelist only Modal.com domains
      if (!url.hostname.endsWith('.modal.run')) {
        console.error('❌ Invalid Modal URL domain:', url.hostname);
        return NextResponse.json({
          success: false,
          message: 'Invalid Modal URL configuration'
        }, {
          status: 200,
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate',
          }
        });
      }

      // Ensure HTTPS only
      if (url.protocol !== 'https:') {
        console.error('❌ Modal URL must use HTTPS');
        return NextResponse.json({
          success: false,
          message: 'Invalid Modal URL protocol'
        }, {
          status: 200,
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate',
          }
        });
      }
    } catch (err) {
      console.error('❌ Invalid Modal URL format:', err);
      return NextResponse.json({
        success: false,
        message: 'Invalid Modal URL configuration'
      }, {
        status: 200,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        }
      });
    }

    // Fire-and-forget warmup request
    // Use a simple text embedding (cheapest operation, ~300ms GPU time)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);
    const startTime = Date.now();

    const warmupPromise = fetch(`${modalUrl}/generate_text_query_embedding`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: 'warmup' }),
      signal: controller.signal,
    }).finally(() => clearTimeout(timeoutId));

    // Don't await - let it warm in background
    warmupPromise
      .then(() => {
        const duration = Date.now() - startTime;
        console.log(`🔥 Modal container warmed in ${duration}ms`);
      })
      .catch((err) => {
        const duration = Date.now() - startTime;
        console.warn(`⚠️  Warmup failed after ${duration}ms (non-critical):`, err.message);
      });

    // Return immediately
    return NextResponse.json({
      success: true,
      message: 'Warmup triggered'
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      }
    });

  } catch (error) {
    // Warmup failures are non-critical, don't surface to user
    console.warn('⚠️  Warmup error (non-critical):', error);
    return NextResponse.json({
      success: false,
      message: 'Warmup failed'
    }, {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      }
    });
  }
}
