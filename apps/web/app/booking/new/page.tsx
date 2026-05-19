'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { CheckCircle, ChevronRight } from 'lucide-react'
import { formatPrice, formatDate, calcSubtotal, calcBookingTotal } from '@rigs/utils'
import { DeliveryType } from '@rigs/types'
import { useListing } from '@/hooks/use-listings'
import { useCreateBooking } from '@/hooks/use-bookings'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api'

type Step = 'review' | 'payment' | 'confirmation'

export default function BookingNewPage() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const listingId = searchParams.get('listingId') ?? ''
  const startDateStr = searchParams.get('startDate') ?? ''
  const endDateStr = searchParams.get('endDate') ?? ''
  const quantity = parseInt(searchParams.get('quantity') ?? '1')
  const withInsurance = searchParams.get('withInsurance') === 'true'
  const deliveryType = (searchParams.get('deliveryType') ?? DeliveryType.PICKUP) as DeliveryType

  const { data: listing, isLoading } = useListing(listingId)
  const createBooking = useCreateBooking()
  const [step, setStep] = useState<Step>('review')
  const [bookingId, setBookingId] = useState<string | null>(null)
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null)
  const [paymentError, setPaymentError] = useState<string | null>(null)
  const [insuranceToggle, setInsuranceToggle] = useState(withInsurance)

  const startDate = startDateStr ? new Date(startDateStr) : null
  const endDate = endDateStr ? new Date(endDateStr) : null

  const subtotal =
    listing && startDate && endDate
      ? calcSubtotal(listing, startDate, endDate) * quantity
      : 0

  const pricing = calcBookingTotal({
    subtotal,
    withInsurance: insuranceToggle,
    deliveryFee: deliveryType === DeliveryType.DELIVERY && listing?.deliveryPricePerKm
      ? listing.deliveryPricePerKm * 5
      : 0,
  })

  const coverMedia = listing?.media.find((m) => m.isCover) ?? listing?.media[0]

  async function handlePay() {
    if (!listing || !startDateStr || !endDateStr) return
    setPaymentError(null)
    try {
      const booking = await createBooking.mutateAsync({
        listingId: listing.id,
        startDate: startDateStr,
        endDate: endDateStr,
        quantity,
        deliveryType,
        withInsurance: insuranceToggle,
      })
      setBookingId(booking.id)
      // Initiate payment
      try {
        const { data } = await api.post<{ paymentUrl: string }>('/payments/initiate', {
          bookingId: booking.id,
          amount: pricing.totalAmount + (listing.depositAmount ?? 0),
        })
        setPaymentUrl(data.paymentUrl)
        // Redirect immediately to payment page — don't show URL as text
        window.location.href = data.paymentUrl
        return
      } catch (err: any) {
        setPaymentError(err?.response?.data?.message ?? 'Не удалось инициировать оплату. Попробуйте снова.')
        return // Don't advance to confirmation
      }
      setStep('confirmation')
    } catch {
      // Error handled by mutation state
    }
  }

  const STEPS: { key: Step; label: string }[] = [
    { key: 'review', label: 'Проверка' },
    { key: 'payment', label: 'Оплата' },
    { key: 'confirmation', label: 'Подтверждение' },
  ]

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full" />
      </div>
    )
  }

  if (!listing) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-500">
        Объявление не найдено.{' '}
        <Link href="/search" className="ml-1 text-brand-600 hover:underline">Перейти к поиску</Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-10">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Оформление бронирования</h1>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-8">
          {STEPS.map((s, i) => {
            const currentIndex = STEPS.findIndex((x) => x.key === step)
            const isPast = i < currentIndex
            const isCurrent = i === currentIndex

            const textColor = isCurrent
              ? 'text-brand-600 font-semibold'
              : isPast
              ? 'text-gray-500'
              : 'text-gray-300'

            const circleColor = isPast
              ? 'bg-brand-600 text-white'
              : isCurrent
              ? 'border-2 border-brand-600 text-brand-600'
              : 'border-2 border-gray-300 text-gray-300'

            return (
              <div key={s.key} className="flex items-center gap-2">
                <div className={`flex items-center gap-2 text-sm font-medium ${textColor}`}>
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${circleColor}`}
                  >
                    {isPast ? '✓' : i + 1}
                  </span>
                  {s.label}
                </div>
                {i < STEPS.length - 1 && <ChevronRight className="w-4 h-4 text-gray-300" />}
              </div>
            )
          })}
        </div>

        {/* STEP 1: Review */}
        {step === 'review' && (
          <div className="space-y-4">
            {/* Listing card */}
            <div className="bg-white rounded-2xl border border-gray-100 p-4 flex gap-4">
              <div className="relative w-24 h-20 rounded-xl overflow-hidden bg-gray-100 shrink-0">
                {coverMedia && (
                  <Image src={coverMedia.url} alt={listing.title} fill className="object-cover" sizes="96px" />
                )}
              </div>
              <div>
                <p className="font-semibold text-gray-900 line-clamp-2 text-sm">{listing.title}</p>
                <p className="text-xs text-gray-500 mt-1">{listing.city}</p>
                {startDate && endDate && (
                  <p className="text-xs text-gray-600 mt-1">
                    {formatDate(startDate)} — {formatDate(endDate)}
                  </p>
                )}
                {quantity > 1 && <p className="text-xs text-gray-500">× {quantity} ед.</p>}
              </div>
            </div>

            {/* Insurance toggle */}
            <div className="bg-white rounded-2xl border border-gray-100 p-4">
              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <div className="font-medium text-gray-900">Страховка</div>
                  <div className="text-sm text-gray-500">Защита на время аренды · 4%</div>
                </div>
                <div
                  onClick={() => setInsuranceToggle((v) => !v)}
                  className={`relative w-11 h-6 rounded-full transition-colors ${
                    insuranceToggle ? 'bg-brand-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                      insuranceToggle ? 'left-6' : 'left-1'
                    }`}
                  />
                </div>
              </label>
            </div>

            {/* Delivery info */}
            {deliveryType === DeliveryType.DELIVERY && (
              <div className="bg-white rounded-2xl border border-gray-100 p-4 text-sm text-gray-700">
                Выбрана доставка
              </div>
            )}

            {/* Price breakdown */}
            <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-2 text-sm">
              <h3 className="font-semibold text-gray-900 mb-3">Стоимость</h3>
              <div className="flex justify-between text-gray-600">
                <span>Аренда</span>
                <span>{formatPrice(pricing.subtotal)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Сервисный сбор (11%)</span>
                <span>{formatPrice(pricing.serviceFee)}</span>
              </div>
              {pricing.insuranceFee > 0 && (
                <div className="flex justify-between text-gray-600">
                  <span>Страховка (4%)</span>
                  <span>{formatPrice(pricing.insuranceFee)}</span>
                </div>
              )}
              {pricing.deliveryFee > 0 && (
                <div className="flex justify-between text-gray-600">
                  <span>Доставка</span>
                  <span>{formatPrice(pricing.deliveryFee)}</span>
                </div>
              )}
              {listing.depositAmount && (
                <div className="flex justify-between text-gray-500">
                  <span>Залог (возвратный)</span>
                  <span>{formatPrice(listing.depositAmount)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-gray-900 pt-2 border-t border-gray-100">
                <span>Итого к оплате</span>
                <span>{formatPrice(pricing.totalAmount + (listing.depositAmount ?? 0))}</span>
              </div>
            </div>

            <Button fullWidth size="lg" onClick={() => setStep('payment')}>
              Продолжить к оплате
            </Button>
          </div>
        )}

        {/* STEP 2: Payment */}
        {step === 'payment' && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-gray-100 p-6 text-center space-y-3">
              <p className="text-gray-500 text-sm">К оплате</p>
              <p className="text-3xl font-black text-gray-900">
                {formatPrice(pricing.totalAmount + (listing.depositAmount ?? 0))}
              </p>
              <p className="text-xs text-gray-400">включая залог {formatPrice(listing.depositAmount ?? 0)}</p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 p-4 text-sm text-gray-500">
              Оплата через ЮKassa · Ваши данные защищены
            </div>
            <Button
              fullWidth
              size="lg"
              loading={createBooking.isPending}
              onClick={handlePay}
            >
              Оплатить {formatPrice(pricing.totalAmount + (listing.depositAmount ?? 0))}
            </Button>
            {paymentError && (
              <div className="text-red-600 text-sm mt-2">{paymentError}</div>
            )}
            <Button variant="ghost" fullWidth onClick={() => setStep('review')}>
              Назад
            </Button>
            {createBooking.isError && (
              <p className="text-sm text-red-500 text-center">Ошибка создания бронирования. Попробуйте ещё раз.</p>
            )}
          </div>
        )}

        {/* STEP 3: Confirmation */}
        {step === 'confirmation' && (
          <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center space-y-4">
            <CheckCircle className="w-16 h-16 text-brand-500 mx-auto" />
            <h2 className="text-xl font-bold text-gray-900">Бронирование оформлено!</h2>
            <p className="text-gray-500 text-sm">
              Номер бронирования: <span className="font-mono font-medium text-gray-900">{bookingId}</span>
            </p>
            {paymentUrl && (
              <a
                href={paymentUrl}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-5 py-3 text-sm font-semibold text-white hover:bg-brand-700 transition-colors"
              >
                Перейти к оплате →
              </a>
            )}
            <div className="flex gap-3 pt-2">
              <Button variant="secondary" fullWidth onClick={() => router.push('/my/rentals')}>
                Мои аренды
              </Button>
              <Button fullWidth onClick={() => router.push('/my/messages')}>
                Написать хосту
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
