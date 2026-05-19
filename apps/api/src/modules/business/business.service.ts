import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common'
import { SubscriptionPlan } from '@prisma/client'
import { PrismaService } from '../../prisma/prisma.service'
import { CreateBusinessProfileDto } from './dto/create-business-profile.dto'
import { UpdateBusinessProfileDto } from './dto/update-business-profile.dto'
import { InviteTeamMemberDto } from './dto/invite-team-member.dto'

@Injectable()
export class BusinessService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Profile ────────────────────────────────────────────────────────────────

  async getProfile(userId: string) {
    const profile = await this.prisma.businessProfile.findUnique({
      where: { userId },
    })
    if (!profile) throw new NotFoundException('Бизнес-профиль не найден')
    return profile
  }

  async createProfile(userId: string, dto: CreateBusinessProfileDto) {
    // NOTE: creating a business profile does NOT upgrade the subscription plan.
    // The user must complete a payment via /payments/subscription to upgrade.
    return this.prisma.businessProfile.create({
      data: {
        userId,
        companyName: dto.companyName,
        inn: dto.inn,
        legalAddress: dto.legalAddress,
        contactEmail: dto.contactEmail,
        website: dto.website,
        description: dto.description,
        logoUrl: dto.logoUrl,
      },
    })
  }

  async updateProfile(userId: string, dto: UpdateBusinessProfileDto) {
    return this.prisma.businessProfile.update({
      where: { userId },
      data: {
        ...(dto.companyName !== undefined && { companyName: dto.companyName }),
        ...(dto.inn !== undefined && { inn: dto.inn }),
        ...(dto.legalAddress !== undefined && { legalAddress: dto.legalAddress }),
        ...(dto.contactEmail !== undefined && { contactEmail: dto.contactEmail }),
        ...(dto.website !== undefined && { website: dto.website }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.logoUrl !== undefined && { logoUrl: dto.logoUrl }),
      },
    })
  }

  // ── Team ───────────────────────────────────────────────────────────────────

  async getTeam(userId: string) {
    return this.prisma.teamMember.findMany({
      where: {
        ownerId: userId,
        status: { not: 'removed' },
      },
      include: {
        member: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
            phone: true,
          },
        },
      },
    })
  }

  async inviteMember(userId: string, dto: InviteTeamMemberDto) {
    const inviteToken = crypto.randomUUID()
    return this.prisma.teamMember.create({
      data: {
        ownerId: userId,
        email: dto.email,
        role: dto.role,
        inviteToken,
      },
    })
  }

  /**
   * Accept a team invite by token.
   * The calling user (acceptorId) is linked as the memberId of the pending invite record.
   * Can be called by an unauthenticated user who opens the invite link — but we require
   * authentication so we know which account to attach the invite to.
   */
  async acceptInvite(acceptorId: string, token: string) {
    const invite = await this.prisma.teamMember.findUnique({
      where: { inviteToken: token },
    })
    if (!invite) throw new NotFoundException('Приглашение не найдено или уже использовано')
    if (invite.status !== 'pending') {
      throw new BadRequestException('Это приглашение уже было принято или отозвано')
    }

    // Prevent the owner from accepting their own invite
    if (invite.ownerId === acceptorId) {
      throw new BadRequestException('Владелец не может принять своё собственное приглашение')
    }

    return this.prisma.teamMember.update({
      where: { id: invite.id },
      data: {
        memberId: acceptorId,
        status: 'active',
        joinedAt: new Date(),
        inviteToken: null, // consume the token
      },
    })
  }

  async removeMember(userId: string, memberId: string) {
    const record = await this.prisma.teamMember.findFirst({
      where: { id: memberId, ownerId: userId },
    })
    if (!record) {
      throw new ForbiddenException('Участник команды не найден или нет прав на удаление')
    }
    return this.prisma.teamMember.update({
      where: { id: memberId },
      data: { status: 'removed' },
    })
  }

  // ── Analytics ──────────────────────────────────────────────────────────────

  async getAnalytics(userId: string) {
    const now = new Date()
    const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59)

    // Get all listings owned by the user
    const userListings = await this.prisma.listing.findMany({
      where: { hostId: userId },
      select: { id: true, title: true },
    })
    const listingIds = userListings.map((l) => l.id)

    // Get all completed bookings for these listings
    const allBookings = await this.prisma.booking.findMany({
      where: {
        listingId: { in: listingIds },
        status: { in: ['completed', 'active'] },
      },
      select: {
        id: true,
        listingId: true,
        totalAmount: true,
        hostPayout: true,
        createdAt: true,
        startDate: true,
        endDate: true,
      },
    })

    // Revenue calculations
    const totalRevenue = allBookings.reduce(
      (sum, b) => sum + (b.hostPayout ? Number(b.hostPayout) : 0),
      0,
    )

    const bookingsThisMonth = allBookings.filter((b) => b.createdAt >= startOfThisMonth)
    const revenueThisMonth = bookingsThisMonth.reduce(
      (sum, b) => sum + (b.hostPayout ? Number(b.hostPayout) : 0),
      0,
    )

    const bookingsLastMonth = allBookings.filter(
      (b) => b.createdAt >= startOfLastMonth && b.createdAt <= endOfLastMonth,
    )
    const revenueLastMonth = bookingsLastMonth.reduce(
      (sum, b) => sum + (b.hostPayout ? Number(b.hostPayout) : 0),
      0,
    )

    const revenueChange =
      revenueLastMonth === 0
        ? revenueThisMonth > 0
          ? 100
          : 0
        : Math.round(((revenueThisMonth - revenueLastMonth) / revenueLastMonth) * 100)

    // Active listings count
    const activeListings = await this.prisma.listing.count({
      where: { hostId: userId, status: 'active' },
    })

    // Average rating
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { ratingAsHost: true },
    })
    const avgRating = user?.ratingAsHost ? Number(user.ratingAsHost) : 0

    // Team size
    const teamSize = await this.prisma.teamMember.count({
      where: { ownerId: userId, status: { not: 'removed' } },
    })

    // Top 5 listings by revenue
    const revenueByListing = new Map<string, number>()
    for (const booking of allBookings) {
      const current = revenueByListing.get(booking.listingId) ?? 0
      revenueByListing.set(booking.listingId, current + (booking.hostPayout ? Number(booking.hostPayout) : 0))
    }
    const listingTitleMap = new Map(userListings.map((l) => [l.id, l.title]))
    const topListings = Array.from(revenueByListing.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([listingId, revenue]) => ({
        listingId,
        title: listingTitleMap.get(listingId) ?? '',
        revenue,
      }))

    // Revenue by month for last 12 months
    const revenueByMonth = Array.from({ length: 12 }, (_, i) => {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1)
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - (11 - i) + 1, 0, 23, 59, 59)
      const year = monthDate.getFullYear()
      const month = String(monthDate.getMonth() + 1).padStart(2, '0')
      const amount = allBookings
        .filter((b) => b.createdAt >= monthDate && b.createdAt <= monthEnd)
        .reduce((sum, b) => sum + (b.hostPayout ? Number(b.hostPayout) : 0), 0)
      return { month: `${year}-${month}`, amount }
    })

    return {
      totalRevenue,
      revenueThisMonth,
      revenueLastMonth,
      revenueChange,
      totalBookings: allBookings.length,
      bookingsThisMonth: bookingsThisMonth.length,
      activeListings,
      avgRating,
      teamSize,
      topListings,
      revenueByMonth,
    }
  }

  // ── Invoices ───────────────────────────────────────────────────────────────

  async getInvoices(userId: string) {
    const profile = await this.prisma.businessProfile.findUnique({
      where: { userId },
    })
    if (!profile) throw new NotFoundException('Бизнес-профиль не найден')
    return this.prisma.businessInvoice.findMany({
      where: { profileId: profile.id },
      orderBy: { createdAt: 'desc' },
    })
  }

  // ── Subscription ───────────────────────────────────────────────────────────

  async updateSubscription(userId: string, plan: SubscriptionPlan) {
    // TODO: integrate with YooKassa subscription payment
    // Only downgrading to FREE is allowed without payment.
    // Upgrading to any paid plan requires a completed payment via /payments/subscription.
    if (plan !== SubscriptionPlan.free) {
      throw new BadRequestException(
        'Для смены тарифа требуется оплата. Используйте /payments/subscription',
      )
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: { subscriptionPlan: plan },
      select: {
        id: true,
        subscriptionPlan: true,
        updatedAt: true,
      },
    })
  }
}
