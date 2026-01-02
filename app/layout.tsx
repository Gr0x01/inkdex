import type { Metadata } from 'next'
import { Playfair_Display, Libre_Baskerville, JetBrains_Mono, Crimson_Pro } from 'next/font/google'
import './globals.css'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import { SearchProvider } from '@/components/search/SearchProvider'
import GlobalSearchModal from '@/components/search/GlobalSearchModal'
import { Analytics } from '@vercel/analytics/next'
import { GoogleAnalytics } from '@/components/analytics/GoogleAnalytics'
import { CookieBanner } from '@/components/consent/CookieBanner'

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
  weight: ['100', '200', '300', '400', '500'],
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

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
  title: 'Inkdex - Find Your Tattoo Artist',
  description: 'Discover tattoo artists through visual search and natural language. No tattoo terminology required - upload an image or describe your vision.',
  openGraph: {
    title: 'Inkdex - Find Your Tattoo Artist',
    description: 'Discover tattoo artists through visual search and natural language. No tattoo terminology required - upload an image or describe your vision.',
    type: 'website',
    siteName: 'Inkdex',
    images: [
      {
        url: '/og-default.jpg', // TODO: Create homepage OG image
        width: 1200,
        height: 630,
        alt: 'Inkdex - Find artists by visual search',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Inkdex - Find Your Tattoo Artist',
    description: 'Discover tattoo artists through visual search and natural language. No tattoo terminology required - upload an image or describe your vision.',
    images: ['/og-default.jpg'],
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
      className={`${playfairDisplay.variable} ${libreBaskerville.variable} ${jetbrainsMono.variable} ${crimsonPro.variable}`}
    >
      <body className="">
        <SearchProvider>
          <Navbar />
          <GlobalSearchModal />
          {children}
          <Footer />
          <Analytics />
          <GoogleAnalytics />
          <CookieBanner />
        </SearchProvider>
      </body>
    </html>
  )
}
