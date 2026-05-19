'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Camera, Building2 } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { maskPhone } from '@rigs/utils'
import { KycLevel, UserRole, SubscriptionPlan } from '@rigs/types'
import Link from 'next/link'
import { useCurrentUser } from '@/hooks/use-auth'
import { useAuthStore } from '@/store/auth.store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { StarRating } from '@/components/ui/star-rating'
import { api } from '@/lib/api'
import { useQueryClient } from '@tanstack/react-query'

const KYC_LABELS: Record<KycLevel, string> = {
  [KycLevel.NONE]: 'Не верифицирован',
  [KycLevel.PHONE]: 'Телефон подтверждён',
  [KycLevel.PASSPORT]: 'Паспорт верифицирован',
  [KycLevel.FULL]: 'Полная верификация',
}

const KYC_BADGE_VARIANTS: Record<KycLevel, 'default' | 'warning' | 'success'> = {
  [KycLevel.NONE]: 'default',
  [KycLevel.PHONE]: 'warning',
  [KycLevel.PASSPORT]: 'success',
  [KycLevel.FULL]: 'success',
}

const PLAN_LABELS: Record<SubscriptionPlan, string> = {
  [SubscriptionPlan.FREE]: 'Базовый',
  [SubscriptionPlan.BASIC]: 'Старт',
  [SubscriptionPlan.PRO]: 'Про',
  [SubscriptionPlan.BUSINESS]: 'Бизнес',
}

const PLAN_BADGE_CLASSES: Record<SubscriptionPlan, string> = {
  [SubscriptionPlan.FREE]: 'bg-gray-100 text-gray-700',
  [SubscriptionPlan.BASIC]: 'bg-blue-100 text-blue-700',
  [SubscriptionPlan.PRO]: 'bg-purple-100 text-purple-700',
  [SubscriptionPlan.BUSINESS]: 'bg-brand-100 text-brand-700',
}

const PLAN_FEATURES: Record<SubscriptionPlan, string[]> = {
  [SubscriptionPlan.FREE]: [
    'До 3 активных объявлений',
    'Базовая поддержка',
    'Стандартное размещение в поиске',
  ],
  [SubscriptionPlan.BASIC]: [
    'До 10 активных объявлений',
    'Приоритетная поддержка',
    'Расширенная статистика',
  ],
  [SubscriptionPlan.PRO]: [
    'Неограниченные объявления',
    'Продвижение в поиске',
    'Персональный менеджер',
  ],
  [SubscriptionPlan.BUSINESS]: [
    'Корпоративный кабинет с командой',
    'API-интеграция и брендинг',
    'Выделенная поддержка 24/7',
  ],
}

interface ProfileForm {
  firstName: string
  lastName: string
  email: string
}

