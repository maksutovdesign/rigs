import type { TeamRole, TeamMemberStatus, SubscriptionPlan, PaymentStatus } from './enums'
import type { User } from './user'

// ── Business Profile ──────────────────────────────────────────────────────────

export interface BusinessProfile {
  id: string
  userId: string
  companyName: string
  inn?: string
  legalAddress?: string
  contactEmail?: string
  website?: string
  description?: string
  logoUrl?: string
  createdAt: string
  updatedAt: string
}

export interface CreateBusinessProfileDto {
  companyName: string
  inn?: string
  legalAddress?: string
  contactEmail?: string
  website?: string
  description?: string
  logoUrl?: string
}

export type UpdateBusinessProfileDto = Partial<CreateBusinessProfileDto>

// ── Team ─────────────────────────────────────────────────────────────────────

export interface TeamMember {
  id: string
  ownerId: string
  memberId?: string
  email: string
  role: TeamRole
  status: TeamMemberStatus
  invitedAt: string
  joinedAt?: string
  member?: Pick<User, 'id' | 'firstName' | 'lastName' | 'avatarUrl' | 'phone'>
}

export interface InviteTeamMemberDto {
  email: string
  role: TeamRole
}

export interface UpdateTeamMemberDto {
  role: TeamRole
}

// ── Invoices ──────────────────────────────────────────────────────────────────

export interface BusinessInvoice {
  id: string
  profileId: string
  number: string
  amount: number
  currency: string
  status: PaymentStatus
  periodStart: string
  periodEnd: string
  pdfUrl?: string
  createdAt: string
  paidAt?: string
}

// ── Analytics ─────────────────────────────────────────────────────────────────

export interface BusinessAnalytics {
  totalRevenue: number
  revenueThisMonth: number
  revenueLastMonth: number
  revenueChange: number      // percent
  totalBookings: number
  bookingsThisMonth: number
  activeListings: number
  teamSize: number
  averageRating: number
  topListings: {
    id: string
    title: string
    revenue: number
    bookingsCount: number
  }[]
  revenueByMonth: {
    month: string            // "2024-01"
    amount: number
  }[]
}

// ── Subscription ──────────────────────────────────────────────────────────────

export interface SubscriptionPlanDetails {
  plan: SubscriptionPlan
  name: string
  price: number              // per month in RUB, 0 = free
  maxListings: number        // -1 = unlimited
  maxTeamMembers: number     // -1 = unlimited, 0 = no team
  features: string[]
}

export interface UpdateSubscriptionDto {
  plan: SubscriptionPlan
}
