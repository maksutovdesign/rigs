'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { formatPrice, formatDate } from '@rigs/utils'
import { BookingStatus } from '@rigs/types'
import { useMyRentals, useConfirmBooking, useCancelBooking } from '@/hooks/use-bookings'
import { useAuthStore } from '@/store/auth.store'
import { useCurrentUser } from '@/hooks/use-auth'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

interface HostStats {
  gmbThisMonth: number
  activeListings: number
  pendingBookings: number
  averageRating: number
}

function useHostStats() {
  return useQuery<HostStats>({
    queryKey: ['host', 'stats'],
    queryFn: async () => {
      const { data } = await api.get<HostStats>('/host/stats')
      return data
    },
  })
}

export default function HostDashboardPage() {
  const router = useRouter()
  const accessToken = useAuthStore((s) => s.accessToken)
  const { data: user } = useCurrentUser()
  const { data: rentals, isLoading: rentalsLoading } = useMyRentals()
  const { data: stats, isLoading: statsLoading } = useHostStats()
  const confirmBooking = useConfirmBooking()
  const cancelBooking = useCancelBooking()

  useEffect(() => {
    if (!accessToken) router.replace('/auth')
  }, [accessToken, router])

  if (!accessToken) return null

  const allBookings = rentals?.items ?? []
  const pendingBookings = allBookings.filter((b) => b.status === BookingStatus.PENDING)

  const quickActions = [
    { label: 'Создать объявление', href: '/host/listings/new', primary: true },
    { label: 'Мои объявления', href: '/host/listings', primary: false },
    { label: 'Аналитика', href: '/host/analytics', primary: false },
    { label: 'Выплаты', href: '/host/payouts', primary: false },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 py-10 space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Привет, {user?.firstName ?? 'хост'}!
          </h1>
          <p className="text-gray-500 text-sm mt-1">Обзор вашей активности</p>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {statsLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 p-4 h-24 animate-pulse" />
            ))
          ) : (
            <>
              <div className="bg-white rounded-2xl border border-gray-100 p-4">
                <p className="text-xs text-gray-500 mb-1">Выручка (месяц)</p>
                <p className="text-xl font-bold text-gray-900">
                  {formatPrice(stats?.gmbThisMonth ?? 0)}
                </p>
              </div>
              <div className="bg-white rounded-2xl border border-gray-100 p-4">
                <p className="text-xs text-gray-500 mb-1">Активных объявлений</p>
                <p className="text-xl font-bold text-gray-900">{stats?.activeListings ?? 0}</p>
              </div>
              <div className="bg-white rounded-2xl border border-gray-100 p-4">
                <p className="text-xs text-gray-500 mb-1">Ожидают подтверждения</p>
                <p className="text-xl font-bold text-gray-900">
                  {stats?.pendingBookings ?? pendingBookings.length}
                </p>
              </div>
              <div className="bg-white rounded-2xl border border-gray-100 p-4">
                <p className="text-xs text-gray-500 mb-1">Рейтинг</p>
                <p className="text-xl font-bold text-gray-900">
                  {(stats?.averageRating ?? user?.ratingAsHost ?? 0).toFixed(1)} ⭐
                </p>
              </div>
            </>
          )}
        </div>

        {/* Quick actions */}
        <div className="flex flex-wrap gap-3">
          {quickActions.map((action) => (
            <Link key={action.href} href={action.href}>
              <Button variant={action.primary ? 'primary' : 'secondary'} size="sm">
                {action.label}
              </Button>
            </Link>
          ))}
        </div>

        {/* Pending bookings */}
        {pendingBookings.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Ожидают подтверждения</h2>
            <div className="space-y-3">
              {pendingBookings.map((booking) => {
                const coverMedia = booking.listing?.media.find((m) => m.isCover) ?? booking.listing?.media[0]
                const renterName = [booking.renter?.firstName, booking.renter?.lastName]
                  .filter(Boolean).join(' ') || 'Арендатор'
                return (
                  <div
                    key={booking.id}
                    className="bg-white rounded-2xl border border-gray-100 p-4 flex gap-4 items-center"
                  >
                    <div className="relative w-16 h-12 rounded-xl overflow-hidden bg-gray-100 shrink-0">
                      {coverMedia && (
                        <Image src={coverMedia.url} alt="" fill className="object-cover" sizes="64px" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-gray-900 truncate">
                        {booking.listing?.title}
                      </p>
                      <p className="text-xs text-gray-500">
                        {renterName} · {formatDate(booking.startDate)} — {formatDate(booking.endDate)}
                      </p>
                      <p className="text-sm font-semibold text-gray-900 mt-0.5">
                        {formatPrice(booking.totalAmount)}
                      </p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Button
                        size="sm"
                        onClick={() => confirmBooking.mutate(booking.id)}
                        loading={confirmBooking.isPending}
                      >
                        Принять
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => cancelBooking.mutate({ id: booking.id, reason: 'Отклонено хостом' })}
                        loading={cancelBooking.isPending}
                      >
                        Отклонить
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Recent activity */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Последняя активность</h2>
          {rentalsLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => <div key={i} className="h-16 bg-white rounded-2xl animate-pulse" />)}
            </div>
          ) : allBookings.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center text-gray-400">
              <p>Нет активности</p>
              <Link href="/host/listings/new" className="mt-2 inline-block text-sm text-brand-600 hover:underline">
                Создайте первое объявление
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {allBookings.slice(0, 5).map((booking) => (
                <Link
                  key={booking.id}
                  href={`/booking/${booking.id}`}
                  className="flex items-center gap-3 bg-white border border-gray-100 rounded-2xl p-3 hover:shadow-sm transition-shadow"
                >
                  <Badge
                    variant={
                      booking.status === BookingStatus.ACTIVE ? 'success' :
                      booking.status === BookingStatus.COMPLETED ? 'default' :
                      booking.status === BookingStatus.PENDING ? 'warning' : 'danger'
                    }
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {booking.listing?.title}
                    </p>
                    <p className="text-xs text-gray-500">{formatDate(booking.createdAt)}</p>
                  </div>
                  <span className="text-sm font-semibold text-gray-900 shrink-0">
                    {formatPrice(booking.totalAmount)}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
