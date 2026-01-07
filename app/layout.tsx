import type { Metadata } from 'next'
import { Playfair_Display, Libre_Baskerville, JetBrains_Mono, Crimson_Pro, Space_Grotesk } from 'next/font/google'
import './globals.css'
import ConditionalLayout from '@/components/layout/ConditionalLayout'
import { Analytics } from '@vercel/analytics/next'
import { GoogleAnalytics } from '@/components/analytics/GoogleAnalytics'

// Font configurations for "Inkdex" design system
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
  weight: ['100', '200', '300', '400', '500', '600'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
})

const crimsonPro = Crimson_Pro({
  subsets: ['latin'],
  weight: ['300', '400', '600'],
  style: ['normal', 'italic'],
  variable: '--font-crimson-pro',
  display: 'swap',
})

// Admin-specific font
const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-space-grotesk',
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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html
      lang="en"
      className={`${playfairDisplay.variable} ${libreBaskerville.variable} ${jetbrainsMono.variable} ${crimsonPro.variable} ${spaceGrotesk.variable}`}
    >
      <body className="">
        <ConditionalLayout>
          {children}
        </ConditionalLayout>
        <Analytics />
        <GoogleAnalytics />
      </body>
    </html>
  )
}
