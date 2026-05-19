'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { formatDate, formatPrice } from '@rigs/utils'
import { BookingStatus, DeliveryType } from '@rigs/types'
import { useBooking } from '@/hooks/use-bookings'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { BadgeVariant } from '@/components/ui/badge'
import { api } from '@/lib/api'

const STATUS_LABELS: Record<BookingStatus, string> = {
  [BookingStatus.PENDING]: 'Ожидает подтверждения',
  [BookingStatus.CONFIRMED]: 'Подтверждено',
  [BookingStatus.PAID]: 'Оплачено',
  [BookingStatus.ACTIVE]: 'Активно',
  [BookingStatus.COMPLETED]: 'Завершено',
  [BookingStatus.CANCELLED_RENTER]: 'Отменено арендатором',
  [BookingStatus.CANCELLED_HOST]: 'Отменено хостом',
  [BookingStatus.DISPUTED]: 'Спор',
  [BookingStatus.REFUNDED]: 'Возврат',
}

const STATUS_BADGE_VARIANTS: Record<BookingStatus, BadgeVariant> = {
  [BookingStatus.PENDING]: 'warning',
  [BookingStatus.CONFIRMED]: 'info',
  [BookingStatus.PAID]: 'info',
  [BookingStatus.ACTIVE]: 'success',
  [BookingStatus.COMPLETED]: 'default',
  [BookingStatus.CANCELLED_RENTER]: 'danger',
  [BookingStatus.CANCELLED_HOST]: 'danger',
  [BookingStatus.DISPUTED]: 'danger',
  [BookingStatus.REFUNDED]: 'warning',
}

