'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { formatPrice, formatDate } from '@rigs/utils'
import { useAuthStore } from '@/store/auth.store'
import { useCurrentUser } from '@/hooks/use-auth'
import { useBusinessProfile, useBusinessAnalytics, useInvoices } from '@/hooks/use-business'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

export default function BusinessDashboardPage() {
  const router = useRouter()
  const accessToken = useAuthStore((s) => s.accessToken)
  const { data: user } = useCurrentUser()
  const { data: profile, isLoading: profileLoading } = useBusinessProfile()
  const { data: analytics, isLoading: analyticsLoading } = useBusinessAnalytics()
  const { data: invoices, isLoading: invoicesLoading } = useInvoices()

  useEffect(() => {
    if (!accessToken) router.replace('/auth')
  }, [accessToken, router])

  useEffect(() => {
    if (!profileLoading && !profile && accessToken) {
      router.replace('/business/profile')
    }
  }, [profile, profileLoading, accessToken, router])

  if (!accessToken) return null
  if (profileLoading) {
    return (
      <div className="min-h-screen bg-neutral-50">
        <div className="max-w-5xl mx-auto px-4 py-10 space-y-8">
          <div className="h-10 w-48 bg-white rounded-2xl animate-pulse" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-neutral-100 p-5 h-24 animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    )
  }
  if (!profile) return null

  const revenueThisMonth = (analytics as unknown as { revenueThisMonth?: number })?.revenueThisMonth ?? 0
  const activeListings = (analytics as unknown as { activeListings?: number })?.activeListings ?? 0
  const teamSize = (analytics as unknown as { teamSize?: number })?.teamSize ?? 1
  const avgRating = (analytics as unknown as { avgRating?: number })?.avgRating ?? 0

  const quickActions = [
    { label: 'Добавить объявление', href: '/host/listings/new', primary: true },
    { label: 'Команда', href: '/business/team', primary: false },
    { label: 'Аналитика', href: '/business/analytics', primary: false },
    { label: 'Счета', href: '/business/invoices', primary: false },
  ]

  const lastInvoices = invoices?.slice(0, 5) ?? []

  const invoiceStatusVariant: Record<string, 'warning' | 'success' | 'danger'> = {
    pending: 'warning',
    paid: 'success',
    failed: 'danger',
  }

  const invoiceStatusLabel: Record<string, string> = {
    pending: 'Ожидает',
    paid: 'Оплачен',
    failed: 'Ошибка',
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="max-w-5xl mx-auto px-4 py-10 space-y-8">
        {/* Company header */}
        <div className="bg-white rounded-2xl border border-neutral-100 p-5 flex items-center gap-4">
          {profile.logoUrl ? (
            <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-neutral-100 shrink-0">
              <Image src={profile.logoUrl} alt={profile.companyName} fill className="object-cover" sizes="56px" />
            </div>
          ) : (
            <div className="w-14 h-14 rounded-xl bg-brand-100 flex items-center justify-center shrink-0">
              <span className="text-brand-600 text-xl font-bold">
                {profile.companyName?.[0]?.toUpperCase() ?? 'Б'}
              </span>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-gray-900 truncate">{profile.companyName}</h1>
            {profile.contactEmail && (
              <p className="text-sm text-gray-500 mt-0.5">{profile.contactEmail}</p>
            )}
          </div>
          <Link href="/business/profile">
            <Button variant="secondary" size="sm">Редактировать</Button>
          </Link>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {analyticsLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-neutral-100 p-5 h-24 animate-pulse" />
            ))
          ) : (
            <>
              <div className="bg-white rounded-2xl border border-neutral-100 p-5">
                <p className="text-xs text-gray-400 mb-1">Выручка (месяц)</p>
                <p className="text-2xl font-bold text-gray-900">{formatPrice(revenueThisMonth)}</p>
              </div>
              <div className="bg-white rounded-2xl border border-neutral-100 p-5">
                <p className="text-xs text-gray-400 mb-1">Активных объявлений</p>
                <p className="text-2xl font-bold text-gray-900">{activeListings}</p>
              </div>
              <div className="bg-white rounded-2xl border border-neutral-100 p-5">
                <p className="text-xs text-gray-400 mb-1">Участников команды</p>
                <p className="text-2xl font-bold text-gray-900">{teamSize}</p>
              </div>
              <div className="bg-white rounded-2xl border border-neutral-100 p-5">
                <p className="text-xs text-gray-400 mb-1">Средний рейтинг</p>
                <p className="text-2xl font-bold text-gray-900">
                  {avgRating > 0 ? avgRating.toFixed(1) : '—'} {avgRating > 0 && '⭐'}
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

        {/* Last invoices */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Последние счета</h2>
            <Link href="/business/invoices">
              <Button variant="ghost" size="sm">Все счета →</Button>
            </Link>
          </div>
          {invoicesLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-14 bg-white rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : lastInvoices.length === 0 ? (
            <div className="bg-white rounded-2xl border border-neutral-100 p-8 text-center text-gray-400">
              <p>Счетов пока нет</p>
              <p className="text-xs mt-1">Они появятся после первого платёжного периода</p>
            </div>
          ) : (
            <div className="space-y-2">
              {lastInvoices.map((invoice) => {
                const inv = invoice as unknown as {
                  id: string
                  number?: string
                  period?: string
                  amount?: number
                  status?: string
                  createdAt?: string
                  pdfUrl?: string
                }
                const status = inv.status ?? 'pending'
                return (
                  <div
                    key={inv.id}
                    className="bg-white rounded-2xl border border-neutral-100 p-4 flex items-center gap-4"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">
                        Счёт {inv.number ?? inv.id.slice(0, 8).toUpperCase()}
                      </p>
                      <p className="text-xs text-gray-400">
                        {inv.period ?? (inv.createdAt ? formatDate(inv.createdAt) : '')}
                      </p>
                    </div>
                    <span className="text-sm font-semibold text-gray-900 shrink-0">
                      {inv.amount !== undefined ? formatPrice(inv.amount) : '—'}
                    </span>
                    <Badge variant={invoiceStatusVariant[status] ?? 'default'}>
                      {invoiceStatusLabel[status] ?? status}
                    </Badge>
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
