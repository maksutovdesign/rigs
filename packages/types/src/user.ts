import { KycLevel, RenterTier, HostTier, UserRole, UserStatus, SubscriptionPlan } from './enums'

export interface User {
  id: string
  phone: string
  email?: string
  firstName?: string
  lastName?: string
  avatarUrl?: string
  dateOfBirth?: string
  role: UserRole
  status: UserStatus
  kycLevel: KycLevel
  ratingAsHost?: number
  ratingAsRenter?: number
  totalRentals: number
  hostTier?: HostTier
  renterTier?: RenterTier
  subscriptionPlan?: SubscriptionPlan
  createdAt: string
  updatedAt: string
}

export interface PublicUser {
  id: string
  firstName?: string
  lastName?: string
  avatarUrl?: string
  ratingAsHost?: number
  ratingAsRenter?: number
  totalRentals: number
  hostTier?: HostTier
  kycLevel: KycLevel
  createdAt: string
}

export interface UpdateUserDto {
  firstName?: string
  lastName?: string
  email?: string
  dateOfBirth?: string
}
