/** @type {import('next').NextConfig} */
const nextConfig = {
  // Required for PostHog reverse proxy (API paths use trailing slashes)
  skipTrailingSlashRedirect: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
      {
        protocol: 'https',
        hostname: '**.r2.cloudflarestorage.com',
      },
      {
        protocol: 'https',
        hostname: 'cdninstagram.com',
      },
      {
        protocol: 'https',
        hostname: '**.cdninstagram.com',
      },
      {
        protocol: 'https',
        hostname: '**.fbcdn.net',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'placehold.co',
      },
      {
        protocol: 'http',
        hostname: '127.0.0.1',
      },
    ],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains',
          },
        ],
      },
    ]
  },
  async redirects() {
    return [
      // www to non-www redirect (308 permanent)
      // Fixes "Alternate page with proper canonical tag" issue in GSC
      {
        source: '/:path*',
        has: [
          {
            type: 'host',
            value: 'www.inkdex.io',
          },
        ],
        destination: 'https://inkdex.io/:path*',
        permanent: true,
      },
    ]
  },
  // PostHog reverse proxy moved to app/ingest/[[...path]]/route.ts
  // Route handler allows explicit IP forwarding (rewrites don't forward X-Forwarded-For correctly)
}

module.exports = nextConfig
