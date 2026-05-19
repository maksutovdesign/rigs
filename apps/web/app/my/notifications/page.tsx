'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Bell,
  BellOff,
  CheckCheck,
  Calendar,
  MessageSquare,
  Star,
  Wallet,
  ShieldCheck,
  Tag,
  ChevronRight,
} from 'lucide-react'
import { useAuthStore } from '@/store/auth.store'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

type NotificationType =
  | 'booking_request'
  | 'booking_confirmed'
  | 'booking_cancelled'
  | 'message'
  | 'review'
  | 'payout'
  | 'kyc'
  | 'promo'
  | 'system'

interface AppNotification {
  id: string
  type: NotificationType
  title: string
  body: string
  isRead: boolean
  actionUrl?: string
  createdAt: string
}

interface NotificationsPage {
  items: AppNotification[]
  total: number
  unreadCount: number
}

// ─── Icon / color maps ────────────────────────────────────────────────────────

const TYPE_ICONS: Record<NotificationType, React.ElementType> = {
  booking_request: Calendar,
  booking_confirmed: Calendar,
  booking_cancelled: Calendar,
  message: MessageSquare,
  review: Star,
  payout: Wallet,
  kyc: ShieldCheck,
  promo: Tag,
  system: Bell,
}

const TYPE_COLORS: Record<NotificationType, string> = {
  booking_request: 'bg-amber-50 text-amber-500',
  booking_confirmed: 'bg-brand-50 text-brand-600',
  booking_cancelled: 'bg-red-50 text-red-500',
  message: 'bg-blue-50 text-blue-600',
  review: 'bg-yellow-50 text-yellow-500',
  payout: 'bg-green-50 text-green-600',
  kyc: 'bg-indigo-50 text-indigo-600',
  promo: 'bg-pink-50 text-pink-500',
  system: 'bg-neutral-100 text-neutral-500',
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

function useNotifications() {
  return useQuery<NotificationsPage>({
    queryKey: ['notifications'],
    queryFn: async () => {
      const { data } = await api.get<NotificationsPage>('/notifications')
      return data
    },
    refetchInterval: 30_000, // poll every 30s
  })
}

function useMarkAllRead() {
  const queryClient = useQueryClient()
  return useMutation<void, Error>({
    mutationFn: async () => {
      await api.post('/notifications/read-all')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })
}

function useMarkRead() {
  const queryClient = useQueryClient()
  return useMutation<void, Error, string>({
    mutationFn: async (id) => {
      await api.post(`/notifications/${id}/read`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (seconds < 60) return 'только что'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes} мин. назад`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} ч. назад`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days} д. назад`
  return new Date(dateStr).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function NotificationsPage() {
  const router = useRouter()
  const accessToken = useAuthStore((s) => s.accessToken)
  const { data, isLoading } = useNotifications()
  const markAllRead = useMarkAllRead()
  const markRead = useMarkRead()

  useEffect(() => {
    if (!accessToken) router.replace('/auth')
  }, [accessToken, router])

  if (!accessToken) return null

  const notifications = data?.items ?? []
  const unreadCount = data?.unreadCount ?? 0

  function handleClick(notification: AppNotification) {
    if (!notification.isRead) {
      markRead.mutate(notification.id)
    }
    if (notification.actionUrl) {
      router.push(notification.actionUrl)
    }
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="max-w-2xl mx-auto px-4 py-10">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-neutral-900 flex items-center gap-2">
              Уведомления
              {unreadCount > 0 && (
                <span className="inline-flex items-center justify-center h-6 min-w-6 rounded-full bg-brand-600 text-white text-xs font-bold px-1.5">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </h1>
            <p className="text-sm text-neutral-400 mt-0.5">{data?.total ?? 0} всего</p>
          </div>

          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => markAllRead.mutate()}
              loading={markAllRead.isPending}
            >
              <CheckCheck className="w-4 h-4" />
              Прочитать все
            </Button>
          )}
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="bg-white rounded-2xl border border-neutral-100 p-4 h-16 animate-pulse" />
            ))}
          </div>
        )}

        {/* Empty */}
        {!isLoading && notifications.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-neutral-100 mb-4">
              <BellOff className="w-7 h-7 text-neutral-400" />
            </div>
            <p className="text-lg font-semibold text-neutral-900">Нет уведомлений</p>
            <p className="text-sm text-neutral-400 mt-1">
              Здесь будут появляться уведомления о бронированиях, сообщениях и выплатах
            </p>
          </div>
        )}

        {/* List */}
        {!isLoading && notifications.length > 0 && (
          <div className="space-y-1.5">
            {notifications.map((n) => {
              const Icon = TYPE_ICONS[n.type]
              const colorClass = TYPE_COLORS[n.type]
              return (
                <button
                  key={n.id}
                  onClick={() => handleClick(n)}
                  className={cn(
                    'w-full text-left rounded-2xl border px-4 py-3.5 flex items-start gap-3 transition-all',
                    n.isRead
                      ? 'bg-white border-neutral-100 hover:border-neutral-200'
                      : 'bg-white border-brand-100 shadow-xs hover:shadow-sm',
                  )}
                >
                  {/* Icon */}
                  <div className={cn(
                    'mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl',
                    colorClass,
                  )}>
                    <Icon className="w-4 h-4" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={cn(
                        'text-sm leading-snug',
                        n.isRead ? 'text-neutral-700 font-normal' : 'text-neutral-900 font-semibold',
                      )}>
                        {n.title}
                      </p>
                      <span className="text-xs text-neutral-400 shrink-0 mt-0.5">
                        {timeAgo(n.createdAt)}
                      </span>
                    </div>
                    <p className="text-xs text-neutral-500 mt-0.5 line-clamp-2">{n.body}</p>
                  </div>

                  {/* Unread dot / action arrow */}
                  <div className="flex flex-col items-center gap-2 shrink-0 mt-1">
                    {!n.isRead && (
                      <span className="h-2 w-2 rounded-full bg-brand-600" />
                    )}
                    {n.actionUrl && (
                      <ChevronRight className="w-4 h-4 text-neutral-300" />
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
