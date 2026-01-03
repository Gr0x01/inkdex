import { NextResponse } from 'next/server';

interface HealthCheckResult {
  url: string;
  status: 'healthy' | 'unhealthy';
  response_time_ms?: number;
  details?: Record<string, unknown>;
  error?: string;
}

interface HealthResponse {
  local: HealthCheckResult;
  modal: HealthCheckResult;
  config: {
    preferLocal: boolean;
    localTimeout: string;
    fallbackEnabled: boolean;
  };
  timestamp: string;
}

async function checkHealth(url: string | undefined, apiKey: string | undefined, timeout: number = 2000): Promise<HealthCheckResult> {
  if (!url) {
    return {
      url: 'not configured',
      status: 'unhealthy',
      error: 'URL not configured'
    };
  }

  // Validate URL scheme and domain (prevent SSRF)
  try {
    const parsedUrl = new URL(url);
    const allowedDomains = ['clip.inkdex.io', 'modal.run'];
    const isAllowed = allowedDomains.some(domain =>
      parsedUrl.hostname === domain || parsedUrl.hostname.endsWith('.' + domain)
    );

    if (!isAllowed || !['https:', 'http:'].includes(parsedUrl.protocol)) {
      return {
        url,
        status: 'unhealthy',
        error: 'Invalid URL: domain not in allowlist or invalid protocol'
      };
    }
  } catch (_e) {
    return {
      url,
      status: 'unhealthy',
      error: 'Invalid URL format'
    };
  }

  const startTime = Date.now();

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const headers: HeadersInit = {};
    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

    const response = await fetch(`${url}/health`, {
      headers,
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    const responseTime = Date.now() - startTime;

    if (response.ok) {
      const data = await response.json();

      // Check if GPU is available (for services that report it)
      const isHealthy = data.status === 'ok' && data.gpu_available !== false;

      return {
        url,
        status: isHealthy ? 'healthy' : 'unhealthy',
        response_time_ms: responseTime,
        details: {
          gpu_available: data.gpu_available,
          model_loaded: data.model_loaded,
          model_name: data.model_name,
          embedding_dim: data.embedding_dim,
          device: data.device
        }
      };
    } else {
      return {
        url,
        status: 'unhealthy',
        response_time_ms: responseTime,
        error: `HTTP ${response.status}: ${response.statusText}`
      };
    }
  } catch (error) {
    const responseTime = Date.now() - startTime;

    return {
      url,
      status: 'unhealthy',
      response_time_ms: responseTime,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * GET /api/embeddings/health
 *
 * Check health status of both local GPU and Modal.com embedding services
 *
 * Usage:
 *   curl https://inkdex.io/api/embeddings/health | jq .
 */
export async function GET() {
  const localUrl = process.env.LOCAL_CLIP_URL;
  const localApiKey = process.env.CLIP_API_KEY;
  const modalUrl = process.env.MODAL_FUNCTION_URL;

  // Check both services in parallel
  const [localHealth, modalHealth] = await Promise.all([
    checkHealth(localUrl, localApiKey),
    checkHealth(modalUrl, undefined)
  ]);

  const response: HealthResponse = {
    local: localHealth,
    modal: modalHealth,
    config: {
      preferLocal: process.env.PREFER_LOCAL_CLIP !== 'false',
      localTimeout: process.env.LOCAL_CLIP_TIMEOUT || '5000',
      fallbackEnabled: process.env.ENABLE_MODAL_FALLBACK !== 'false'
    },
    timestamp: new Date().toISOString()
  };

  // Return 200 if at least one service is healthy
  // Return 503 if both are unhealthy
  const isAnyHealthy = localHealth.status === 'healthy' || modalHealth.status === 'healthy';
  const statusCode = isAnyHealthy ? 200 : 503;

  return NextResponse.json(response, {
    status: statusCode,
    headers: {
      'Cache-Control': 'no-store'
    }
  });
}
