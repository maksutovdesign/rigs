'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuthStore } from '@/store/auth.store'
import { api } from '@/lib/api'
import { useQuery } from '@tanstack/react-query'
import { formatDate } from '@rigs/utils'

interface ReferralInfo {
  code: string
  shareUrl: string
}

interface ReferralStats {
  code: string | null
  totalInvited: number
  totalCompleted: number
  totalBonus: number
  referrals: Array<{
    id: string
    code: string
    status: string
    createdAt: string
    completedAt: string | null
    referee: { firstName: string | null; createdAt: string } | null
  }>
}

export default function ReferralPage() {
  const router = useRouter()
  const accessToken = useAuthStore((s) => s.accessToken)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!accessToken) router.replace('/auth')
  }, [accessToken, router])

  const { data: info } = useQuery<ReferralInfo>({
    queryKey: ['referral', 'info'],
    queryFn: async () => {
      const { data } = await api.get<ReferralInfo>('/users/me/referral')
      return data
    },
    enabled: !!accessToken,
  })

  const { data: stats } = useQuery<ReferralStats>({
    queryKey: ['referral', 'stats'],
    queryFn: async () => {
      const { data } = await api.get<ReferralStats>('/users/me/referral/stats')
      return data
    },
    enabled: !!accessToken,
  })

  async function handleCopy() {
    if (!info?.shareUrl) return
    try {
      await navigator.clipboard.writeText(info.shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // ignore
    }
  }

  if (!accessToken) return null

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-10 space-y-6">
        <div className="flex items-center gap-3">
          <Link href="/my/profile" className="text-gray-400 hover:text-gray-600 transition-colors text-sm">
            ← Профиль
          </Link>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Пригласить друзей</h1>

        {/* Referral link */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">Ваша реферальная ссылка</h2>
          {info ? (
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-700 font-mono truncate">
                {info.shareUrl}
              </div>
              <button
                onClick={handleCopy}
                className="shrink-0 px-4 py-3 rounded-xl bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 transition-colors"
              >
                {copied ? 'Скопировано!' : 'Копировать'}
              </button>
            </div>
          ) : (
            <div className="h-12 bg-gray-100 rounded-xl animate-pulse" />
          )}
          <p className="text-xs text-gray-500">
            Поделитесь ссылкой с друзьями. Когда они зарегистрируются — вы оба получите бонус 500 ₽.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Приглашено', value: stats?.totalInvited ?? 0 },
            { label: 'Зарегистрировалось', value: stats?.totalCompleted ?? 0 },
            { label: 'Заработано бонусов', value: stats ? `${stats.totalBonus.toLocaleString('ru-RU')} ₽` : '0 ₽' },
          ].map((item) => (
            <div key={item.label} className="bg-white rounded-2xl border border-gray-100 p-4 text-center">
              <p className="text-2xl font-bold text-gray-900">{item.value}</p>
              <p className="text-xs text-gray-500 mt-1">{item.label}</p>
            </div>
          ))}
        </div>

        {/* How it works */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">Как это работает</h2>
          <ol className="space-y-4">
            {[
              { step: '1', title: 'Пригласите друга', desc: 'Поделитесь своей ссылкой или кодом' },
              { step: '2', title: 'Друг регистрируется', desc: 'Он переходит по ссылке и создаёт аккаунт на Rigs' },
              { step: '3', title: 'Оба получают 500 ₽', desc: 'Бонус зачисляется после первой аренды друга' },
            ].map((item) => (
              <li key={item.step} className="flex items-start gap-4">
                <div className="shrink-0 w-8 h-8 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-sm font-bold">
                  {item.step}
                </div>
                <div>
                  <p className="font-medium text-sm text-gray-900">{item.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{item.desc}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        {/* Referrals list */}
        {stats && stats.referrals.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
            <h2 className="font-semibold text-gray-900">История приглашений</h2>
            <div className="space-y-3">
              {stats.referrals.map((r) => (
                <div key={r.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {r.referee?.firstName ?? 'Ожидает регистрации'}
                    </p>
                    <p className="text-xs text-gray-400">{formatDate(r.createdAt)}</p>
                  </div>
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      r.status === 'completed'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {r.status === 'completed' ? 'Зарегистрирован' : 'Ожидает'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
