'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { formatPrice } from '@rigs/utils'
import { useAuthStore } from '@/store/auth.store'
import { useBusinessAnalytics } from '@/hooks/use-business'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface RevenuePoint {
  month: string
  revenue: number
}

interface TopListing {
  id: string
  title: string
  bookingsCount: number
  revenue: number
}

interface BusinessAnalyticsData {
  revenueThisMonth: number
  revenueLastMonth: number
  totalBookings: number
  revenueChart: RevenuePoint[]
  topListings: TopListing[]
}

function RevenueBarChart({ data }: { data: RevenuePoint[] }) {
  const max = Math.max(...data.map((d) => d.revenue), 1)
  return (
    <div className="flex items-end gap-2 w-full" style={{ height: 120 }}>
      {data.map((point) => {
        const pct = max > 0 ? (point.revenue / max) * 100 : 0
        return (
          <div key={point.month} className="flex flex-col items-center gap-1 flex-1 min-w-0">
            <div className="w-full flex flex-col justify-end" style={{ height: 80 }}>
              <div
                title={point.revenue > 0 ? formatPrice(point.revenue) : '0 ₽'}
                className={cn(
                  'w-full rounded-t-lg transition-all cursor-default',
                  point.revenue > 0 ? 'bg-brand-500 hover:bg-brand-600' : 'bg-neutral-100',
                )}
                style={{ height: `${Math.max(pct, point.revenue > 0 ? 6 : 2)}%` }}
              />
            </div>
            <span className="text-xs text-gray-400 truncate w-full text-center leading-tight">
              {point.month}
            </span>
          </div>
        )
      })}
    </div>
  )
}

function SkeletonCard() {
  return <div className="bg-white rounded-2xl border border-neutral-100 p-5 h-24 animate-pulse" />
}

export default function BusinessAnalyticsPage() {
  const router = useRouter()
  const accessToken = useAuthStore((s) => s.accessToken)
  const { data: analytics, isLoading } = useBusinessAnalytics()

  useEffect(() => {
    if (!accessToken) router.replace('/auth')
  }, [accessToken, router])

  if (!accessToken) return null

  const data = analytics as unknown as BusinessAnalyticsData | undefined

  const revenueThisMonth = data?.revenueThisMonth ?? 0
  const revenueLastMonth = data?.revenueLastMonth ?? 0
  const totalBookings = data?.totalBookings ?? 0
  const revenueChart: RevenuePoint[] = data?.revenueChart ?? []
  const topListings: TopListing[] = data?.topListings ?? []

  const changeRaw =
    revenueLastMonth > 0
      ? ((revenueThisMonth - revenueLastMonth) / revenueLastMonth) * 100
      : revenueThisMonth > 0
      ? 100
      : 0
  const changeSign = changeRaw >= 0 ? '+' : ''
  const changeColor = changeRaw >= 0 ? 'text-green-600' : 'text-red-500'

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="max-w-5xl mx-auto px-4 py-10 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Аналитика</h1>
            <p className="text-sm text-gray-500 mt-1">Показатели за последние 12 месяцев</p>
          </div>
          <Link href="/business">
            <Button variant="secondary" size="sm">← Назад</Button>
          </Link>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
          ) : (
            <>
              <div className="bg-white rounded-2xl border border-neutral-100 p-5">
                <p className="text-xs text-gray-400 mb-1">Выручка (этот месяц)</p>
                <p className="text-2xl font-bold text-gray-900">{formatPrice(revenueThisMonth)}</p>
              </div>
              <div className="bg-white rounded-2xl border border-neutral-100 p-5">
                <p className="text-xs text-gray-400 mb-1">Выручка (прошлый месяц)</p>
                <p className="text-2xl font-bold text-gray-900">{formatPrice(revenueLastMonth)}</p>
              </div>
              <div className="bg-white rounded-2xl border border-neutral-100 p-5">
                <p className="text-xs text-gray-400 mb-1">Изменение</p>
                <p className={cn('text-2xl font-bold', changeColor)}>
                  {changeSign}{changeRaw.toFixed(1)}%
                </p>
              </div>
              <div className="bg-white rounded-2xl border border-neutral-100 p-5">
                <p className="text-xs text-gray-400 mb-1">Всего бронирований</p>
                <p className="text-2xl font-bold text-gray-900">{totalBookings}</p>
              </div>
            </>
          )}
        </div>

        {/* Revenue chart */}
        <div className="bg-white rounded-2xl border border-neutral-100 p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-5">Выручка по месяцам</h2>
          {isLoading ? (
            <div className="h-32 animate-pulse bg-neutral-100 rounded-xl" />
          ) : revenueChart.length === 0 ? (
            <div className="h-32 flex items-center justify-center text-gray-400 text-sm">
              Данных пока недостаточно
            </div>
          ) : (
            <RevenueBarChart data={revenueChart} />
          )}
        </div>

        {/* Top listings table */}
        <div className="bg-white rounded-2xl border border-neutral-100 overflow-hidden">
          <div className="p-5 border-b border-neutral-100">
            <h2 className="text-sm font-semibold text-gray-900">Топ объявлений</h2>
          </div>
          {isLoading ? (
            <div className="p-5 space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-10 bg-neutral-100 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : topListings.length === 0 ? (
            <div className="p-10 text-center text-gray-400 text-sm">
              Нет данных по объявлениям
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-neutral-50">
                    <th className="text-left p-4 font-medium text-gray-400 w-10">#</th>
                    <th className="text-left p-4 font-medium text-gray-400">Объявление</th>
                    <th className="text-right p-4 font-medium text-gray-400">Бронирований</th>
                    <th className="text-right p-4 font-medium text-gray-400">Выручка</th>
                  </tr>
                </thead>
                <tbody>
                  {topListings.map((listing, i) => (
                    <tr key={listing.id} className="border-b border-neutral-50 last:border-0 hover:bg-neutral-50">
                      <td className="p-4 text-gray-300 font-bold text-center">{i + 1}</td>
                      <td className="p-4 text-gray-900 font-medium truncate max-w-xs">
                        {listing.title}
                      </td>
                      <td className="p-4 text-right text-gray-700">{listing.bookingsCount}</td>
                      <td className="p-4 text-right text-gray-900 font-semibold">
                        {formatPrice(listing.revenue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
