'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CheckCircle, XCircle, BarChart2, Users, Package, AlertTriangle, Scale } from 'lucide-react'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/auth.store'
import { useCurrentUser } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { UserRole } from '@rigs/types'
import type { ListingMedia, Category } from '@rigs/types'

/** Moderation queue item — server returns phone which is not on PublicUser */
interface ModerationListing {
  id: string
  title: string
  city: string
  host?: { id: string; firstName?: string | null; lastName?: string | null; phone?: string | null }
  media: ListingMedia[]
  category?: Category
}

interface DisputeBooking {
  id: string
  disputeReason?: string | null
  disputedAt?: string | null
  listing: {
    id: string
    title: string
    media: { id: string; url: string; isCover: boolean }[]
  }
  renter: { id: string; firstName?: string | null; lastName?: string | null; phone: string }
  host: { id: string; firstName?: string | null; lastName?: string | null; phone: string }
}

// ─── Hooks ───────────────────────────────────────────────────────────────────

interface PlatformStats {
  users: number
  listings: number
  bookings: number
  totalRevenue: number | string
}

function usePlatformStats() {
  return useQuery<PlatformStats>({
    queryKey: ['admin', 'dashboard'],
    queryFn: async () => {
      const { data } = await api.get<PlatformStats>('/admin/dashboard')
      return data
    },
  })
}

function useModerationQueue() {
  return useQuery<ModerationListing[]>({
    queryKey: ['admin', 'moderation'],
    queryFn: async () => {
      const { data } = await api.get<ModerationListing[]>('/admin/moderation')
      return data
    },
  })
}

function useApproveListing() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.patch(`/admin/listings/${id}/approve`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'moderation'] }),
  })
}

function useRejectListing() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      api.patch(`/admin/listings/${id}/reject`, { reason }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'moderation'] }),
  })
}

function useDisputes() {
  return useQuery<DisputeBooking[]>({
    queryKey: ['admin', 'disputes'],
    queryFn: async () => {
      const { data } = await api.get<DisputeBooking[]>('/admin/disputes')
      return data
    },
  })
}

function useResolveDispute() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, decision }: { id: string; decision: 'refund_renter' | 'release_host' }) =>
      api.patch(`/admin/disputes/${id}/resolve`, { decision }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'disputes'] }),
  })
}

// ─── Component ───────────────────────────────────────────────────────────────

type Tab = 'moderation' | 'disputes'

