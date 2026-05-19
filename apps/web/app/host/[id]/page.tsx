'use client'

import type { Metadata } from 'next'

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1'}/users/${params.id}/public`,
      { next: { revalidate: 3600 } },
    )
    if (!res.ok) return {}
    const host = await res.json()
    const name = [host.firstName, host.lastName].filter(Boolean).join(' ')
    return {
      title: `${name} — профиль хоста | Rigs`,
      description: `${host.activeListingsCount} объявлений · рейтинг ${host.ratingAsHost != null ? Number(host.ratingAsHost).toFixed(1) : '—'}`,
    }
  } catch {
    return {}
  }
}

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowLeft, Shield } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { StarRating } from '@/components/ui/star-rating'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ListingMedia {
  id: string
  url: string
  isCover: boolean
}

interface ListingCategory {
  nameRu: string
}

interface PublicListing {
  id: string
  title: string
  priceDaily: number | null
  media: ListingMedia[]
  category: ListingCategory | null
}

interface Reviewer {
  id: string
  firstName: string | null
  lastName: string | null
  avatarUrl: string | null
}

interface PublicReview {
  id: string
  rating: number
  text: string | null
  createdAt: string
  reviewer: Reviewer
}

interface PublicHostProfile {
  id: string
  firstName: string | null
  lastName: string | null
  avatarUrl: string | null
  ratingAsHost: number | null
  ratingAsRenter: number | null
  totalRentals: number
  createdAt: string
  kycLevel: string
  subscriptionPlan: string
  listings: PublicListing[]
  reviewsReceived: PublicReview[]
  activeListingsCount: number
  reviewsCount: number
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatMemberSince(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('ru-RU', { year: 'numeric', month: 'long' })
}

function getInitials(firstName?: string | null, lastName?: string | null): string {
  const parts: string[] = [firstName, lastName].filter((p): p is string => !!p)
  if (parts.length === 0) return 'Х'
  return parts.map((p) => p.charAt(0).toUpperCase()).join('')
}

function getPlanLabel(plan: string): { label: string; variant: 'default' | 'success' | 'warning' | 'info' } {
  switch (plan) {
    case 'business':
      return { label: 'Business', variant: 'warning' }
    case 'pro':
      return { label: 'Pro', variant: 'info' }
    case 'basic':
      return { label: 'Basic', variant: 'success' }
    default:
      return { label: 'Free', variant: 'default' }
  }
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function ProfileSkeleton() {
  return (
    <div className="animate-pulse space-y-8">
      <div className="flex gap-4 items-center">
        <div className="w-20 h-20 rounded-full bg-gray-200 shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-6 w-48 bg-gray-200 rounded" />
          <div className="h-4 w-32 bg-gray-200 rounded" />
          <div className="h-4 w-24 bg-gray-200 rounded" />
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-2xl bg-gray-200 h-52" />
        ))}
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function HostPublicProfilePage({ params }: { params: { id: string } }) {
  const { id } = params
  const [host, setHost] = useState<PublicHostProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1'
    fetch(`${apiUrl}/users/${id}/public`)
      .then((res) => {
        if (res.status === 404) {
          setNotFound(true)
          return null
        }
        if (!res.ok) throw new Error('Ошибка загрузки')
        return res.json()
      })
      .then((data) => {
        if (data) setHost(data)
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <div className="bg-gray-50 min-h-screen">
        <div className="max-w-5xl mx-auto px-4 py-8">
          <ProfileSkeleton />
        </div>
      </div>
    )
  }

  if (notFound || !host) {
    return (
      <div className="bg-gray-50 min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-lg font-medium text-gray-700">Профиль не найден</p>
          <Link href="/" className="text-brand-600 hover:underline text-sm">
            На главную
          </Link>
        </div>
      </div>
    )
  }

  const displayName = [host.firstName, host.lastName].filter(Boolean).join(' ') || 'Хост'
  const isVerified = host.kycLevel && host.kycLevel !== 'none'
  const plan = getPlanLabel(host.subscriptionPlan)
  const showPlanBadge = host.subscriptionPlan !== 'free'

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-10">
        {/* Back */}
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Назад
        </Link>

        {/* Profile card */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 flex flex-col sm:flex-row gap-6 items-start">
          {/* Avatar */}
          <div className="shrink-0">
            {host.avatarUrl ? (
              <Image
                src={host.avatarUrl}
                alt={displayName}
                width={80}
                height={80}
                className="rounded-full object-cover w-20 h-20"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-brand-100 flex items-center justify-center text-2xl font-bold text-brand-600">
                {getInitials(host.firstName, host.lastName)}
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h1 className="text-xl font-bold text-gray-900">{displayName}</h1>
              {isVerified && (
                <Badge variant="success" className="gap-1">
                  <Shield className="w-3 h-3" />
                  Верифицирован
                </Badge>
              )}
              {showPlanBadge && (
                <Badge variant={plan.variant}>{plan.label}</Badge>
              )}
            </div>

            <p className="text-sm text-gray-500 mb-3">
              На сайте с {formatMemberSince(host.createdAt)}
            </p>

            <div className="flex flex-wrap gap-6">
              {host.ratingAsHost != null && (
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Рейтинг хоста</p>
                  <div className="flex items-center gap-1.5">
                    <StarRating value={Number(host.ratingAsHost)} size="sm" />
                    <span className="text-sm font-semibold text-gray-900">
                      {Number(host.ratingAsHost).toFixed(1)}
                    </span>
                  </div>
                </div>
              )}
              {host.ratingAsRenter != null && (
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Рейтинг арендатора</p>
                  <div className="flex items-center gap-1.5">
                    <StarRating value={Number(host.ratingAsRenter)} size="sm" />
                    <span className="text-sm font-semibold text-gray-900">
                      {Number(host.ratingAsRenter).toFixed(1)}
                    </span>
                  </div>
                </div>
              )}
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Всего аренд</p>
                <p className="text-sm font-semibold text-gray-900">{host.totalRentals}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Active listings */}
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Объявления{' '}
            {host.activeListingsCount > 0 && (
              <span className="text-gray-400 font-normal text-base">({host.activeListingsCount})</span>
            )}
          </h2>

          {host.listings.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center text-gray-400 text-sm">
              Нет активных объявлений
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {host.listings.map((l) => {
                const cover = l.media.find((m) => m.isCover) ?? l.media[0]
                return (
                  <Link
                    key={l.id}
                    href={`/listing/${l.id}`}
                    className="block bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-md transition-shadow"
                  >
                    <div className="relative h-40 bg-gray-100">
                      {cover && (
                        <Image
                          src={cover.url}
                          alt={l.title}
                          fill
                          className="object-cover"
                          sizes="300px"
                        />
                      )}
                    </div>
                    <div className="p-3">
                      <p className="font-semibold text-sm text-gray-900 line-clamp-2">{l.title}</p>
                      <p className="text-xs text-gray-500 mt-1">{l.category?.nameRu}</p>
                      {l.priceDaily != null && (
                        <p className="text-sm font-bold text-brand-600 mt-1">{l.priceDaily} ₽/день</p>
                      )}
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </section>

        {/* Reviews */}
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Отзывы о хосте{' '}
            {host.reviewsCount > 0 && (
              <span className="text-gray-400 font-normal text-base">({host.reviewsCount})</span>
            )}
          </h2>

          {host.reviewsReceived.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center text-gray-400 text-sm">
              Пока нет отзывов
            </div>
          ) : (
            <div className="space-y-3">
              {host.reviewsReceived.map((review) => {
                const reviewerName =
                  [review.reviewer.firstName, review.reviewer.lastName].filter(Boolean).join(' ') ||
                  'Пользователь'
                const reviewDate = new Date(review.createdAt).toLocaleDateString('ru-RU', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })
                return (
                  <div key={review.id} className="flex gap-3 p-4 bg-gray-50 rounded-2xl">
                    <div className="shrink-0">
                      {review.reviewer.avatarUrl ? (
                        <Image
                          src={review.reviewer.avatarUrl}
                          alt={reviewerName}
                          width={40}
                          height={40}
                          className="rounded-full object-cover w-10 h-10"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-sm font-medium text-gray-500">
                          {reviewerName[0]?.toUpperCase() ?? 'П'}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                        <span className="font-medium text-sm text-gray-900">{reviewerName}</span>
                        <span className="text-xs text-gray-400">{reviewDate}</span>
                      </div>
                      <StarRating value={review.rating} size="sm" />
                      {review.text && (
                        <p className="mt-1 text-sm text-gray-600">{review.text}</p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
