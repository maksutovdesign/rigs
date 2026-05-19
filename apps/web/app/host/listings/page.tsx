'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Plus, Edit, Pause, Archive } from 'lucide-react'
import { ListingStatus } from '@rigs/types'
import type { Listing } from '@rigs/types'
import { useAuthStore } from '@/store/auth.store'
import { useUpdateListing } from '@/hooks/use-listings'
import { Badge } from '@/components/ui/badge'
import type { BadgeVariant } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { formatPrice } from '@rigs/utils'

const STATUS_LABELS: Record<ListingStatus, string> = {
  [ListingStatus.DRAFT]: 'Черновик',
  [ListingStatus.ACTIVE]: 'Активно',
  [ListingStatus.PAUSED]: 'На паузе',
  [ListingStatus.ARCHIVED]: 'Архив',
  [ListingStatus.MODERATION]: 'На модерации',
}

const STATUS_BADGE_VARIANTS: Record<ListingStatus, BadgeVariant> = {
  [ListingStatus.DRAFT]: 'default',
  [ListingStatus.ACTIVE]: 'success',
  [ListingStatus.PAUSED]: 'warning',
  [ListingStatus.ARCHIVED]: 'default',
  [ListingStatus.MODERATION]: 'info',
}

interface ListingsPaginatedResponse {
  items: Listing[]
  total: number
  page: number
  limit: number
  hasMore: boolean
}

function useMyListings(page: number) {
  return useQuery<ListingsPaginatedResponse>({
    queryKey: ['listings', 'mine', page],
    queryFn: async () => {
      const { data } = await api.get<ListingsPaginatedResponse>(`/host/listings?page=${page}&limit=12`)
      return data
    },
  })
}

