import type { Listing } from '@rigs/types'

export const PLATFORM_FEE_RENTER = 0.11
export const PLATFORM_FEE_HOST = 0.17
export const INSURANCE_FEE_BASIC = 0.04
export const INSURANCE_FEE_EXTENDED = 0.08

export function calcRentalDays(startDate: Date, endDate: Date): number {
  const ms = endDate.getTime() - startDate.getTime()
  return Math.ceil(ms / (1000 * 60 * 60 * 24))
}

export function calcRentalHours(startDate: Date, endDate: Date): number {
  const ms = endDate.getTime() - startDate.getTime()
  return Math.ceil(ms / (1000 * 60 * 60))
}

export function calcSubtotal(
  listing: Pick<Listing, 'priceHourly' | 'priceDaily' | 'priceWeekly' | 'priceMonthly'>,
  startDate: Date,
  endDate: Date,
): number {
  const hours = calcRentalHours(startDate, endDate)
  const days = calcRentalDays(startDate, endDate)

  // For rentals under 48h, prefer hourly if available (e.g. 25-hour rental stays hourly)
  if (hours < 48 && listing.priceHourly) {
    return hours * listing.priceHourly
  }
  if (days >= 30 && listing.priceMonthly) {
    const months = Math.ceil(days / 30)
    return months * listing.priceMonthly
  }
  if (days >= 7 && listing.priceWeekly) {
    const weeks = Math.ceil(days / 7)
    return weeks * listing.priceWeekly
  }
  if (listing.priceDaily) {
    return days * listing.priceDaily
  }
  if (listing.priceHourly) {
    return hours * listing.priceHourly
  }
  return 0
}

export function calcBookingTotal(params: {
  subtotal: number
  withInsurance?: boolean
  extendedInsurance?: boolean
  deliveryFee?: number
}) {
  const { subtotal, withInsurance, extendedInsurance, deliveryFee = 0 } = params
  const serviceFee = Math.round(subtotal * PLATFORM_FEE_RENTER)
  const insuranceFee = withInsurance
    ? Math.round(subtotal * (extendedInsurance ? INSURANCE_FEE_EXTENDED : INSURANCE_FEE_BASIC))
    : 0

  return {
    subtotal,
    serviceFee,
    insuranceFee,
    deliveryFee,
    totalAmount: subtotal + serviceFee + insuranceFee + deliveryFee,
    hostPayout: Math.round(subtotal * (1 - PLATFORM_FEE_HOST)),
    hostCommission: Math.round(subtotal * PLATFORM_FEE_HOST),
  }
}

export function formatPrice(amount: number, currency = 'RUB'): string {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount)
}
