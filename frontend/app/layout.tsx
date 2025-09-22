// Root layout must be a server component for metadata export
import type React from "react"
import type { Metadata } from "next"
import { Inter, Plus_Jakarta_Sans } from "next/font/google"
// import { Analytics } from "@vercel/analytics/next"
import "./globals.css"
import { MotionProvider } from "@/components/motion-provider"
import { ThemeProvider } from "@/components/theme-provider"
import ClientToaster from "@/app/client-toaster"
import { Suspense } from "react"
// Auth0Provider is a Client Component; wrap it behind a client boundary component
import ClientProviders from "@/app/providers"

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
  title: "PillPal - Medication Assistant",
  description: "Premium, calm medication tracking with voice assistance",
  viewport: "width=device-width, initial-scale=1, viewport-fit=cover",
  themeColor: "#0B1220",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/icon-192.jpg", sizes: "192x192", type: "image/jpeg" },
      { url: "/icon-512.jpg", sizes: "512x512", type: "image/jpeg" },
    ],
    apple: "/icon-192.jpg",
  },
  openGraph: {
    title: "PillPal",
    description: "Medication reminders and tracking with a calm, voice-first experience",
    url: "https://pillpal.app",
    siteName: "PillPal",
    images: [
      { url: "/icon-512.jpg", width: 512, height: 512 },
    ],
    locale: "en_US",
    type: "website",
  },
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
        <meta name="theme-color" content="#0B1220" media="(prefers-color-scheme: dark)" />
        <meta name="theme-color" content="#F9FAFB" media="(prefers-color-scheme: light)" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function () {
                const c = document.documentElement.classList;
                const stored = localStorage.getItem('theme');
                if (stored === 'dark' || (!stored && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                  c.add('dark');
                } else {
                  c.remove('dark');
                }
              })();
            `,
          }}
        />
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
        <ClientProviders>
          <Suspense fallback={<div>Loading...</div>}>
            <ThemeProvider>
              <MotionProvider>
                {children}
                <ClientToaster />
              </MotionProvider>
            </ThemeProvider>
          </Suspense>
        </ClientProviders>
        {/* <Analytics /> */}
      </body>
    </html>
  )
}
