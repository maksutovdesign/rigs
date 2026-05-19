'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { formatPrice, formatDate } from '@rigs/utils'
import { useAuthStore } from '@/store/auth.store'
import { useInvoices } from '@/hooks/use-business'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { BadgeVariant } from '@/components/ui/badge'

type InvoiceStatus = 'pending' | 'paid' | 'failed'

interface InvoiceRow {
  id: string
  number?: string
  period?: string
  amount?: number
  status?: InvoiceStatus
  createdAt?: string
  pdfUrl?: string
}

const STATUS_LABEL: Record<InvoiceStatus, string> = {
  pending: 'Ожидает',
  paid: 'Оплачен',
  failed: 'Ошибка оплаты',
}

const STATUS_BADGE_VARIANT: Record<InvoiceStatus, BadgeVariant> = {
  pending: 'warning',
  paid: 'success',
  failed: 'danger',
}

export default function BusinessInvoicesPage() {
  const router = useRouter()
  const accessToken = useAuthStore((s) => s.accessToken)
  const { data: invoices, isLoading } = useInvoices()

  useEffect(() => {
    if (!accessToken) router.replace('/auth')
  }, [accessToken, router])

  if (!accessToken) return null

  const rows = (invoices as unknown as InvoiceRow[]) ?? []

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="max-w-5xl mx-auto px-4 py-10 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Счета</h1>
            <p className="text-sm text-gray-500 mt-1">История счетов-фактур по тарифу</p>
          </div>
          <Link href="/business">
            <Button variant="secondary" size="sm">← Назад</Button>
          </Link>
        </div>

        {/* Info box */}
        <div className="bg-blue-50 rounded-2xl border border-blue-100 p-5">
          <h2 className="text-sm font-semibold text-blue-800 mb-1">
            Информация о выставлении счетов
          </h2>
          <p className="text-sm text-blue-700 leading-relaxed">
            Счета-фактуры формируются автоматически в начале каждого платёжного периода (1-го числа
            месяца). Оплаченные счета доступны для скачивания в формате PDF и могут быть
            использованы для бухгалтерской отчётности. Счета с&nbsp;Rigs GmbH доступны для
            юридических лиц и индивидуальных предпринимателей при заполненном профиле компании с ИНН.
          </p>
        </div>

        {/* Table or states */}
        {isLoading ? (
          <div className="bg-white rounded-2xl border border-neutral-100 overflow-hidden">
            <div className="p-5 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-12 bg-neutral-100 rounded-xl animate-pulse" />
              ))}
            </div>
          </div>
        ) : rows.length === 0 ? (
          <div className="bg-white rounded-2xl border border-neutral-100 p-12 flex flex-col items-center gap-4 text-center">
            {/* Illustration placeholder */}
            <div className="w-20 h-20 rounded-2xl bg-neutral-100 flex items-center justify-center">
              <span className="text-4xl">🧾</span>
            </div>
            <div>
              <p className="text-gray-700 font-medium">Счетов пока нет</p>
              <p className="text-sm text-gray-400 mt-1 max-w-xs">
                Счета появятся после первого оплаченного месяца подписки
              </p>
            </div>
            <Link href="/business/upgrade">
              <Button variant="secondary" size="sm">Выбрать тариф</Button>
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-neutral-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-neutral-100">
                    <th className="text-left p-4 font-medium text-gray-400">Номер</th>
                    <th className="text-left p-4 font-medium text-gray-400">Период</th>
                    <th className="text-right p-4 font-medium text-gray-400">Сумма</th>
                    <th className="text-center p-4 font-medium text-gray-400">Статус</th>
                    <th className="text-left p-4 font-medium text-gray-400">Дата</th>
                    <th className="text-right p-4 font-medium text-gray-400">Документ</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((invoice) => {
                    const status: InvoiceStatus = invoice.status ?? 'pending'
                    const invoiceNumber = invoice.number ?? invoice.id.slice(0, 8).toUpperCase()
                    return (
                      <tr
                        key={invoice.id}
                        className="border-b border-neutral-50 last:border-0 hover:bg-neutral-50"
                      >
                        <td className="p-4 font-mono text-gray-700 font-medium">
                          #{invoiceNumber}
                        </td>
                        <td className="p-4 text-gray-600">
                          {invoice.period ?? '—'}
                        </td>
                        <td className="p-4 text-right font-semibold text-gray-900">
                          {invoice.amount !== undefined ? formatPrice(invoice.amount) : '—'}
                        </td>
                        <td className="p-4 text-center">
                          <Badge variant={STATUS_BADGE_VARIANT[status]}>
                            {STATUS_LABEL[status] ?? status}
                          </Badge>
                        </td>
                        <td className="p-4 text-gray-500 text-xs whitespace-nowrap">
                          {invoice.createdAt ? formatDate(invoice.createdAt) : '—'}
                        </td>
                        <td className="p-4 text-right">
                          {invoice.pdfUrl ? (
                            <a
                              href={invoice.pdfUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-brand-600 hover:underline font-medium"
                            >
                              Скачать PDF
                            </a>
                          ) : (
                            <span className="text-xs text-gray-300">Недоступно</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