export default function HostListingsPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const accessToken = useAuthStore((s) => s.accessToken)
  const updateListing = useUpdateListing()
  const [tipsDismissed, setTipsDismissed] = useState(false)
  const [page, setPage] = useState(1)
  const [allListings, setAllListings] = useState<Listing[]>([])
  const [appendedPages, setAppendedPages] = useState<Set<number>>(new Set([1]))

  const { data, isLoading, isFetching } = useMyListings(page)

  useEffect(() => {
    if (!data?.items) return
    if (page === 1) {
      // Always replace on first page (handles refetch after mutation)
      setAllListings(data.items)
      setAppendedPages(new Set([1]))
    } else if (!appendedPages.has(page)) {
      // Append each higher page only once, no matter how often React Query refetches
      setAllListings((prev) => [...prev, ...data.items])
      setAppendedPages((prev) => new Set(prev).add(page))
    }
  }, [data, page, appendedPages])

  useEffect(() => {
    if (!accessToken) router.replace('/auth')
  }, [accessToken, router])

  if (!accessToken) return null

  const hasMore = data?.hasMore ?? false
  const totalCount = data?.total ?? allListings.length

  function loadMore() {
    setPage((p) => p + 1)
  }

  async function handlePause(listing: Listing) {
    const newStatus =
      listing.status === ListingStatus.ACTIVE ? ListingStatus.PAUSED : ListingStatus.ACTIVE
    await api.patch(`/listings/${listing.id}`, { status: newStatus })
    // Optimistic local update so the UI flips immediately
    setAllListings((prev) =>
      prev.map((l) => (l.id === listing.id ? { ...l, status: newStatus } : l)),
    )
    queryClient.invalidateQueries({ queryKey: ['listings', 'mine'] })
  }

  async function handleArchive(listing: Listing) {
    await api.patch(`/listings/${listing.id}`, { status: ListingStatus.ARCHIVED })
    setAllListings((prev) => prev.filter((l) => l.id !== listing.id))
    queryClient.invalidateQueries({ queryKey: ['listings', 'mine'] })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 py-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Мои объявления</h1>
          <Link href="/host/listings/new">
            <Button size="sm">
              <Plus className="w-4 h-4" />
              Создать объявление
            </Button>
          </Link>
        </div>

        {/* Welcome banner — shown only when host has 0 listings */}
        {!isLoading && totalCount === 0 && (
          <div className="bg-gradient-to-br from-brand-50 to-green-50 rounded-2xl border border-brand-100 p-8 text-center mb-6">
            <div className="text-5xl mb-4">🏕️</div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Добро пожаловать в Rigs!</h2>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              Создайте своё первое объявление — это займёт около 5 минут. Снаряжение начнёт приносить доход уже сегодня.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center items-center mb-6">
              {[
                { step: '1', label: 'Загрузите фото' },
                { step: '2', label: 'Установите цену' },
                { step: '3', label: 'Получайте заявки' },
              ].map(({ step, label }) => (
                <div key={step} className="flex items-center gap-2 text-sm text-gray-700">
                  <span className="w-7 h-7 rounded-full bg-brand-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
                    {step}
                  </span>
                  {label}
                  {step !== '3' && <span className="text-gray-300 hidden sm:inline">→</span>}
                </div>
              ))}
            </div>
            <Button onClick={() => router.push('/host/listings/new')}>
              Создать первое объявление →
            </Button>
          </div>
        )}

        {/* Tips banner — shown for hosts with 1–3 listings */}
        {!isLoading && totalCount > 0 && totalCount < 4 && !tipsDismissed && (
          <div className="bg-blue-50 rounded-2xl border border-blue-100 p-4 mb-6 flex items-start gap-3">
            <span className="text-2xl shrink-0">💡</span>
            <div className="flex-1">
              <p className="text-sm font-semibold text-blue-900">Советы для роста</p>
              <ul className="text-xs text-blue-700 mt-1 space-y-1">
                <li>• Добавьте 5+ фото — объявления с фото получают на 70% больше заявок</li>
                <li>• Включите мгновенное бронирование — арендаторы предпочитают не ждать</li>
                <li>• Отвечайте на заявки быстро — это влияет на ваш рейтинг</li>
              </ul>
            </div>
            <button onClick={() => setTipsDismissed(true)} className="text-blue-300 hover:text-blue-500 shrink-0">✕</button>
          </div>
        )}

        {/* Loading skeleton (first page) */}
        {isLoading && page === 1 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl h-64 animate-pulse" />
            ))}
          </div>
        )}

        {/* Grid */}
        {allListings.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {allListings.map((listing) => {
              const coverMedia = listing.media.find((m) => m.isCover) ?? listing.media[0]
              return (
                <div key={listing.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                  <div className="relative aspect-[4/3] bg-gray-100">
                    {coverMedia ? (
                      <Image
                        src={coverMedia.url}
                        alt={listing.title}
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        className="object-cover"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-gray-300 text-xs">
                        Нет фото
                      </div>
                    )}
                    <div className="absolute top-2 left-2">
                      <Badge variant={STATUS_BADGE_VARIANTS[listing.status]}>
                        {STATUS_LABELS[listing.status]}
                      </Badge>
                    </div>
                  </div>
                  <div className="p-3 space-y-2">
                    <p className="font-semibold text-sm text-gray-900 line-clamp-2">{listing.title}</p>
                    <p className="text-xs text-gray-500">{listing.city}</p>
                    {listing.priceDaily && (
                      <p className="text-sm font-bold text-gray-900">
                        {formatPrice(listing.priceDaily)} / день
                      </p>
                    )}
                    <div className="flex gap-1.5 pt-1">
                      <Link href={`/host/listings/${listing.id}/edit`} className="flex-1">
                        <Button variant="secondary" size="sm" fullWidth>
                          <Edit className="w-3.5 h-3.5" />
                          Изменить
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handlePause(listing)}
                        title={listing.status === ListingStatus.ACTIVE ? 'Приостановить' : 'Активировать'}
                      >
                        <Pause className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleArchive(listing)}
                        title="Архивировать"
                      >
                        <Archive className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Load more */}
        {hasMore && (
          <div className="text-center mt-6">
            <Button variant="secondary" onClick={loadMore} loading={isFetching}>
              Показать ещё
            </Button>
          </div>
        )}

      </div>
    </div>
  )
}
