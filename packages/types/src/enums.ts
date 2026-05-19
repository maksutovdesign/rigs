export enum UserRole {
  RENTER = 'renter',
  HOST = 'host',
  BOTH = 'both',
  ADMIN = 'admin',
}

export enum UserStatus {
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  BANNED = 'banned',
}

export enum KycLevel {
  NONE = 'none',
  PHONE = 'phone',
  PASSPORT = 'passport',
  FULL = 'full',
}

export enum ListingType {
  EQUIPMENT = 'equipment',
  EXPERIENCE = 'experience',
  LOCATION = 'location',
  PACKAGE = 'package',
}

export enum ListingStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  PAUSED = 'paused',
  ARCHIVED = 'archived',
  MODERATION = 'moderation',
}

export enum ListingCondition {
  NEW = 'new',
  EXCELLENT = 'excellent',
  GOOD = 'good',
  FAIR = 'fair',
}

export enum BookingStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  PAID = 'paid',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  CANCELLED_RENTER = 'cancelled_renter',
  CANCELLED_HOST = 'cancelled_host',
  DISPUTED = 'disputed',
  REFUNDED = 'refunded',
}

export enum DeliveryType {
  PICKUP = 'pickup',
  DELIVERY = 'delivery',
}

export enum PaymentType {
  CHARGE = 'charge',
  HOLD = 'hold',
  RELEASE = 'release',
  REFUND = 'refund',
  PAYOUT = 'payout',
}

export enum PaymentStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export enum PaymentProvider {
  YOOKASSA = 'yookassa',
  TINKOFF = 'tinkoff',
  SBP = 'sbp',
}

export enum ReviewRole {
  RENTER_REVIEWS_HOST = 'renter_reviews_host',
  HOST_REVIEWS_RENTER = 'host_reviews_renter',
}

export enum ReportTargetType {
  LISTING = 'listing',
  USER = 'user',
  REVIEW = 'review',
}

export enum ReportStatus {
  OPEN = 'open',
  REVIEWING = 'reviewing',
  RESOLVED = 'resolved',
  DISMISSED = 'dismissed',
}

export enum HostTier {
  STARTER = 'starter',
  TRUSTED = 'trusted',
  TOP = 'top',
}

export enum RenterTier {
  EXPLORER = 'explorer',
  ADVENTURER = 'adventurer',
  LEGEND = 'legend',
}

export enum SubscriptionPlan {
  FREE = 'free',
  BASIC = 'basic',
  PRO = 'pro',
  BUSINESS = 'business',
}

export enum TeamRole {
  OWNER = 'owner',
  MANAGER = 'manager',
  STAFF = 'staff',
}

export enum TeamMemberStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  REMOVED = 'removed',
}
