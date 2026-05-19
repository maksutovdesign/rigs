'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { TrendingUp, CalendarRange, BarChart2, Star, Eye, ShoppingBag } from 'lucide-react'
import { formatPrice } from '@rigs/utils'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/auth.store'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

interface RevenuePoint {
  month: string
  revenue: number
  bookings: number
}

interface TopListing {
  id: string
  title: string
  priceDaily: string | null
  rating: string | null
  reviewsCount: number
  bookingsCount: number
  viewsCount: number
  media: { url: string }[]
}

interface CalendarBooking {
  id: string
  listingId: string
  startDate: string
  endDate: string
  status: string
  renter: { firstName: string | null; lastName: string | null }
  listing: { title: string }
}

// ─── Hooks ───────────────────────────────────────────────────────────────────

function useRevenueChart(months = 6) {
  return useQuery<RevenuePoint[]>({
    queryKey: ['host', 'analytics', months],
    queryFn: async () => {
      const { data } = await api.get<RevenuePoint[]>(`/host/analytics?months=${months}`)
      return data
    },
  })
}

function useTopListings() {
  return useQuery<TopListing[]>({
    queryKey: ['host', 'top-listings'],
    queryFn: async () => {
      const { data } = await api.get<TopListing[]>('/host/top-listings')
      return data
    },
  })
}

