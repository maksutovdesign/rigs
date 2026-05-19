import { ListingType, ListingStatus, ListingCondition } from './enums'
import { PublicUser } from './user'
import { Category } from './category'

export interface GeoPoint {
  lat: number
  lng: number
}

export interface ListingAttribute {
  key: string
  value: string
  unit?: string
}

export interface ListingMedia {
  id: string
  url: string
  type: 'photo' | 'video'
  sortOrder: number
  isCover: boolean
}

export interface Listing {
  id: string
  hostId: string
  host?: PublicUser
  categoryId: number
  category?: Category
  title: string
  description?: string
  listingType: ListingType
  status: ListingStatus

  address?: string
  city: string
  region?: string
  country: string
  geoPoint?: GeoPoint
  latitude?: number
  longitude?: number

  brand?: string
  model?: string
  year?: number
  condition: ListingCondition
  quantity: number
  availableQty: number

  priceHourly?: number
  priceDaily?: number
  priceWeekly?: number
  priceMonthly?: number
  depositAmount?: number
  currency: string

  minRentalHours: number
  maxRentalDays?: number
  instantBook: boolean
  deliveryAvailable: boolean
  deliveryRadiusKm?: number
  deliveryPricePerKm?: number

  requiresPassport: boolean
  requiresLicense: boolean
  requiresCert: boolean
  minAge: number

  tags: string[]
  media: ListingMedia[]
  attributes: ListingAttribute[]

  viewsCount: number
  bookingsCount: number
  rating?: number
  reviewsCount: number

  createdAt: string
  updatedAt: string
}

export interface CreateListingDto {
  categoryId: number
  title: string
  description?: string
  listingType: ListingType
  address?: string
  city: string
  region?: string
  geoPoint?: GeoPoint
  brand?: string
  model?: string
  year?: number
  condition: ListingCondition
  quantity?: number
  priceHourly?: number
  priceDaily?: number
  priceWeekly?: number
  priceMonthly?: number
  depositAmount?: number
  minRentalHours?: number
  maxRentalDays?: number
  instantBook?: boolean
  deliveryAvailable?: boolean
  deliveryRadiusKm?: number
  deliveryPricePerKm?: number
  requiresPassport?: boolean
  requiresLicense?: boolean
  requiresCert?: boolean
  minAge?: number
  tags?: string[]
  attributes?: ListingAttribute[]
}

export interface SearchListingsQuery {
  q?: string
  category?: string
  lat?: number
  lng?: number
  radius?: number
  city?: string
  dateFrom?: string
  dateTo?: string
  duration?: 'hourly' | 'daily' | 'weekly'
  priceMin?: number
  priceMax?: number
  condition?: ListingCondition[]
  instantBook?: boolean
  delivery?: boolean
  sort?: 'price_asc' | 'price_desc' | 'rating' | 'distance' | 'newest' | 'popular'
  page?: number
  limit?: number
}

export interface SearchListingsResult {
  items: Listing[]
  total: number
  page: number
  limit: number
  hasMore: boolean
}
