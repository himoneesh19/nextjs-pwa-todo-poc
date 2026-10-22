import type { Metadata, Viewport } from 'next'
import './globals.css'

export const viewport: Viewport = {
  themeColor: '#1e293b',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
}

export const metadata: Metadata = {
  title: 'YHD Tasks | PWA Proof of Concept',
  description: 'Minimal To-Do CRUD demonstrating Next.js 14 PWA capabilities and OS badging',
  applicationName: 'YHD Tasks',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'YHD Tasks',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="bg-slate-900 text-slate-100 min-h-screen antialiased">
        {children}
      </body>
    </html>
  )
}