export default function ProfilePage() {
  const router = useRouter()
  const accessToken = useAuthStore((s) => s.accessToken)
  const { setUser } = useAuthStore()
  const queryClient = useQueryClient()
  const { data: user, isLoading } = useCurrentUser()
  const fileRef = useRef<HTMLInputElement>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ProfileForm>()

  useEffect(() => {
    if (!accessToken) router.replace('/auth')
  }, [accessToken, router])

  useEffect(() => {
    if (user) {
      reset({
        firstName: user.firstName ?? '',
        lastName: user.lastName ?? '',
        email: user.email ?? '',
      })
      setAvatarUrl(user.avatarUrl ?? null)
    }
  }, [user, reset])

  async function onSubmit(values: ProfileForm) {
    setSaving(true)
    try {
      const { data } = await api.patch('/users/me', values)
      setUser(data)
      queryClient.invalidateQueries({ queryKey: ['users', 'me'] })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } finally {
      setSaving(false)
    }
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const formData = new FormData()
    formData.append('file', file)
    try {
      const { data } = await api.post<{ url: string }>('/upload/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setAvatarUrl(data.url)
      if (user) {
        const updated = { ...user, avatarUrl: data.url }
        setUser(updated)
        queryClient.invalidateQueries({ queryKey: ['users', 'me'] })
      }
    } catch {
      // Handle error silently — show user the local preview
    }
  }

  if (!accessToken) return null

  const displayName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'Пользователь'
  const isHost = user?.role === UserRole.HOST || user?.role === UserRole.BOTH

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-10 space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Профиль</h1>

        {/* Avatar section */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 flex items-center gap-6">
          <div className="relative">
            <div className="w-20 h-20 rounded-full overflow-hidden bg-gray-200">
              {avatarUrl ? (
                <Image src={avatarUrl} alt={displayName} width={80} height={80} className="object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-gray-400">
                  {displayName[0]?.toUpperCase()}
                </div>
              )}
            </div>
            <button
              onClick={() => fileRef.current?.click()}
              className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-brand-600 text-white flex items-center justify-center hover:bg-brand-700 transition-colors"
            >
              <Camera className="w-3.5 h-3.5" />
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarChange}
            />
          </div>
          <div>
            <p className="font-semibold text-gray-900 text-lg">{displayName}</p>
            {user && (
              <p className="text-sm text-gray-500 mt-0.5">{maskPhone(user.phone)}</p>
            )}
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              {user && (
                <Badge variant={KYC_BADGE_VARIANTS[user.kycLevel]}>
                  {KYC_LABELS[user.kycLevel]}
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Ratings */}
        {user && (user.ratingAsRenter !== undefined || user.ratingAsHost !== undefined) && (
          <div className="bg-white rounded-2xl border border-gray-100 p-4 flex gap-6">
            {user.ratingAsRenter !== undefined && (
              <div>
                <p className="text-xs text-gray-500 mb-1">Рейтинг арендатора</p>
                <div className="flex items-center gap-1.5">
                  <StarRating value={user.ratingAsRenter} size="sm" />
                  <span className="text-sm font-medium">{user.ratingAsRenter.toFixed(1)}</span>
                </div>
              </div>
            )}
            {user.ratingAsHost !== undefined && (
              <div>
                <p className="text-xs text-gray-500 mb-1">Рейтинг хоста</p>
                <div className="flex items-center gap-1.5">
                  <StarRating value={user.ratingAsHost} size="sm" />
                  <span className="text-sm font-medium">{user.ratingAsHost.toFixed(1)}</span>
                </div>
              </div>
            )}
            <div>
              <p className="text-xs text-gray-500 mb-1">Аренд</p>
              <p className="text-sm font-semibold">{user.totalRentals}</p>
            </div>
          </div>
        )}

        {/* Edit form */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">Личные данные</h2>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <div key={i} className="h-10 bg-gray-100 rounded-xl animate-pulse" />)}
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Имя"
                  fullWidth
                  {...register('firstName')}
                  error={errors.firstName?.message}
                />
                <Input
                  label="Фамилия"
                  fullWidth
                  {...register('lastName')}
                  error={errors.lastName?.message}
                />
              </div>
              <Input
                label="Email"
                type="email"
                fullWidth
                {...register('email', {
                  pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Некорректный email' },
                })}
                error={errors.email?.message}
              />
              <Button type="submit" loading={saving} fullWidth>
                {saved ? 'Сохранено ✓' : 'Сохранить'}
              </Button>
            </form>
          )}
        </div>

        {/* Subscription plan */}
        {user && (
          <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">Тарифный план</h2>
              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${PLAN_BADGE_CLASSES[user.subscriptionPlan ?? SubscriptionPlan.FREE]}`}>
                {PLAN_LABELS[user.subscriptionPlan ?? SubscriptionPlan.FREE]}
              </span>
            </div>
            <ul className="space-y-1.5">
              {PLAN_FEATURES[user.subscriptionPlan ?? SubscriptionPlan.FREE].map((feature) => (
                <li key={feature} className="flex items-start gap-2 text-sm text-gray-600">
                  <span className="mt-0.5 h-4 w-4 shrink-0 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center text-xs font-bold">✓</span>
                  {feature}
                </li>
              ))}
            </ul>
            {user.subscriptionPlan === SubscriptionPlan.BUSINESS ? (
              <Link
                href="/business"
                className="inline-flex items-center gap-2 text-sm font-medium text-brand-600 hover:text-brand-700 transition-colors"
              >
                <Building2 className="w-4 h-4" />
                Управлять компанией →
              </Link>
            ) : (
              <Link
                href="/business/upgrade"
                className="inline-flex items-center gap-2 text-sm font-medium text-brand-600 hover:text-brand-700 transition-colors"
              >
                <Building2 className="w-4 h-4" />
                Перейти на Бизнес →
              </Link>
            )}
          </div>
        )}

        {/* Quick links */}
        <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-100">
          <Link
            href="/my/payments"
            className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors"
          >
            <span className="text-sm font-medium text-gray-900">История платежей</span>
            <span className="text-gray-400">→</span>
          </Link>
          <Link
            href="/my/rentals"
            className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors"
          >
            <span className="text-sm font-medium text-gray-900">Мои аренды</span>
            <span className="text-gray-400">→</span>
          </Link>
          <Link
            href="/my/wishlist"
            className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors"
          >
            <span className="text-sm font-medium text-gray-900">Избранное</span>
            <span className="text-gray-400">→</span>
          </Link>
          <Link
            href="/my/referral"
            className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors"
          >
            <span className="text-sm font-medium text-gray-900">Пригласить друзей</span>
            <span className="text-gray-400">→</span>
          </Link>
        </div>

        {/* Become host CTA */}
        {!isHost && (
          <div className="bg-brand-50 rounded-2xl border border-brand-100 p-6 flex items-center justify-between">
            <div>
              <p className="font-semibold text-brand-900">Станьте хостом на Rigs</p>
              <p className="text-sm text-brand-700 mt-0.5">Сдавайте снаряжение и зарабатывайте</p>
            </div>
            <Button onClick={() => router.push('/host/dashboard')} size="sm">
              Начать
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
