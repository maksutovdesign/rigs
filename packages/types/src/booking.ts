import { BookingStatus, DeliveryType } from './enums'
import { Listing } from './listing'
import { PublicUser } from './user'

export interface Booking {
  id: string
  listingId: string
  listing?: Listing
  renterId: string
  renter?: PublicUser
  hostId: string
  host?: PublicUser

  status: BookingStatus

  startDate: string
  endDate: string
  quantity: number

  subtotal: number
  serviceFee: number
  insuranceFee: number
  deliveryFee: number
  depositAmount: number
  totalAmount: number

  hostPayout?: number
  hostCommission?: number
  hostPaidAt?: string

  deliveryType: DeliveryType
  deliveryAddress?: string

  checkinPhotos: string[]
  checkoutPhotos: string[]
  checkinNote?: string
  checkoutNote?: string

  checkinCode?: string
  checkoutCode?: string

  cancellationReason?: string
  cancelledAt?: string
  createdAt: string
  updatedAt: string
}

export interface CreateBookingDto {
  listingId: string
  startDate: string
  endDate: string
  quantity?: number
  deliveryType: DeliveryType
  deliveryAddress?: string
  withInsurance?: boolean
}

export interface BookingPricingPreview {
  subtotal: number
  serviceFee: number
  insuranceFee: number
  deliveryFee: number
  depositAmount: number
  totalAmount: number
  hostPayout: number
  days: number
  pricePerDay: number
}
