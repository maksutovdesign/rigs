'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Heart } from 'lucide-react'
import { useAuthStore } from '@/store/auth.store'
import { ListingCard } from '@/components/listings/listing-card'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { Listing } from '@rigs/types'

const WISHLIST_KEY = 'rigs_wishlist'

function useWishlist() {
  return useQuery<Listing[]>({
    queryKey: ['wishlist'],
    queryFn: async () => {
      // Try server wishlist first
      try {
        const { data } = await api.get<Listing[]>('/users/wishlist')
        return data
      } catch {
        // Fall back to local storage
        const ids: string[] = JSON.parse(localStorage.getItem(WISHLIST_KEY) ?? '[]')
        if (ids.length === 0) return []
        const results = await Promise.allSettled(
          ids.map((id) => api.get<Listing>(`/listings/${id}`).then((r) => r.data)),
        )
        return results
          .filter((r): r is PromiseFulfilledResult<Listing> => r.status === 'fulfilled')
          .map((r) => r.value)
      }
    },
  })
}

export default function WishlistPage() {
  const router = useRouter()
  const accessToken = useAuthStore((s) => s.accessToken)
  const queryClient = useQueryClient()
  const { data: listings, isLoading } = useWishlist()
  const [removed, setRemoved] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!accessToken) router.replace('/auth')
  }, [accessToken, router])

  if (!accessToken) return null

  function handleWishlistToggle(id: string) {
    setRemoved((prev) => new Set([...prev, id]))
    // Remove from server or local storage
    api.delete(`/users/wishlist/${id}`).catch(() => {
      const ids: string[] = JSON.parse(localStorage.getItem(WISHLIST_KEY) ?? '[]')
      localStorage.setItem(WISHLIST_KEY, JSON.stringify(ids.filter((i) => i !== id)))
    })
    queryClient.invalidateQueries({ queryKey: ['wishlist'] })
  }

  const visible = listings?.filter((l) => !removed.has(l.id)) ?? []

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 py-10">
        <h1 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
          <Heart className="w-6 h-6 text-red-500 fill-red-500" />
          Избранное
        </h1>

        {isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <ListingCard key={i} isLoading />
            ))}
          </div>
        )}

        {!isLoading && visible.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {visible.map((listing) => (
              <ListingCard
                key={listing.id}
                listing={listing}
                wishlisted
                onWishlistToggle={handleWishlistToggle}
              />
            ))}
          </div>
        )}

        {!isLoading && visible.length === 0 && (
          <div className="text-center py-20">
            <Heart className="w-16 h-16 text-gray-200 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-gray-500 mb-2">Список избранного пуст</h2>
            <p className="text-sm text-gray-400 mb-6">
              Нажмите на сердечко на карточке объявления, чтобы сохранить его
            </p>
            <Link
              href="/search"
              className="inline-block bg-brand-600 text-white font-medium px-6 py-2.5 rounded-xl hover:bg-brand-700 transition-colors text-sm"
            >
              Найти снаряжение
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
