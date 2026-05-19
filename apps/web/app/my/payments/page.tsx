'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/store/auth.store'
import { api } from '@/lib/api'

// ─── Types ────────────────────────────────────────────────────────────────────

type PaymentType = 'charge' | 'hold' | 'release' | 'refund' | 'payout'
type PaymentStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'refunded' | 'partially_refunded'
type PaymentProvider = 'yookassa' | 'tinkoff' | 'sbp'

interface PaymentHistoryItem {
  id: string
  bookingId: string
  amount: string
  type: PaymentType
  status: PaymentStatus
  provider: PaymentProvider
  createdAt: string
  booking: {
    id: string
    startDate: string
    endDate: string
    listing: {
      title: string
      media: { url: string; isCover: boolean }[]
    }
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const TYPE_LABEL: Record<PaymentType, string> = {
  charge: 'Оплата',
  hold: 'Удержание',
  release: 'Разморозка',
  refund: 'Возврат',
  payout: 'Выплата',
}

const TYPE_BADGE_CLASS: Record<PaymentType, string> = {
  charge: 'bg-blue-100 text-blue-700',
  hold: 'bg-yellow-100 text-yellow-700',
  release: 'bg-gray-100 text-gray-600',
  refund: 'bg-green-100 text-green-700',
  payout: 'bg-purple-100 text-purple-700',
}

const STATUS_LABEL: Record<PaymentStatus, string> = {
  pending: 'Ожидает',
  processing: 'Обрабатывается',
  completed: 'Выполнен',
  failed: 'Ошибка',
  refunded: 'Возврат',
  partially_refunded: 'Частичный возврат',
}

const STATUS_BADGE_CLASS: Record<PaymentStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  processing: 'bg-yellow-100 text-yellow-700',
  completed: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-700',
  refunded: 'bg-gray-100 text-gray-500',
  partially_refunded: 'bg-gray-100 text-gray-500',
}

function formatAmount(amount: string, type: PaymentType): string {
  const num = Number(amount)
  const formatted = new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(num)
  return type === 'refund' || type === 'payout' ? `+${formatted}` : `-${formatted}`
}

function amountClass(type: PaymentType): string {
  return type === 'refund' || type === 'payout' ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' })
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

function usePaymentHistory() {
  return useQuery<PaymentHistoryItem[]>({
    queryKey: ['payments', 'history'],
    queryFn: async () => {
      const { data } = await api.get<PaymentHistoryItem[]>('/payments/history')
      return data
    },
  })
}

// ─── Skeleton row ─────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 px-4 py-3 border-b border-gray-100 last:border-0 animate-pulse">
      <div className="w-10 h-10 rounded-xl bg-gray-100 shrink-0" />
      <div className="flex-1 space-y-1.5">
        <div className="h-3.5 bg-gray-100 rounded w-2/3" />
        <div className="h-3 bg-gray-100 rounded w-1/3" />
      </div>
      <div className="h-5 w-14 bg-gray-100 rounded-full" />
      <div className="h-4 w-20 bg-gray-100 rounded" />
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PaymentsPage() {
  const router = useRouter()
  const accessToken = useAuthStore((s) => s.accessToken)
  const { data: payments, isLoading } = usePaymentHistory()

  useEffect(() => {
    if (!accessToken) router.replace('/auth')
  }, [accessToken, router])

  if (!accessToken) return null

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-10 space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">История платежей</h1>

        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          {isLoading && (
            <>
              {Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)}
            </>
          )}

          {!isLoading && (payments?.length ?? 0) === 0 && (
            <div className="text-center py-16 px-4">
              <p className="text-gray-400 text-4xl mb-4">💳</p>
              <p className="text-gray-600 font-medium mb-2">Нет платежей</p>
              <p className="text-gray-400 text-sm mb-6">Здесь появится история всех ваших платёжных операций</p>
              <Link
                href="/search"
                className="inline-flex items-center gap-2 text-sm font-medium text-brand-600 hover:text-brand-700 transition-colors"
              >
                Найти снаряжение →
              </Link>
            </div>
          )}

          {!isLoading && (payments?.length ?? 0) > 0 && (
            <ul>
              {payments!.map((payment) => {
                const cover = payment.booking.listing.media[0]
                return (
                  <li key={payment.id}>
                    <button
                      type="button"
                      onClick={() => router.push(`/booking/${payment.booking.id}`)}
                      className="w-full flex items-center gap-3 px-4 py-3 border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors text-left"
                    >
                      {/* Thumbnail */}
                      <div className="w-10 h-10 rounded-xl bg-gray-100 overflow-hidden shrink-0">
                        {cover ? (
                          <Image
                            src={cover.url}
                            alt={payment.booking.listing.title}
                            width={40}
                            height={40}
                            className="object-cover w-full h-full"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs">
                            ?
                          </div>
                        )}
                      </div>

                      {/* Title + date */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {payment.booking.listing.title}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">{formatDate(payment.createdAt)}</p>
                      </div>

                      {/* Type badge */}
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium shrink-0 ${TYPE_BADGE_CLASS[payment.type]}`}>
                        {TYPE_LABEL[payment.type]}
                      </span>

                      {/* Status badge */}
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium shrink-0 ${STATUS_BADGE_CLASS[payment.status]}`}>
                        {STATUS_LABEL[payment.status]}
                      </span>

                      {/* Amount */}
                      <span className={`text-sm shrink-0 ${amountClass(payment.type)}`}>
                        {formatAmount(payment.amount, payment.type)}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
