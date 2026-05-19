'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { DayPicker, DateRange } from 'react-day-picker'
import { ru } from 'date-fns/locale'
import { formatPrice, calcSubtotal, calcBookingTotal } from '@rigs/utils'
import type { Listing } from '@rigs/types'
import { DeliveryType } from '@rigs/types'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
// react-day-picker v9 stylesheet — import in globals.css or layout:
// @import "react-day-picker/src/style.css";

interface BookingWidgetProps {
  listing: Listing
  isAuthenticated: boolean
}

export function BookingWidget({ listing, isAuthenticated }: BookingWidgetProps) {
  const router = useRouter()
  const [range, setRange] = useState<DateRange | undefined>(undefined)
  const [quantity, setQuantity] = useState(1)
  const [withInsurance, setWithInsurance] = useState(false)
  const [withDelivery, setWithDelivery] = useState(false)
  const [calendarOpen, setCalendarOpen] = useState(false)

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const startDate = range?.from
  const endDate = range?.to ?? range?.from

  const subtotal =
    startDate && endDate
      ? calcSubtotal(listing, startDate, endDate) * quantity
      : 0

  const pricing = calcBookingTotal({
    subtotal,
    withInsurance,
    deliveryFee: withDelivery && listing.deliveryPricePerKm ? listing.deliveryPricePerKm * 5 : 0,
  })

  const daysCount =
    startDate && endDate
      ? Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / 86400000))
      : 0

  function formatDateLabel(date?: Date) {
    if (!date) return 'Выбрать'
    return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
  }

  function handleBook() {
    if (!isAuthenticated) {
      router.push('/auth')
      return
    }
    if (!startDate || !endDate) {
      setCalendarOpen(true)
      return
    }
    const params = new URLSearchParams({
      listingId: listing.id,
      startDate: startDate.toISOString().split('T')[0]!,
      endDate: endDate.toISOString().split('T')[0]!,
      quantity: String(quantity),
      withInsurance: String(withInsurance),
      deliveryType: withDelivery ? DeliveryType.DELIVERY : DeliveryType.PICKUP,
    })
    router.push(`/booking/new?${params.toString()}`)
  }

  return (
    <div className="rounded-2xl border border-gray-200 p-5 space-y-4 bg-white">
      {/* Price header */}
      <div>
        {listing.priceDaily && (
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold text-gray-900">{formatPrice(listing.priceDaily)}</span>
            <span className="text-gray-500">/ день</span>
          </div>
        )}
        {listing.priceHourly && !listing.priceDaily && (
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold text-gray-900">{formatPrice(listing.priceHourly)}</span>
            <span className="text-gray-500">/ час</span>
          </div>
        )}
      </div>

      {/* Date picker trigger */}
      <button
        onClick={() => setCalendarOpen((v) => !v)}
        className="w-full grid grid-cols-2 border border-gray-300 rounded-xl overflow-hidden text-sm"
      >
        <div className="p-3 text-left border-r border-gray-300">
          <div className="text-xs text-gray-500 uppercase tracking-wide mb-0.5">Заезд</div>
          <div className={cn('font-medium', startDate ? 'text-gray-900' : 'text-gray-400')}>
            {formatDateLabel(startDate)}
          </div>
        </div>
        <div className="p-3 text-left">
          <div className="text-xs text-gray-500 uppercase tracking-wide mb-0.5">Выезд</div>
          <div className={cn('font-medium', endDate ? 'text-gray-900' : 'text-gray-400')}>
            {formatDateLabel(endDate)}
          </div>
        </div>
      </button>

      {/* Calendar */}
      {calendarOpen && (
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <DayPicker
            mode="range"
            selected={range}
            onSelect={(r) => { setRange(r); if (r?.from && r?.to) setCalendarOpen(false) }}
            locale={ru}
            disabled={{ before: today }}
            numberOfMonths={1}
            classNames={{
              root: 'p-2',
              day_selected: 'bg-brand-600 text-white',
              day_range_middle: 'bg-brand-100 text-brand-900',
            }}
          />
        </div>
      )}

      {/* Quantity selector */}
      {listing.quantity > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-700">Количество</span>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50 transition-colors text-gray-600"
            >
              −
            </button>
            <span className="text-sm font-medium w-4 text-center">{quantity}</span>
            <button
              onClick={() => setQuantity((q) => Math.min(listing.availableQty, q + 1))}
              className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50 transition-colors text-gray-600"
            >
              +
            </button>
          </div>
        </div>
      )}

      {/* Insurance toggle */}
      <label className="flex items-center justify-between cursor-pointer">
        <div>
          <div className="text-sm font-medium text-gray-700">Страховка</div>
          <div className="text-xs text-gray-500">4% от стоимости аренды</div>
        </div>
        <div
          onClick={() => setWithInsurance((v) => !v)}
          className={cn(
            'relative w-11 h-6 rounded-full transition-colors',
            withInsurance ? 'bg-brand-600' : 'bg-gray-200',
          )}
        >
          <span
            className={cn(
              'absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform',
              withInsurance ? 'left-6' : 'left-1',
            )}
          />
        </div>
      </label>

      {/* Delivery toggle */}
      {listing.deliveryAvailable && (
        <label className="flex items-center justify-between cursor-pointer">
          <div>
            <div className="text-sm font-medium text-gray-700">Доставка</div>
            {listing.deliveryPricePerKm && (
              <div className="text-xs text-gray-500">{formatPrice(listing.deliveryPricePerKm)} / км</div>
            )}
          </div>
          <div
            onClick={() => setWithDelivery((v) => !v)}
            className={cn(
              'relative w-11 h-6 rounded-full transition-colors',
              withDelivery ? 'bg-brand-600' : 'bg-gray-200',
            )}
          >
            <span
              className={cn(
                'absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform',
                withDelivery ? 'left-6' : 'left-1',
              )}
            />
          </div>
        </label>
      )}

      {/* Price breakdown */}
      {subtotal > 0 && (
        <div className="space-y-2 pt-2 border-t border-gray-100 text-sm">
          <div className="flex justify-between text-gray-600">
            <span>
              {formatPrice(listing.priceDaily ?? 0)} × {daysCount} {daysCount === 1 ? 'день' : 'дней'}
              {quantity > 1 ? ` × ${quantity}` : ''}
            </span>
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
            <div className="flex justify-between text-gray-600">
              <span>Залог (возвратный)</span>
              <span>{formatPrice(listing.depositAmount)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-gray-900 pt-2 border-t border-gray-100">
            <span>Итого</span>
            <span>
              {formatPrice(pricing.totalAmount + (listing.depositAmount ?? 0))}
            </span>
          </div>
        </div>
      )}

      {/* CTA */}
      {isAuthenticated ? (
        <Button onClick={handleBook} fullWidth size="lg">
          {startDate && endDate ? 'Забронировать' : 'Выбрать даты'}
        </Button>
      ) : (
        <div className="space-y-2">
          <Button onClick={() => router.push('/auth')} fullWidth size="lg">
            Войти для бронирования
          </Button>
          <p className="text-center text-xs text-gray-500">
            Войдите или зарегистрируйтесь, чтобы забронировать
          </p>
        </div>
      )}

      {listing.instantBook && (
        <p className="text-center text-xs text-blue-600">
          Мгновенное подтверждение — без ожидания хоста
        </p>
      )}
    </div>
  )
}
