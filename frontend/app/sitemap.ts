import type { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL || 'https://pillpal.app'
  const now = new Date().toISOString()
  const routes = ['', '/meds', '/caregiver', '/alerts', '/settings', '/login', '/onboarding']
  return routes.map((path) => ({
    url: `${base}${path}`,
    lastModified: now,
  }))
}


