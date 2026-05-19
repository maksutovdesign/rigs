'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Wallet, TrendingUp, Clock, CheckCircle, AlertCircle, ChevronRight } from 'lucide-react'
import { useAuthStore } from '@/store/auth.store'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api'
import { formatPrice, formatDate } from '@rigs/utils'
import { cn } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

type PayoutStatus = 'pending' | 'processing' | 'paid' | 'failed'

interface Payout {
  id: string
  amount: number
  currency: string
  status: PayoutStatus
  period: string        // e.g. "Июнь 2024"
  bookingsCount: number
  createdAt: string
  paidAt?: string
  bankCard?: string     // last 4 digits
}

interface PayoutStats {
  availableBalance: number
  pendingBalance: number
  totalPaid: number
  currency: string
  nextPayoutDate?: string
  bankCard?: string
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

function usePayoutStats() {
  return useQuery<PayoutStats>({
    queryKey: ['host', 'payout-stats'],
    queryFn: async () => {
      const { data } = await api.get<PayoutStats>('/host/payouts/stats')
      return data
    },
  })
}

function usePayouts() {
  return useQuery<Payout[]>({
    queryKey: ['host', 'payouts'],
    queryFn: async () => {
      const { data } = await api.get<Payout[]>('/host/payouts')
      return data
    },
  })
}

function useRequestPayout() {
  const queryClient = useQueryClient()
  return useMutation<void, Error>({
    mutationFn: async () => {
      await api.post('/host/payouts/request')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['host', 'payout-stats'] })
      queryClient.invalidateQueries({ queryKey: ['host', 'payouts'] })
    },
  })
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<PayoutStatus, string> = {
  pending: 'Ожидает',
  processing: 'В обработке',
  paid: 'Выплачено',
  failed: 'Ошибка',
}

const STATUS_VARIANTS: Record<PayoutStatus, 'default' | 'warning' | 'success' | 'danger' | 'info'> = {
  pending: 'warning',
  processing: 'info',
  paid: 'success',
  failed: 'danger',
}

