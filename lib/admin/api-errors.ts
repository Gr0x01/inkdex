/**
 * Standardized Admin API Error Responses
 *
 * Provides consistent error formatting across all admin API endpoints.
 */

import { NextResponse } from 'next/server';

interface ErrorResponse {
  error: string;
  message: string;
  timestamp: string;
  details?: unknown;
}

function createErrorResponse(
  errorCode: string,
  message: string,
  status: number,
  details?: unknown
): NextResponse<ErrorResponse> {
  const response = NextResponse.json(
    {
      error: errorCode,
      message,
      timestamp: new Date().toISOString(),
      // Only include details in development
      ...(process.env.NODE_ENV === 'development' && details ? { details } : {}),
    },
    { status }
  );

  // Prevent caching of error responses
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');

  return response;
}

export const AdminApiError = {
  unauthorized(message = 'Unauthorized access') {
    return createErrorResponse('unauthorized', message, 401);
  },

  forbidden(message = 'Access forbidden') {
    return createErrorResponse('forbidden', message, 403);
  },

  badRequest(message: string, details?: unknown) {
    return createErrorResponse('bad_request', message, 400, details);
  },

  notFound(message = 'Resource not found') {
    return createErrorResponse('not_found', message, 404);
  },

  rateLimited(message = 'Too many requests. Please try again later.') {
    return createErrorResponse('rate_limited', message, 429);
  },

  unsupportedMediaType(message = 'Content-Type must be application/json') {
    return createErrorResponse('unsupported_media_type', message, 415);
  },

  internalError(message = 'Internal server error', error?: unknown) {
    // Log the actual error server-side but don't expose details
    if (error) {
      console.error('[Admin API] Internal error:', error);
    }
    return createErrorResponse('internal_error', message, 500);
  },
};

/**
 * Create a successful JSON response with standard headers
 */
export function createAdminResponse<T>(data: T, status = 200): NextResponse<T> {
  const response = NextResponse.json(data, { status });
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  return response;
}
