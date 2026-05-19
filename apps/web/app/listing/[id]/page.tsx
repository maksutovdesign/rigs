'use client'

import Image from 'next/image'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { MapPin, MessageCircle, ChevronDown, ChevronUp, Shield } from 'lucide-react'

const ListingsMap = dynamic(
  () => import('@/components/map/listings-map').then((m) => m.ListingsMap),
  { ssr: false, loading: () => <div className="h-52 rounded-2xl bg-gray-100 animate-pulse" /> },
)
import { formatDate, formatPrice, plural } from '@rigs/utils'
import { KycLevel, ListingCondition, ReviewRole } from '@rigs/types'
import type { Review } from '@rigs/types'
import { useListing } from '@/hooks/use-listings'
import { useAuthStore } from '@/store/auth.store'
import { ListingGallery } from '@/components/listings/listing-gallery'
import { BookingWidget } from '@/components/listings/booking-widget'
import { PriceCalculator } from '@/components/listings/price-calculator'
import { Badge } from '@/components/ui/badge'
import { StarRating } from '@/components/ui/star-rating'
import { api } from '@/lib/api'
import { useQuery } from '@tanstack/react-query'

const CONDITION_LABELS: Record<ListingCondition, string> = {
  [ListingCondition.NEW]: 'Новое',
  [ListingCondition.EXCELLENT]: 'Отличное',
  [ListingCondition.GOOD]: 'Хорошее',
  [ListingCondition.FAIR]: 'Удовлетворительное',
}

function useViewers(listingId: string) {
  return useQuery({
    queryKey: ['viewers', listingId],
    queryFn: async () => {
      await api.post(`/listings/${listingId}/view`)
      const { data } = await api.get<{ count: number }>(`/listings/${listingId}/viewers`)
      return data.count
    },
    refetchInterval: 30_000,
    enabled: !!listingId,
  })
}

function useSimilarListings(listingId: string) {
  return useQuery({
    queryKey: ['listings', 'similar', listingId],
    queryFn: async () => {
      const { data } = await api.get(`/listings/${listingId}/similar`)
      return data as any[]
    },
    enabled: !!listingId,
  })
}

function useListingReviews(listingId: string) {
  return useQuery<Review[]>({
    queryKey: ['reviews', 'listing', listingId],
    queryFn: async () => {
      const { data } = await api.get<Review[]>(`/listings/${listingId}/reviews`)
      return data
    },
    enabled: !!listingId,
  })
}

function DescriptionBlock({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false)
  const isLong = text.length > 300
  const displayed = !isLong || expanded ? text : text.slice(0, 300) + '…'

  return (
    <div>
      <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{displayed}</p>
      {isLong && (
        <button
          onClick={() => setExpanded((v) => !v)}
          className="mt-2 text-sm font-medium text-brand-600 hover:text-brand-700 flex items-center gap-1"
        >
          {expanded ? (
            <>Свернуть <ChevronUp className="w-4 h-4" /></>
          ) : (
            <>Читать полностью <ChevronDown className="w-4 h-4" /></>
          )}
        </button>
      )}
    </div>
  )
}

function ReviewCard({ review }: { review: Review }) {
  const name = [review.reviewer?.firstName, review.reviewer?.lastName].filter(Boolean).join(' ') || 'Пользователь'
  return (
    <div className="flex gap-3">
      <div className="shrink-0">
        {review.reviewer?.avatarUrl ? (
          <Image src={review.reviewer.avatarUrl} alt={name} width={40} height={40} className="rounded-full object-cover" />
        ) : (
          <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-sm font-medium text-gray-500">
            {name[0]?.toUpperCase() ?? 'П'}
          </div>
        )}
      </div>
      <div>
        <div className="flex items-center gap-2 mb-0.5">
          <span className="font-medium text-sm text-gray-900">{name}</span>
          <span className="text-xs text-gray-400">{formatDate(review.createdAt)}</span>
        </div>
        <StarRating value={review.rating} size="sm" />
        {review.text && <p className="mt-1 text-sm text-gray-600">{review.text}</p>}
      </div>
    </div>
  )
}