export default function AdminPage() {
  const router = useRouter()
  const accessToken = useAuthStore((s) => s.accessToken)
  const { data: user, isLoading: userLoading } = useCurrentUser()
  const { data: stats, isLoading: statsLoading } = usePlatformStats()
  const { data: queue, isLoading: queueLoading } = useModerationQueue()
  const { data: disputes, isLoading: disputesLoading } = useDisputes()
  const approve = useApproveListing()
  const reject = useRejectListing()
  const resolveDispute = useResolveDispute()
  const [rejectId, setRejectId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [activeTab, setActiveTab] = useState<Tab>('moderation')

  useEffect(() => {
    if (!accessToken) { router.replace('/auth'); return }
  }, [accessToken, router])

  if (userLoading || !user) return null

  // Guard: only admins
  if (user.role !== UserRole.ADMIN) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500">
        <p>Доступ только для администраторов</p>
      </div>
    )
  }

  function handleReject(id: string) {
    if (!rejectReason.trim()) return
    reject.mutate({ id, reason: rejectReason })
    setRejectId(null)
    setRejectReason('')
  }

  const statCards = [
    { label: 'Пользователей', value: stats?.users ?? '—', icon: <Users className="w-5 h-5 text-blue-500" /> },
    { label: 'Активных объявлений', value: stats?.listings ?? '—', icon: <Package className="w-5 h-5 text-green-500" /> },
    { label: 'Завершённых аренд', value: stats?.bookings ?? '—', icon: <BarChart2 className="w-5 h-5 text-purple-500" /> },
    {
      label: 'Выручка платформы',
      value: stats ? `${Number(stats.totalRevenue).toLocaleString('ru-RU')} ₽` : '—',
      icon: <BarChart2 className="w-5 h-5 text-orange-500" />,
    },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-10 space-y-10">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Панель администратора</h1>
          <p className="text-sm text-gray-500 mt-1">Метрики платформы и управление</p>
        </div>

        {/* Stats */}
        <section>
          <h2 className="text-base font-semibold text-gray-800 mb-4">Платформа</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {statsLoading
              ? Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="bg-white rounded-2xl border border-gray-100 p-4 h-20 animate-pulse" />
                ))
              : statCards.map((card) => (
                  <div key={card.label} className="bg-white rounded-2xl border border-gray-100 p-4 flex items-start gap-3">
                    <div className="mt-0.5">{card.icon}</div>
                    <div>
                      <p className="text-xs text-gray-500">{card.label}</p>
                      <p className="text-xl font-bold text-gray-900 mt-0.5">{card.value}</p>
                    </div>
                  </div>
                ))}
          </div>
        </section>

        {/* Tabs */}
        <section>
          <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit mb-6">
            <button
              onClick={() => setActiveTab('moderation')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'moderation'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <AlertTriangle className="w-4 h-4 text-yellow-500" />
              Модерация
              {queue && queue.length > 0 && (
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-yellow-100 text-yellow-700 text-xs font-bold">
                  {queue.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('disputes')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'disputes'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Scale className="w-4 h-4 text-red-500" />
              Споры
              {disputes && disputes.length > 0 && (
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-red-100 text-red-700 text-xs font-bold">
                  {disputes.length}
                </span>
              )}
            </button>
          </div>

          {/* Moderation tab */}
          {activeTab === 'moderation' && (
            <>
              {queueLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="bg-white rounded-2xl border border-gray-100 h-24 animate-pulse" />
                  ))}
                </div>
              ) : queue?.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center text-gray-400">
                  <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-400" />
                  <p>Очередь пуста — все объявления проверены</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {queue?.map((listing) => {
                    const cover = listing.media?.find((m) => m.isCover) ?? listing.media?.[0]
                    const host = listing.host
                    return (
                      <div
                        key={listing.id}
                        className="bg-white rounded-2xl border border-gray-100 p-4 flex gap-4"
                      >
                        {/* Cover image */}
                        <div className="relative w-20 h-16 rounded-xl overflow-hidden bg-gray-100 shrink-0">
                          {cover ? (
                            <Image src={cover.url} alt="" fill className="object-cover" sizes="80px" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-300">
                              <Package className="w-6 h-6" />
                            </div>
                          )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm text-gray-900 truncate">{listing.title}</p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {listing.city} · {listing.category?.nameRu}
                          </p>
                          {host && (
                            <p className="text-xs text-gray-400 mt-0.5">
                              Хост: {host.firstName} {host.lastName} ({host.phone ?? ''})
                            </p>
                          )}
                          <p className="text-xs text-gray-400 mt-0.5">
                            ID: <span className="font-mono">{listing.id}</span>
                          </p>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col gap-2 shrink-0 justify-center">
                          <Button
                            size="sm"
                            onClick={() => approve.mutate(listing.id)}
                            loading={approve.isPending}
                            className="flex items-center gap-1"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                            Одобрить
                          </Button>
                          {rejectId === listing.id ? (
                            <div className="flex flex-col gap-1">
                              <input
                                autoFocus
                                placeholder="Причина отклонения"
                                value={rejectReason}
                                onChange={(e) => setRejectReason(e.target.value)}
                                className="text-xs border border-gray-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-red-400 w-44"
                              />
                              <div className="flex gap-1">
                                <Button
                                  size="sm"
                                  variant="danger"
                                  onClick={() => handleReject(listing.id)}
                                  loading={reject.isPending}
                                  className="flex-1"
                                >
                                  Отклонить
                                </Button>
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  onClick={() => { setRejectId(null); setRejectReason('') }}
                                >
                                  ✕
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <Button
                              size="sm"
                              variant="danger"
                              onClick={() => setRejectId(listing.id)}
                              className="flex items-center gap-1"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              Отклонить
                            </Button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          )}

          {/* Disputes tab */}
          {activeTab === 'disputes' && (
            <>
              {disputesLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="bg-white rounded-2xl border border-gray-100 h-24 animate-pulse" />
                  ))}
                </div>
              ) : disputes?.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center text-gray-400">
                  <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-400" />
                  <p>Активных споров нет</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {disputes?.map((booking) => {
                    const cover = booking.listing.media?.[0]
                    return (
                      <div
                        key={booking.id}
                        className="bg-white rounded-2xl border border-gray-100 p-4 flex gap-4"
                      >
                        {/* Cover image */}
                        <div className="relative w-20 h-16 rounded-xl overflow-hidden bg-gray-100 shrink-0">
                          {cover ? (
                            <Image src={cover.url} alt="" fill className="object-cover" sizes="80px" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-300">
                              <Package className="w-6 h-6" />
                            </div>
                          )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm text-gray-900 truncate">
                            {booking.listing.title}
                          </p>
                          <div className="flex flex-wrap gap-x-4 mt-0.5">
                            <p className="text-xs text-gray-500">
                              Арендатор: {booking.renter.firstName} {booking.renter.lastName}{' '}
                              <span className="text-gray-400">({booking.renter.phone})</span>
                            </p>
                            <p className="text-xs text-gray-500">
                              Хост: {booking.host.firstName} {booking.host.lastName}{' '}
                              <span className="text-gray-400">({booking.host.phone})</span>
                            </p>
                          </div>
                          {booking.disputeReason && (
                            <p className="text-xs text-red-500 mt-1 line-clamp-2">
                              Причина: {booking.disputeReason}
                            </p>
                          )}
                          {booking.disputedAt && (
                            <p className="text-xs text-gray-400 mt-0.5">
                              {new Date(booking.disputedAt).toLocaleString('ru-RU')}
                            </p>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col gap-2 shrink-0 justify-center">
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => resolveDispute.mutate({ id: booking.id, decision: 'refund_renter' })}
                            loading={resolveDispute.isPending}
                            className="flex items-center gap-1 whitespace-nowrap"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            Вернуть арендатору
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => resolveDispute.mutate({ id: booking.id, decision: 'release_host' })}
                            loading={resolveDispute.isPending}
                            className="flex items-center gap-1 whitespace-nowrap bg-green-600 hover:bg-green-700 text-white"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                            Перевести хосту
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  )
}
