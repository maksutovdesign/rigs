import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { ListingCard } from '@/components/listings/listing-card'
import type { Listing } from '@rigs/types'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

async function getPopularListings(): Promise<Listing[]> {
  try {
    const res = await fetch(`${API_URL}/listings?sort=popular&limit=8&status=active`, {
      next: { revalidate: 300 },
    })
    if (!res.ok) return []
    const data = await res.json()
    return (data.items as Listing[]) ?? []
  } catch {
    return []
  }
}

export async function FeaturedListings() {
  const listings = await getPopularListings()
  if (listings.length === 0) return null

  return (
    <section className="section">
      <div className="container">
        {/* Section header */}
        <div className="flex items-end justify-between mb-8">
          <div>
            <p className="text-sm font-medium text-brand-600 mb-1">Выбор сообщества</p>
            <h2 className="text-2xl font-bold text-neutral-900 md:text-3xl">
              Популярное прямо сейчас
            </h2>
          </div>
          <Link
            href="/search?sort=popular"
            className="hidden sm:flex items-center gap-1.5 text-sm font-medium text-neutral-500 hover:text-neutral-900 transition-colors group"
          >
            Смотреть все
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>

        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          {listings.map((listing) => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </div>

        {/* Mobile "all" link */}
        <div className="mt-6 text-center sm:hidden">
          <Link href="/search?sort=popular" className="btn-outline btn">
            Смотреть все
          </Link>
        </div>
      </div>
    </section>
  )
}
