import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Tattoo Artist Discovery',
  description: 'Find tattoo artists through visual search and natural language',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
