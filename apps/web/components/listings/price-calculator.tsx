'use client'
import { useState } from 'react'
import { calcSubtotal, calcBookingTotal, formatPrice } from '@rigs/utils'
import type { Listing } from '@rigs/types'

interface PriceCalculatorProps {
  listing: Listing
}

export function PriceCalculator({ listing }: PriceCalculatorProps) {
  const today = new Date()
  const defaultEnd = new Date(today)
  defaultEnd.setDate(defaultEnd.getDate() + 3)

  const [startDate, setStartDate] = useState(today.toISOString().split('T')[0]!)
  const [endDate, setEndDate] = useState(defaultEnd.toISOString().split('T')[0]!)

  const start = new Date(startDate)
  const end = new Date(endDate)
  const subtotal = end > start ? calcSubtotal(listing, start, end) : 0
  const pricing = calcBookingTotal({ subtotal, withInsurance: false, deliveryFee: 0 })

  return (
    <div className="lg:hidden bg-gray-50 rounded-2xl border border-gray-200 p-4 space-y-3">
      <p className="font-semibold text-sm text-gray-900">Рассчитать стоимость</p>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Начало</label>
          <input
            type="date"
            value={startDate}
            min={today.toISOString().split('T')[0]}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full text-sm border border-gray-300 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Конец</label>
          <input
            type="date"
            value={endDate}
            min={startDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full text-sm border border-gray-300 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
      </div>
      {subtotal > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-3 space-y-1.5 text-sm">
          <div className="flex justify-between text-gray-600">
            <span>Аренда</span>
            <span>{formatPrice(pricing.subtotal)}</span>
          </div>
          <div className="flex justify-between text-gray-600">
            <span>Сервисный сбор</span>
            <span>{formatPrice(pricing.serviceFee)}</span>
          </div>
          {listing.depositAmount ? (
            <div className="flex justify-between text-gray-400">
              <span>Залог (возвратный)</span>
              <span>{formatPrice(Number(listing.depositAmount))}</span>
            </div>
          ) : null}
          <div className="flex justify-between font-bold text-gray-900 pt-1.5 border-t border-gray-100">
            <span>Итого</span>
            <span className="text-brand-600">
              {formatPrice(pricing.totalAmount + (listing.depositAmount ? Number(listing.depositAmount) : 0))}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