export default function ListingDetailPage({ params }: { params: { id: string } }) {
  const { id } = params
  const { data: listing, isLoading } = useListing(id)
  const { data: reviews } = useListingReviews(id)
  const { data: similar = [] } = useSimilarListings(id)
  const { data: viewerCount } = useViewers(id)
  const accessToken = useAuthStore((s) => s.accessToken)
  const isAuthenticated = !!accessToken
  const searchParams = useSearchParams()
  const isRepeat = searchParams.get('repeatBooking') === '1'

  useEffect(() => {
    if (isRepeat) {
      setTimeout(() => {
        document.getElementById('booking-widget')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 500)
    }
  }, [isRepeat])

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8 animate-pulse space-y-4">
        <div className="aspect-[16/9] rounded-2xl bg-gray-200" />
        <div className="h-8 w-2/3 bg-gray-200 rounded" />
        <div className="h-4 w-1/3 bg-gray-200 rounded" />
      </div>
    )
  }

  if (!listing) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center text-gray-500">
        <p className="text-lg font-medium">Объявление не найдено</p>
        <Link href="/search" className="mt-4 inline-block text-brand-600 hover:underline">
          Перейти к поиску
        </Link>
      </div>
    )
  }

  const hostName = [listing.host?.firstName, listing.host?.lastName].filter(Boolean).join(' ') || 'Хост'
  const isKycVerified = listing.host?.kycLevel && listing.host.kycLevel !== KycLevel.NONE

  const renterReviews = reviews?.filter((r) => r.role === ReviewRole.RENTER_REVIEWS_HOST) ?? []
  const avgRating = listing.rating ?? 0

  return (
    <div className="bg-white min-h-screen">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Gallery */}
        <ListingGallery media={listing.media} title={listing.title} />

        <div className="mt-8 flex flex-col lg:flex-row gap-10">
          {/* Left column — main content */}
          <div className="flex-1 min-w-0 space-y-8">
            {/* Title + badges */}
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-2">
                {listing.category && (
                  <Badge variant="default">{listing.category.nameRu}</Badge>
                )}
                {listing.instantBook && <Badge variant="info">Мгновенное бронирование</Badge>}
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-1">{listing.title}</h1>
              {viewerCount !== undefined && viewerCount > 1 && (
                <div className="flex items-center gap-1.5 text-sm text-amber-600 font-medium mb-1">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
                  </span>
                  {viewerCount} {plural(viewerCount, ['человек смотрит', 'человека смотрят', 'человек смотрят'])} прямо сейчас
                </div>
              )}
              <div className="flex items-center gap-1 text-gray-500 text-sm">
                <MapPin className="w-4 h-4" />
                <span>{listing.city}{listing.region ? `, ${listing.region}` : ''}</span>
              </div>
            </div>

            {/* Host card */}
            <div className="flex items-start gap-4 p-4 rounded-2xl border border-gray-100 bg-gray-50">
              {listing.host?.avatarUrl ? (
                <Image
                  src={listing.host.avatarUrl}
                  alt={hostName}
                  width={52}
                  height={52}
                  className="rounded-full object-cover shrink-0"
                />
              ) : (
                <div className="w-13 h-13 rounded-full bg-gray-200 flex items-center justify-center text-lg font-bold text-gray-400 shrink-0">
                  {hostName[0]?.toUpperCase()}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <Link href={`/host/${listing.hostId}`} className="font-semibold text-gray-900 hover:text-brand-600 transition-colors">
                    {hostName}
                  </Link>
                  {isKycVerified && (
                    <Badge variant="success" className="gap-1">
                      <Shield className="w-3 h-3" /> Верифицирован
                    </Badge>
                  )}
                </div>
                {listing.host?.ratingAsHost !== undefined && (
                  <div className="flex items-center gap-1 mt-1">
                    <StarRating value={listing.host.ratingAsHost} size="sm" />
                    <span className="text-xs text-gray-500">
                      ({listing.host.ratingAsHost.toFixed(1)})
                    </span>
                  </div>
                )}
                <p className="text-xs text-gray-500 mt-0.5">
                  {listing.host?.totalRentals ?? 0} аренд
                </p>
              </div>
              <Link
                href={`/my/messages?userId=${listing.hostId}`}
                className="flex items-center gap-1.5 text-sm font-medium text-brand-600 border border-brand-600 rounded-xl px-3 py-2 hover:bg-brand-50 transition-colors shrink-0"
              >
                <MessageCircle className="w-4 h-4" />
                Написать
              </Link>
            </div>

            {/* Description */}
            {listing.description && (
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-3">Описание</h2>
                <DescriptionBlock text={listing.description} />
              </div>
            )}

            {/* Inline price calculator (mobile only) */}
            <PriceCalculator listing={listing} />

            {/* Characteristics */}
            {(listing.brand || listing.model || listing.year || listing.condition) && (
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-3">Характеристики</h2>
                <table className="w-full text-sm">
                  <tbody className="divide-y divide-gray-100">
                    {listing.brand && (
                      <tr>
                        <td className="py-2 text-gray-500 w-40">Бренд</td>
                        <td className="py-2 text-gray-900 font-medium">{listing.brand}</td>
                      </tr>
                    )}
                    {listing.model && (
                      <tr>
                        <td className="py-2 text-gray-500">Модель</td>
                        <td className="py-2 text-gray-900 font-medium">{listing.model}</td>
                      </tr>
                    )}
                    {listing.year && (
                      <tr>
                        <td className="py-2 text-gray-500">Год</td>
                        <td className="py-2 text-gray-900 font-medium">{listing.year}</td>
                      </tr>
                    )}
                    <tr>
                      <td className="py-2 text-gray-500">Состояние</td>
                      <td className="py-2 text-gray-900 font-medium">
                        {CONDITION_LABELS[listing.condition]}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            {/* Attributes */}
            {listing.attributes.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-3">Параметры</h2>
                <div className="grid grid-cols-2 gap-2">
                  {listing.attributes.map((attr, i) => (
                    <div key={i} className="flex justify-between text-sm py-2 border-b border-gray-100">
                      <span className="text-gray-500">{attr.key}</span>
                      <span className="font-medium text-gray-900">
                        {attr.value}{attr.unit ? ` ${attr.unit}` : ''}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Requirements */}
            {(listing.requiresPassport || listing.requiresLicense || listing.requiresCert || listing.minAge > 0) && (
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-3">Требования</h2>
                <ul className="space-y-1 text-sm text-gray-700">
                  {listing.minAge > 0 && <li>• Возраст от {listing.minAge} лет</li>}
                  {listing.requiresPassport && <li>• Паспорт гражданина РФ</li>}
                  {listing.requiresLicense && <li>• Водительское удостоверение</li>}
                  {listing.requiresCert && <li>• Специальный сертификат/допуск</li>}
                </ul>
              </div>
            )}

            {/* Delivery info */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">Доставка и получение</h2>
              {listing.deliveryAvailable ? (
                <p className="text-sm text-gray-700">
                  Доступна доставка
                  {listing.deliveryRadiusKm && ` в радиусе ${listing.deliveryRadiusKm} км`}
                  {listing.deliveryPricePerKm && ` · ${formatPrice(Number(listing.deliveryPricePerKm))} / км`}
                </p>
              ) : (
                <p className="text-sm text-gray-700">Только самовывоз — {listing.city}</p>
              )}
            </div>

            {/* Rules */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">Правила</h2>
              <ul className="space-y-1 text-sm text-gray-700">
                <li>• Минимальный срок аренды: {listing.minRentalHours} часов</li>
                {listing.maxRentalDays && <li>• Максимальный срок: {listing.maxRentalDays} дней</li>}
                {listing.depositAmount && (
                  <li>• Залог: {formatPrice(Number(listing.depositAmount))} (возвращается после аренды)</li>
                )}
              </ul>
            </div>

            {/* Map */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">Местоположение</h2>
              <ListingsMap
                listings={[listing]}
                city={listing.city}
                className="h-52 rounded-2xl overflow-hidden"
                onListingClick={() => {}}
              />
            </div>

            {/* Reviews */}
            <div>
              <div className="flex items-center gap-3 mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Отзывы</h2>
                {avgRating > 0 && (
                  <>
                    <StarRating value={avgRating} />
                    <span className="text-sm text-gray-500">{avgRating.toFixed(1)} · {listing.reviewsCount} отзывов</span>
                  </>
                )}
              </div>
              {renterReviews.length > 0 ? (
                <div className="space-y-6">
                  {renterReviews.map((review) => (
                    <ReviewCard key={review.id} review={review} />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400">Пока нет отзывов</p>
              )}
            </div>
          </div>

          {/* Right column — sticky booking widget */}
          <div className="lg:w-80 shrink-0">
            <div id="booking-widget" className="sticky top-24">
              <BookingWidget listing={listing} isAuthenticated={isAuthenticated} />
              {(listing.bookingsCount ?? 0) > 5 && (
                <p className="text-xs text-gray-500 text-center mt-2">
                  🔥 Арендовали {listing.bookingsCount}+ раз
                </p>
              )}
            </div>
          </div>
        </div>
        {similar.length > 0 && (
          <section className="mt-12 border-t border-gray-100 pt-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Похожие объявления</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {similar.map((item: any) => {
                const cover = item.media?.[0]
                return (
                  <Link key={item.id} href={`/listing/${item.id}`} className="group block bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
                    <div className="relative aspect-[4/3] bg-gray-100">
                      {cover && <Image src={cover.url} alt={item.title} fill sizes="(max-width: 768px) 50vw, 33vw" className="object-cover group-hover:scale-105 transition-transform duration-300" />}
                    </div>
                    <div className="p-3">
                      <p className="font-medium text-sm text-gray-900 line-clamp-2">{item.title}</p>
                      {item.priceDaily && <p className="text-sm font-bold text-brand-600 mt-1">{formatPrice(Number(item.priceDaily))} / день</p>}
                    </div>
                  </Link>
                )
              })}
            </div>
          </section>
        )}
      </div>
      {listing && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'Product',
              name: listing.title,
              description: listing.description,
              image: listing.media?.map((m: any) => m.url) ?? [],
              offers: {
                '@type': 'Offer',
                priceCurrency: 'RUB',
                price: listing.priceDaily ?? listing.priceHourly ?? 0,
                availability: 'https://schema.org/InStock',
                seller: { '@type': 'Person', name: [listing.host?.firstName, listing.host?.lastName].filter(Boolean).join(' ') },
              },
              aggregateRating: listing.reviewsCount > 0 ? {
                '@type': 'AggregateRating',
                ratingValue: listing.host?.ratingAsHost ?? 5,
                reviewCount: listing.reviewsCount,
              } : undefined,
            }),
          }}
        />
      )}
    </div>
  )
}
