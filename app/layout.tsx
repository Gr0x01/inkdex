import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { Playfair_Display, Libre_Baskerville, JetBrains_Mono, Crimson_Pro } from 'next/font/google'
import './globals.css'
import ConditionalLayout from '@/components/layout/ConditionalLayout'
import { Analytics } from '@vercel/analytics/next'
import { GoogleAnalytics } from '@/components/analytics/GoogleAnalytics'
import { PostHogProvider } from '@/components/analytics/PostHogProvider'
import { PostHogPageView } from '@/components/analytics/PostHogPageView'
import { GeoHydrator } from '@/components/analytics/GeoHydrator'

// Supabase project URL for preconnect
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL

// Font configurations for "Inkdex" design system
// Optimized: reduced weights to minimize font file downloads
const playfairDisplay = Playfair_Display({
  subsets: ['latin'],
  weight: ['900'],
  variable: '--font-playfair',
  display: 'swap',
})

const libreBaskerville = Libre_Baskerville({
  subsets: ['latin'],
  weight: ['700'],
  variable: '--font-libre-baskerville',
  display: 'swap',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['200', '400', '500'],  // Reduced from 6 weights to 3 (200 used by .font-mono)
  variable: '--font-jetbrains-mono',
  display: 'swap',
})

const crimsonPro = Crimson_Pro({
  subsets: ['latin'],
  weight: ['300', '400', '600'],  // Keep 300 (used by body text)
  variable: '--font-crimson-pro',
  display: 'swap',
})

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
  title: 'Inkdex - Find Your Tattoo Artist',
  description: 'Discover tattoo artists through visual search and natural language. No tattoo terminology required - upload an image or describe your vision.',
  openGraph: {
    title: 'Inkdex - Find Your Tattoo Artist',
    description: 'Discover tattoo artists through visual search and natural language. No tattoo terminology required - upload an image or describe your vision.',
    type: 'website',
    siteName: 'Inkdex',
    // OG image generated dynamically by app/opengraph-image.tsx
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Inkdex - Find Your Tattoo Artist',
    description: 'Discover tattoo artists through visual search and natural language. No tattoo terminology required - upload an image or describe your vision.',
    // Twitter image generated dynamically by app/opengraph-image.tsx
  },
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Read geo header from Vercel edge (available on every request)
  const headersList = await headers()
  const country = headersList.get('x-vercel-ip-country') || ''

  return (
    <html
      lang="en"
      className={`${playfairDisplay.variable} ${libreBaskerville.variable} ${jetbrainsMono.variable} ${crimsonPro.variable}`}
    >
      <head>
        {/* Preload hero image for faster LCP */}
        <link rel="preload" as="image" href="/images/hero-poster.webp" type="image/webp" fetchPriority="high" />
        {/* Preconnect to Supabase for faster API/image requests */}
        {SUPABASE_URL && (
          <>
            <link rel="preconnect" href={SUPABASE_URL} crossOrigin="anonymous" />
            <link rel="dns-prefetch" href={SUPABASE_URL} />
          </>
        )}
      </head>
      <body className="">
        <PostHogProvider>
          <GeoHydrator country={country} />
          <PostHogPageView />
          <ConditionalLayout>
            {children}
          </ConditionalLayout>
          <Analytics />
          <GoogleAnalytics />
        </PostHogProvider>
      </body>
    </html>
  )
}