function useCalendar() {
  return useQuery<CalendarBooking[]>({
    queryKey: ['host', 'calendar'],
    queryFn: async () => {
      const { data } = await api.get<CalendarBooking[]>('/host/calendar')
      return data
    },
  })
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function RevenueBar({ point, max }: { point: RevenuePoint; max: number }) {
  const pct = max > 0 ? (point.revenue / max) * 100 : 0
  return (
    <div className="flex flex-col items-center gap-1 flex-1 min-w-0">
      <span className="text-xs font-medium text-gray-700 whitespace-nowrap">
        {point.revenue > 0 ? formatPrice(point.revenue) : '—'}
      </span>
      <div className="w-full flex flex-col justify-end" style={{ height: 80 }}>
        <div
          className={cn(
            'w-full rounded-t-lg transition-all',
            point.revenue > 0 ? 'bg-brand-500' : 'bg-gray-100',
          )}
          style={{ height: `${Math.max(pct, point.revenue > 0 ? 4 : 0)}%` }}
        />
      </div>
      <span className="text-xs text-gray-400 truncate w-full text-center">{point.month}</span>
    </div>
  )
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function HostAnalyticsPage() {
  const router = useRouter()
  const accessToken = useAuthStore((s) => s.accessToken)
  const { data: chart, isLoading: chartLoading } = useRevenueChart(6)
  const { data: topListings, isLoading: topLoading } = useTopListings()
  const { data: calendar, isLoading: calLoading } = useCalendar()

  useEffect(() => {
    if (!accessToken) router.replace('/auth')
  }, [accessToken, router])

  if (!accessToken) return null

  const maxRevenue = Math.max(...(chart?.map((p) => p.revenue) ?? [1]))
  const totalRevenue = chart?.reduce((s, p) => s + p.revenue, 0) ?? 0
  const totalBookingsChart = chart?.reduce((s, p) => s + p.bookings, 0) ?? 0

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 py-10 space-y-10">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Аналитика</h1>
            <p className="text-sm text-gray-500 mt-1">Выручка и активность за последние 6 месяцев</p>
          </div>
          <Link href="/host/dashboard">
            <Button variant="secondary" size="sm">← Назад</Button>
          </Link>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl border border-gray-100 p-4 flex items-start gap-3">
            <TrendingUp className="w-5 h-5 text-green-500 mt-0.5" />
            <div>
              <p className="text-xs text-gray-500">Выручка (6 мес.)</p>
              <p className="text-xl font-bold text-gray-900">{formatPrice(totalRevenue)}</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-4 flex items-start gap-3">
            <ShoppingBag className="w-5 h-5 text-blue-500 mt-0.5" />
            <div>
              <p className="text-xs text-gray-500">Бронирований (6 мес.)</p>
              <p className="text-xl font-bold text-gray-900">{totalBookingsChart}</p>
            </div>
          </div>
        </div>

        {/* Revenue chart */}
        <section className="bg-white rounded-2xl border border-gray-100 p-6">
          <div className="flex items-center gap-2 mb-6">
            <BarChart2 className="w-4 h-4 text-gray-400" />
            <h2 className="text-sm font-semibold text-gray-900">Выручка по месяцам</h2>
          </div>
          {chartLoading ? (
            <div className="h-32 animate-pulse bg-gray-100 rounded-lg" />
          ) : (
            <div className="flex gap-2 items-end" style={{ height: 120 }}>
              {chart?.map((point) => (
                <RevenueBar key={point.month} point={point} max={maxRevenue} />
              ))}
            </div>
          )}
        </section>

        {/* Top listings */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Star className="w-4 h-4 text-yellow-400" />
            <h2 className="text-sm font-semibold text-gray-900">Топ объявлений</h2>
          </div>
          {topLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <div key={i} className="h-16 bg-white rounded-2xl animate-pulse" />)}
            </div>
          ) : topListings?.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center text-gray-400">
              Нет активных объявлений
            </div>
          ) : (
            <div className="space-y-3">
              {topListings?.map((listing, i) => (
                <Link
                  key={listing.id}
                  href={`/listing/${listing.id}`}
                  className="flex items-center gap-3 bg-white border border-gray-100 rounded-2xl p-3 hover:shadow-sm transition-shadow"
                >
                  <span className="w-6 text-sm font-bold text-gray-300 shrink-0 text-center">
                    {i + 1}
                  </span>
                  <div className="relative w-12 h-9 rounded-lg overflow-hidden bg-gray-100 shrink-0">
                    {listing.media[0] && (
                      <Image src={listing.media[0].url} alt="" fill className="object-cover" sizes="48px" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{listing.title}</p>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-xs text-gray-400 flex items-center gap-0.5">
                        <ShoppingBag className="w-3 h-3" /> {listing.bookingsCount}
                      </span>
                      <span className="text-xs text-gray-400 flex items-center gap-0.5">
                        <Eye className="w-3 h-3" /> {listing.viewsCount}
                      </span>
                      {listing.rating && (
                        <span className="text-xs text-gray-400 flex items-center gap-0.5">
                          <Star className="w-3 h-3 text-yellow-400" />
                          {Number(listing.rating).toFixed(1)}
                        </span>
                      )}
                    </div>
                  </div>
                  {listing.priceDaily && (
                    <span className="text-sm font-semibold text-gray-900 shrink-0">
                      {formatPrice(Number(listing.priceDaily))} / д
                    </span>
                  )}
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Booking calendar */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <CalendarRange className="w-4 h-4 text-blue-400" />
            <h2 className="text-sm font-semibold text-gray-900">Предстоящие бронирования</h2>
          </div>
          {calLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => <div key={i} className="h-14 bg-white rounded-2xl animate-pulse" />)}
            </div>
          ) : calendar?.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center text-gray-400">
              Нет предстоящих бронирований
            </div>
          ) : (
            <div className="space-y-2">
              {calendar?.map((b) => {
                const renterName =
                  [b.renter.firstName, b.renter.lastName].filter(Boolean).join(' ') || 'Арендатор'
                const start = new Date(b.startDate).toLocaleDateString('ru-RU', {
                  day: '2-digit', month: 'short',
                })
                const end = new Date(b.endDate).toLocaleDateString('ru-RU', {
                  day: '2-digit', month: 'short',
                })
                return (
                  <Link
                    key={b.id}
                    href={`/booking/${b.id}`}
                    className="flex items-center gap-3 bg-white border border-gray-100 rounded-2xl p-3 hover:shadow-sm transition-shadow"
                  >
                    <div className="w-2 h-2 rounded-full bg-green-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{b.listing.title}</p>
                      <p className="text-xs text-gray-500">{renterName}</p>
                    </div>
                    <p className="text-xs text-gray-500 shrink-0">
                      {start} — {end}
                    </p>
                  </Link>
                )
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
