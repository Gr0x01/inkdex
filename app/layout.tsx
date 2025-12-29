import type { Metadata } from 'next'
import { Space_Grotesk, JetBrains_Mono, Crimson_Pro } from 'next/font/google'
import './globals.css'

// Font configurations
const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['700'],
  variable: '--font-space-grotesk',
  display: 'swap',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
})

const crimsonPro = Crimson_Pro({
  subsets: ['latin'],
  weight: ['200', '300'],
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
      className={`${spaceGrotesk.variable} ${jetbrainsMono.variable} ${crimsonPro.variable}`}
    >
      <body>{children}</body>
    </html>
  )
}
