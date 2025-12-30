import type { Metadata } from 'next'
import { Playfair_Display, Libre_Baskerville, JetBrains_Mono, Crimson_Pro } from 'next/font/google'
import './globals.css'
import Navbar from '@/components/layout/Navbar'
import { SearchProvider } from '@/components/search/SearchProvider'
import GlobalSearchModal from '@/components/search/GlobalSearchModal'
import SearchFAB from '@/components/search/SearchFAB'

// Font configurations for "PAPER & INK" design system
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
  title: 'Find Your Tattoo Artist by Vibe',
  description: 'Discover tattoo artists through visual search and natural language. No tattoo terminology required - upload an image or describe your vision.',
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
      <body>
        <SearchProvider>
          <Navbar />
          <GlobalSearchModal />
          {children}
          <SearchFAB />
        </SearchProvider>
      </body>
    </html>
  )
}
