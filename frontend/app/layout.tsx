'use client'
import type React from "react"
import type { Metadata } from "next"
import { Inter, Plus_Jakarta_Sans } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import "./globals.css"
import { MotionProvider } from "@/components/motion-provider"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/toaster"
import { Suspense } from "react"
import { Auth0Provider } from "@auth0/nextjs-auth0"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
})

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-heading",
  display: "swap",
})

export const metadata: Metadata = {
  title: "MedTime - Voice-First Medication Management",
  description: "Premium, calm medication tracking with voice assistance",
  generator: "v0.app",
  viewport: "width=device-width, initial-scale=1, viewport-fit=cover",
  themeColor: "#0D0D0D",
  manifest: "/manifest.json",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${plusJakarta.variable}`} suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content="#0D0D0D" media="(prefers-color-scheme: dark)" />
        <meta name="theme-color" content="#F9FAFB" media="(prefers-color-scheme: light)" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', () => {
                  navigator.serviceWorker.register('/sw.js')
                    .then((registration) => {
                      console.log('[PWA] Service worker registered:', registration.scope)
                    })
                    .catch((error) => {
                      console.error('[PWA] Service worker registration failed:', error)
                    })
                })
              }
            `,
          }}
        />
      </head>
      <body className="font-sans antialiased min-h-screen">
        <Auth0Provider>
          <Suspense fallback={null}>
            <ThemeProvider>
              <MotionProvider>
                {children}
                <Toaster />
              </MotionProvider>
            </ThemeProvider>
          </Suspense>
        </Auth0Provider>
        <Analytics />
      </body>
    </html>
  )
}
