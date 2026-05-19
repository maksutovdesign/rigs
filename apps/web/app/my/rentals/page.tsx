'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { RefreshCw } from 'lucide-react'
import { formatDate, formatPrice } from '@rigs/utils'
import { BookingStatus } from '@rigs/types'
import type { Booking } from '@rigs/types'
import { useMyRentals } from '@/hooks/use-bookings'
import { useAuthStore } from '@/store/auth.store'
import { Badge } from '@/components/ui/badge'
import type { BadgeVariant } from '@/components/ui/badge'

type TabKey = 'upcoming' | 'active' | 'completed' | 'cancelled'

const TABS: { key: TabKey; label: string }[] = [
  { key: 'upcoming', label: 'Предстоящие' },
  { key: 'active', label: 'Активные' },
  { key: 'completed', label: 'Завершённые' },
  { key: 'cancelled', label: 'Отменённые' },
]

const UPCOMING_STATUSES = new Set([BookingStatus.PENDING, BookingStatus.CONFIRMED, BookingStatus.PAID])
const ACTIVE_STATUSES = new Set([BookingStatus.ACTIVE])
const COMPLETED_STATUSES = new Set([BookingStatus.COMPLETED, BookingStatus.REFUNDED])
const CANCELLED_STATUSES = new Set([
  BookingStatus.CANCELLED_RENTER,
  BookingStatus.CANCELLED_HOST,
  BookingStatus.DISPUTED,
])

const STATUS_LABELS: Record<BookingStatus, string> = {
  [BookingStatus.PENDING]: 'Ожидает',
  [BookingStatus.CONFIRMED]: 'Подтверждено',
  [BookingStatus.PAID]: 'Оплачено',
  [BookingStatus.ACTIVE]: 'Активно',
  [BookingStatus.COMPLETED]: 'Завершено',
  [BookingStatus.CANCELLED_RENTER]: 'Отменено',
  [BookingStatus.CANCELLED_HOST]: 'Отменено хостом',
  [BookingStatus.DISPUTED]: 'Спор',
  [BookingStatus.REFUNDED]: 'Возврат',
}

const STATUS_BADGE_VARIANTS: Record<BookingStatus, BadgeVariant> = {
  [BookingStatus.PENDING]: 'warning',
  [BookingStatus.CONFIRMED]: 'info',
  [BookingStatus.PAID]: 'info',
  [BookingStatus.ACTIVE]: 'success',
  [BookingStatus.COMPLETED]: 'default',
  [BookingStatus.CANCELLED_RENTER]: 'danger',
  [BookingStatus.CANCELLED_HOST]: 'danger',
  [BookingStatus.DISPUTED]: 'danger',
  [BookingStatus.REFUNDED]: 'warning',
}

function filterByTab(bookings: Booking[], tab: TabKey): Booking[] {
  switch (tab) {
    case 'upcoming': return bookings.filter((b) => UPCOMING_STATUSES.has(b.status))
    case 'active': return bookings.filter((b) => ACTIVE_STATUSES.has(b.status))
    case 'completed': return bookings.filter((b) => COMPLETED_STATUSES.has(b.status))
    case 'cancelled': return bookings.filter((b) => CANCELLED_STATUSES.has(b.status))
  }
}

function BookingCard({ booking, showRepeatBtn }: { booking: Booking; showRepeatBtn?: boolean }) {
  const coverMedia = booking.listing?.media.find((m) => m.isCover) ?? booking.listing?.media[0]
  return (
    <Link
      href={`/booking/${booking.id}`}
      className="flex gap-4 bg-white border border-gray-100 rounded-2xl p-4 hover:shadow-sm transition-shadow"
    >
      <div className="relative w-24 h-20 rounded-xl overflow-hidden bg-gray-100 shrink-0">
        {coverMedia && (
          <Image src={coverMedia.url} alt={booking.listing?.title ?? ''} fill className="object-cover" sizes="96px" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className="font-semibold text-gray-900 text-sm line-clamp-2 leading-snug">
            {booking.listing?.title ?? 'Объявление'}
          </p>
          <Badge variant={STATUS_BADGE_VARIANTS[booking.status]} className="shrink-0">
            {STATUS_LABELS[booking.status]}
          </Badge>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          {formatDate(booking.startDate)} — {formatDate(booking.endDate)}
        </p>
        <p className="text-sm font-semibold text-gray-900 mt-1">{formatPrice(booking.totalAmount)}</p>
        {showRepeatBtn && booking.listingId && (
          <Link
            href={`/listing/${booking.listingId}?repeatBooking=1`}
            onClick={(e) => e.stopPropagation()}
            className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-brand-600 hover:text-brand-700 border border-brand-200 hover:border-brand-300 rounded-lg px-2.5 py-1 transition-colors bg-brand-50 hover:bg-brand-100"
          >
            <RefreshCw className="w-3 h-3" />
            Арендовать снова
          </Link>
        )}
      </div>
    </Link>
  )
}

export default function MyRentalsPage() {
  const router = useRouter()
  const accessToken = useAuthStore((s) => s.accessToken)
  const [activeTab, setActiveTab] = useState<TabKey>('upcoming')
  const [visibleCount, setVisibleCount] = useState(10)
  const { data, isLoading } = useMyRentals()

  useEffect(() => {
    if (!accessToken) {
      router.replace('/auth')
    }
  }, [accessToken, router])

  // Reset visible count when tab changes
  useEffect(() => {
    setVisibleCount(10)
  }, [activeTab])

  if (!accessToken) return null

  const bookings = data?.items ?? []
  const filteredBookings = filterByTab(bookings, activeTab)
  const visibleBookings = filteredBookings.slice(0, visibleCount)

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-10">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Мои аренды</h1>

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-gray-100 rounded-xl mb-6">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 text-sm font-medium py-2 rounded-lg transition-colors ${
                activeTab === tab.key
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-28 bg-white rounded-2xl animate-pulse" />
            ))}
          </div>
        )}

        {/* List */}
        {!isLoading && visibleBookings.length > 0 && (
          <div className="space-y-3">
            {visibleBookings.map((b) => (
              <BookingCard key={b.id} booking={b} showRepeatBtn={activeTab === 'completed'} />
            ))}
            {filteredBookings.length > visibleCount && (
              <button
                onClick={() => setVisibleCount((c) => c + 10)}
                className="w-full py-3 text-sm font-medium text-brand-600 hover:text-brand-700 border border-gray-200 rounded-2xl mt-4 hover:bg-gray-50 transition-colors"
              >
                Показать ещё ({filteredBookings.length - visibleCount})
              </button>
            )}
          </div>
        )}

        {/* Empty state */}
        {!isLoading && filteredBookings.length === 0 && (
          <div className="text-center py-16">
            <p className="text-gray-500 mb-4">Нет аренд в этой категории</p>
            <Link
              href="/search"
              className="inline-block bg-brand-600 text-white font-medium px-5 py-2.5 rounded-xl hover:bg-brand-700 transition-colors text-sm"
            >
              Найти снаряжение
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