export default function BookingDetailPage({ params }: { params: { id: string } }) {
  const { id } = params
  const { data: booking, isLoading } = useBooking(id)

  const [hasReviewed, setHasReviewed] = useState(false)
  const [rating, setRating] = useState(0)
  const [reviewComment, setReviewComment] = useState('')
  const [disputeOpen, setDisputeOpen] = useState(false)
  const [disputeReason, setDisputeReason] = useState('')
  const [disputeSubmitted, setDisputeSubmitted] = useState(false)
  const [reviewSubmitting, setReviewSubmitting] = useState(false)
  const [reviewError, setReviewError] = useState('')
  const [disputeSubmitting, setDisputeSubmitting] = useState(false)
  const [disputeError, setDisputeError] = useState('')

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-10 animate-pulse space-y-4">
        <div className="h-8 w-1/2 bg-gray-200 rounded" />
        <div className="h-32 bg-gray-200 rounded-2xl" />
        <div className="h-48 bg-gray-200 rounded-2xl" />
      </div>
    )
  }

  if (!booking) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center text-gray-500">
        <p>Бронирование не найдено.</p>
        <Link href="/my/rentals" className="mt-2 inline-block text-brand-600 hover:underline">
          К списку аренд
        </Link>
      </div>
    )
  }

  const coverMedia = booking.listing?.media.find((m) => m.isCover) ?? booking.listing?.media[0]
  const isActive = booking.status === BookingStatus.ACTIVE
  const isCompleted = booking.status === BookingStatus.COMPLETED

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-10 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Link href="/my/rentals" className="text-sm text-brand-600 hover:underline">
            ← Мои аренды
          </Link>
        </div>

        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">
            Бронирование <span className="font-mono text-sm">{booking.id.slice(0, 8)}</span>
          </h1>
          <Badge variant={STATUS_BADGE_VARIANTS[booking.status]}>
            {STATUS_LABELS[booking.status]}
          </Badge>
        </div>

        {/* Listing info */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 flex gap-4">
          <div className="relative w-24 h-20 rounded-xl overflow-hidden bg-gray-100 shrink-0">
            {coverMedia && (
              <Image src={coverMedia.url} alt={booking.listing?.title ?? ''} fill className="object-cover" sizes="96px" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <Link
              href={`/listing/${booking.listingId}`}
              className="font-semibold text-gray-900 text-sm hover:text-brand-600 line-clamp-2"
            >
              {booking.listing?.title}
            </Link>
            <p className="text-xs text-gray-500 mt-1">{booking.listing?.city}</p>
          </div>
        </div>

        {/* Dates & details */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3 text-sm">
          <h3 className="font-semibold text-gray-900">Детали аренды</h3>
          <div className="flex justify-between text-gray-600">
            <span>Дата начала</span>
            <span className="font-medium text-gray-900">{formatDate(booking.startDate)}</span>
          </div>
          <div className="flex justify-between text-gray-600">
            <span>Дата окончания</span>
            <span className="font-medium text-gray-900">{formatDate(booking.endDate)}</span>
          </div>
          <div className="flex justify-between text-gray-600">
            <span>Количество</span>
            <span className="font-medium text-gray-900">{booking.quantity} ед.</span>
          </div>
          <div className="flex justify-between text-gray-600">
            <span>Тип получения</span>
            <span className="font-medium text-gray-900">
              {booking.deliveryType === DeliveryType.DELIVERY ? 'Доставка' : 'Самовывоз'}
            </span>
          </div>
          {booking.deliveryAddress && (
            <div className="flex justify-between text-gray-600">
              <span>Адрес доставки</span>
              <span className="font-medium text-gray-900 text-right max-w-[60%]">{booking.deliveryAddress}</span>
            </div>
          )}
        </div>

        {/* Pricing */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-2 text-sm">
          <h3 className="font-semibold text-gray-900 mb-3">Стоимость</h3>
          <div className="flex justify-between text-gray-600">
            <span>Аренда</span>
            <span>{formatPrice(booking.subtotal)}</span>
          </div>
          <div className="flex justify-between text-gray-600">
            <span>Сервисный сбор</span>
            <span>{formatPrice(booking.serviceFee)}</span>
          </div>
          {booking.insuranceFee > 0 && (
            <div className="flex justify-between text-gray-600">
              <span>Страховка</span>
              <span>{formatPrice(booking.insuranceFee)}</span>
            </div>
          )}
          {booking.deliveryFee > 0 && (
            <div className="flex justify-between text-gray-600">
              <span>Доставка</span>
              <span>{formatPrice(booking.deliveryFee)}</span>
            </div>
          )}
          {booking.depositAmount > 0 && (
            <div className="flex justify-between text-gray-500">
              <span>Залог (возвратный)</span>
              <span>{formatPrice(booking.depositAmount)}</span>
            </div>
          )}
          {booking.depositAmount > 0 && booking.status !== BookingStatus.COMPLETED && !([BookingStatus.CANCELLED_RENTER, BookingStatus.CANCELLED_HOST, BookingStatus.REFUNDED] as string[]).includes(booking.status) && (
            <div className="flex items-start gap-2 mt-1 rounded-xl bg-blue-50 border border-blue-100 px-3 py-2 text-xs text-blue-700">
              <span>💳</span>
              <span>
                Страховой депозит: <strong>{formatPrice(booking.depositAmount)}</strong> — будет возвращён после завершения аренды
              </span>
            </div>
          )}
          <div className="flex justify-between font-bold text-gray-900 pt-2 border-t border-gray-100">
            <span>Итого</span>
            <span>{formatPrice(booking.totalAmount)}</span>
          </div>
        </div>

        {/* Checkin/checkout codes */}
        {isActive && (booking.checkinCode || booking.checkoutCode) && (
          <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
            <h3 className="font-semibold text-gray-900 text-sm">Коды доступа</h3>
            {booking.checkinCode && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Код заезда</span>
                <span className="font-mono text-lg font-bold text-brand-600 tracking-widest">
                  {booking.checkinCode}
                </span>
              </div>
            )}
            {booking.checkoutCode && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Код выезда</span>
                <span className="font-mono text-lg font-bold text-brand-600 tracking-widest">
                  {booking.checkoutCode}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Photos */}
        {(booking.checkinPhotos.length > 0 || booking.checkoutPhotos.length > 0) && (
          <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
            <h3 className="font-semibold text-gray-900 text-sm">Фото</h3>
            {booking.checkinPhotos.length > 0 && (
              <div>
                <p className="text-xs text-gray-500 mb-2">При получении</p>
                <div className="flex gap-2 overflow-x-auto">
                  {booking.checkinPhotos.map((url, i) => (
                    <div key={i} className="relative w-20 h-16 rounded-lg overflow-hidden shrink-0 bg-gray-100">
                      <Image src={url} alt="" fill sizes="80px" className="object-cover" />
                    </div>
                  ))}
                </div>
              </div>
            )}
            {booking.checkoutPhotos.length > 0 && (
              <div>
                <p className="text-xs text-gray-500 mb-2">При возврате</p>
                <div className="flex gap-2 overflow-x-auto">
                  {booking.checkoutPhotos.map((url, i) => (
                    <div key={i} className="relative w-20 h-16 rounded-lg overflow-hidden shrink-0 bg-gray-100">
                      <Image src={url} alt="" fill sizes="80px" className="object-cover" />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Review form for completed bookings */}
        {isCompleted && !hasReviewed && (
          <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
            <h3 className="font-semibold text-gray-900 text-sm">Оставить отзыв</h3>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setRating(s)}
                  className={`text-2xl transition-colors ${s <= rating ? 'text-amber-400' : 'text-neutral-200'}`}
                >
                  ★
                </button>
              ))}
            </div>
            <textarea
              value={reviewComment}
              onChange={(e) => setReviewComment(e.target.value)}
              placeholder="Расскажите о вашем опыте (необязательно)"
              rows={3}
              className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent resize-none"
            />
            {reviewError && <p className="text-xs text-red-500">{reviewError}</p>}
            <Button
              variant="primary"
              fullWidth
              loading={reviewSubmitting}
              disabled={rating === 0}
              onClick={async () => {
                if (rating === 0) return
                setReviewSubmitting(true)
                setReviewError('')
                try {
                  await api.post('/reviews', { bookingId: id, rating, text: reviewComment })
                  setHasReviewed(true)
                } catch {
                  setReviewError('Не удалось отправить отзыв. Попробуйте ещё раз.')
                } finally {
                  setReviewSubmitting(false)
                }
              }}
            >
              Отправить отзыв
            </Button>
          </div>
        )}

        {isCompleted && hasReviewed && (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-4 text-sm text-green-700 text-center font-medium">
            Спасибо! Ваш отзыв опубликован.
          </div>
        )}

        {/* Dispute modal (inline) */}
        {disputeOpen && (
          <div className="bg-white rounded-2xl border border-red-200 p-4 space-y-3">
            <h3 className="font-semibold text-gray-900">Открыть спор</h3>
            <textarea
              value={disputeReason}
              onChange={(e) => setDisputeReason(e.target.value)}
              placeholder="Опишите причину спора (минимум 20 символов)"
              rows={4}
              className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent resize-none"
            />
            {disputeError && <p className="text-xs text-red-500">{disputeError}</p>}
            <div className="flex gap-3">
              <Button
                variant="secondary"
                fullWidth
                onClick={() => { setDisputeOpen(false); setDisputeReason(''); setDisputeError('') }}
              >
                Отменить
              </Button>
              <Button
                variant="danger"
                fullWidth
                loading={disputeSubmitting}
                disabled={disputeReason.trim().length < 20}
                onClick={async () => {
                  if (disputeReason.trim().length < 20) return
                  setDisputeSubmitting(true)
                  setDisputeError('')
                  try {
                    await api.post(`/bookings/${id}/dispute`, { reason: disputeReason })
                    setDisputeOpen(false)
                    setDisputeReason('')
                    setDisputeSubmitted(true)
                  } catch {
                    setDisputeError('Не удалось подать спор. Попробуйте ещё раз.')
                  } finally {
                    setDisputeSubmitting(false)
                  }
                }}
              >
                Подать спор
              </Button>
            </div>
          </div>
        )}

        {disputeSubmitted && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-sm text-amber-700 text-center font-medium">
            Спор подан. Мы свяжемся с вами в течение 24 часов.
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <Button
            variant="secondary"
            fullWidth
            onClick={() => window.location.href = `/my/messages?bookingId=${booking.id}`}
          >
            Написать хосту
          </Button>
          {isCompleted && !disputeSubmitted && !disputeOpen && (
            <Button
              variant="danger"
              fullWidth
              onClick={() => setDisputeOpen(true)}
            >
              Открыть спор
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