const STATUS_ICONS: Record<PayoutStatus, React.ElementType> = {
  pending: Clock,
  processing: TrendingUp,
  paid: CheckCircle,
  failed: AlertCircle,
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function HostPayoutsPage() {
  const router = useRouter()
  const accessToken = useAuthStore((s) => s.accessToken)
  const { data: stats, isLoading: statsLoading } = usePayoutStats()
  const { data: payouts, isLoading: payoutsLoading } = usePayouts()
  const requestPayout = useRequestPayout()

  useEffect(() => {
    if (!accessToken) router.replace('/auth')
  }, [accessToken, router])

  if (!accessToken) return null

  const canRequestPayout = (stats?.availableBalance ?? 0) >= 500

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="max-w-3xl mx-auto px-4 py-10 space-y-8">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Выплаты</h1>
          <p className="text-sm text-neutral-500 mt-1">
            Управление выводом средств на карту
          </p>
        </div>

        {/* Balance cards */}
        {statsLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-2xl border border-neutral-100 p-5 h-28 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Available */}
            <div className="bg-gradient-to-br from-brand-600 to-brand-700 rounded-2xl p-5 text-white shadow-brand-sm">
              <div className="flex items-center gap-2 mb-2">
                <Wallet className="w-4 h-4 opacity-80" />
                <p className="text-sm opacity-80">Доступно к выводу</p>
              </div>
              <p className="text-2xl font-bold">
                {formatPrice(stats?.availableBalance ?? 0)}
              </p>
              {stats?.bankCard && (
                <p className="text-xs opacity-70 mt-1">Карта •• {stats.bankCard}</p>
              )}
            </div>

            {/* Pending */}
            <div className="bg-white rounded-2xl border border-neutral-100 p-5">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-amber-500" />
                <p className="text-sm text-neutral-500">Удерживается</p>
              </div>
              <p className="text-2xl font-bold text-neutral-900">
                {formatPrice(stats?.pendingBalance ?? 0)}
              </p>
              <p className="text-xs text-neutral-400 mt-1">Освободится через 48ч после возврата</p>
            </div>

            {/* Total */}
            <div className="bg-white rounded-2xl border border-neutral-100 p-5">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-brand-500" />
                <p className="text-sm text-neutral-500">Всего выплачено</p>
              </div>
              <p className="text-2xl font-bold text-neutral-900">
                {formatPrice(stats?.totalPaid ?? 0)}
              </p>
              {stats?.nextPayoutDate && (
                <p className="text-xs text-neutral-400 mt-1">
                  Следующая: {formatDate(stats.nextPayoutDate)}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Request payout CTA */}
        <div className="bg-white rounded-2xl border border-neutral-100 p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <p className="font-semibold text-neutral-900">Вывести деньги</p>
            <p className="text-sm text-neutral-500 mt-0.5">
              {canRequestPayout
                ? `Минимальная сумма — 500 ₽. Зачисление за 1–3 рабочих дня.`
                : `Минимум для вывода — 500 ₽. Пока недостаточно средств.`}
            </p>
          </div>
          <Button
            onClick={() => requestPayout.mutate()}
            loading={requestPayout.isPending}
            disabled={!canRequestPayout}
          >
            Запросить выплату
          </Button>
        </div>

        {/* Info banner */}
        <div className="rounded-xl bg-blue-50 border border-blue-100 p-4 text-sm text-blue-700">
          <p className="font-medium mb-1">Как работают выплаты?</p>
          <ul className="space-y-1 text-blue-600 list-disc list-inside">
            <li>После завершения аренды средства удерживаются 48 часов</li>
            <li>Комиссия платформы — 10% от суммы аренды</li>
            <li>Выплаты приходят на привязанную карту</li>
            <li>Автоматические выплаты — каждый понедельник при балансе от 1000 ₽</li>
          </ul>
        </div>

        {/* History */}
        <div>
          <h2 className="text-lg font-semibold text-neutral-900 mb-4">История выплат</h2>

          {payoutsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white rounded-2xl border border-neutral-100 p-4 h-16 animate-pulse" />
              ))}
            </div>
          ) : (payouts?.length ?? 0) === 0 ? (
            <div className="bg-white rounded-2xl border border-neutral-100 p-10 text-center">
              <Wallet className="w-10 h-10 text-neutral-200 mx-auto mb-3" />
              <p className="text-neutral-500">Выплат пока нет</p>
              <p className="text-xs text-neutral-400 mt-1">
                Они появятся после первых завершённых аренд
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {payouts!.map((payout) => {
                const Icon = STATUS_ICONS[payout.status]
                return (
                  <div
                    key={payout.id}
                    className="bg-white rounded-2xl border border-neutral-100 p-4 flex items-center gap-4"
                  >
                    <div className={cn(
                      'flex h-10 w-10 items-center justify-center rounded-xl shrink-0',
                      payout.status === 'paid'
                        ? 'bg-brand-50 text-brand-600'
                        : payout.status === 'failed'
                        ? 'bg-red-50 text-red-500'
                        : 'bg-amber-50 text-amber-500',
                    )}>
                      <Icon className="w-5 h-5" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-neutral-900">{payout.period}</p>
                        <Badge variant={STATUS_VARIANTS[payout.status]}>
                          {STATUS_LABELS[payout.status]}
                        </Badge>
                      </div>
                      <p className="text-xs text-neutral-400 mt-0.5">
                        {payout.bookingsCount} аренд{payout.bookingsCount === 1 ? 'а' : 'ы'} ·{' '}
                        {payout.paidAt ? formatDate(payout.paidAt) : formatDate(payout.createdAt)}
                        {payout.bankCard && ` · Карта •• ${payout.bankCard}`}
                      </p>
                    </div>

                    <p className="text-base font-bold text-neutral-900 shrink-0">
                      {formatPrice(payout.amount)}
                    </p>

                    <ChevronRight className="w-4 h-4 text-neutral-300 shrink-0" />
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
