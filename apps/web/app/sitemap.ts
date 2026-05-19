import { MetadataRoute } from 'next'

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://rigs.ru'
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1'

interface Listing {
  id: string
  updatedAt: string
}

interface ListingsResponse {
  data: Listing[]
  total: number
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    { url: `${BASE_URL}/`, lastModified: new Date(), changeFrequency: 'daily', priority: 1.0 },
    { url: `${BASE_URL}/search`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${BASE_URL}/about`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: `${BASE_URL}/help`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: `${BASE_URL}/blog`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.5 },
    { url: `${BASE_URL}/terms`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: `${BASE_URL}/privacy`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
  ]

  let listingEntries: MetadataRoute.Sitemap = []

  try {
    const res = await fetch(`${API_URL}/listings/search?limit=1000&page=1`, {
      next: { revalidate: 3600 },
    })
    if (res.ok) {
      const json = await res.json()
      const listings: Listing[] = Array.isArray(json) ? json : (json as ListingsResponse).data ?? []
      listingEntries = listings.map((listing) => ({
        url: `${BASE_URL}/listing/${listing.id}`,
        lastModified: new Date(listing.updatedAt),
        changeFrequency: 'daily',
        priority: 0.8,
      }))
    }
  } catch {
    // silently skip if API is unavailable during build
  }

  return [...staticPages, ...listingEntries]
}
