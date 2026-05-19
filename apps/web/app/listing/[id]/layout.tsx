import type { Metadata } from 'next'

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1'
    const res = await fetch(`${apiUrl}/listings/${params.id}`, { next: { revalidate: 3600 } })
    if (!res.ok) return {}
    const listing = await res.json()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cover = listing.media?.find((m: any) => m.isCover) ?? listing.media?.[0]
    const price = listing.priceDaily ? `от ${listing.priceDaily} ₽/день` : ''
    return {
      title: `${listing.title} — аренда в ${listing.city} | Rigs`,
      description: `${listing.description?.slice(0, 155) ?? ''} ${price}`.trim(),
      openGraph: {
        title: listing.title,
        description: listing.description?.slice(0, 155),
        images: cover ? [{ url: cover.url, width: 1200, height: 630 }] : [],
        type: 'website',
      },
      twitter: { card: 'summary_large_image', title: listing.title },
    }
  } catch {
    return {}
  }
}

export default function ListingLayout({ children }: { children: React.ReactNode }) {
  return children
}
