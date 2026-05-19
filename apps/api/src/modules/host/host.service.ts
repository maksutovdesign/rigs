import { Injectable, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'

export interface HostStats {
  gmbThisMonth: number
  activeListings: number
  pendingBookings: number
  averageRating: number
}

export interface RevenuePoint {
  month: string
  revenue: number
  bookings: number
}

@Injectable()
export class HostService {
  constructor(private readonly prisma: PrismaService) {}

  async getStats(hostId: string): Promise<HostStats> {
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    const [activeListings, pendingBookings, monthlyAgg, user] = await Promise.all([
      this.prisma.listing.count({ where: { hostId, status: 'active' } }),
      this.prisma.booking.count({ where: { hostId, status: 'pending' } }),
      this.prisma.booking.aggregate({
        where: {
          hostId,
          status: { in: ['completed', 'active'] },
          updatedAt: { gte: startOfMonth },
        },
        _sum: { hostPayout: true },
      }),
      this.prisma.user.findUnique({
        where: { id: hostId },
        select: { ratingAsHost: true },
      }),
    ])

    return {
      gmbThisMonth: monthlyAgg._sum.hostPayout ? Number(monthlyAgg._sum.hostPayout) : 0,
      activeListings,
      pendingBookings,
      averageRating: user?.ratingAsHost ? Number(user.ratingAsHost) : 0,
    }
  }

  async getRevenueChart(hostId: string, months = 6): Promise<RevenuePoint[]> {
    const now = new Date()
    const points: RevenuePoint[] = []

    for (let i = months - 1; i >= 0; i--) {
      const start = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59)

      const agg = await this.prisma.booking.aggregate({
        where: {
          hostId,
          status: { in: ['completed', 'active'] },
          updatedAt: { gte: start, lte: end },
        },
        _sum: { hostPayout: true },
        _count: true,
      })

      points.push({
        month: start.toLocaleDateString('ru-RU', { month: 'short', year: '2-digit' }),
        revenue: agg._sum.hostPayout ? Number(agg._sum.hostPayout) : 0,
        bookings: agg._count,
      })
    }

    return points
  }

  async getTopListings(hostId: string, limit = 5) {
    return this.prisma.listing.findMany({
      where: { hostId, status: 'active' },
      orderBy: { bookingsCount: 'desc' },
      take: limit,
      select: {
        id: true,
        title: true,
        priceDaily: true,
        rating: true,
        reviewsCount: true,
        bookingsCount: true,
        viewsCount: true,
        media: { where: { isCover: true }, take: 1, select: { url: true } },
      },
    })
  }

  async getPayoutStats(hostId: string) {
    const unpaid = await this.prisma.booking.aggregate({
      where: { hostId, status: 'completed', hostPayout: { not: null } },
      _sum: { hostPayout: true },
    })
    const paid = await this.prisma.hostPayout.aggregate({
      where: { hostId, status: 'completed' },
      _sum: { amount: true },
    })
    const pending = await this.prisma.hostPayout.aggregate({
      where: { hostId, status: 'pending' },
      _sum: { amount: true },
    })
    const lastPayout = await this.prisma.hostPayout.findFirst({
      where: { hostId },
      orderBy: { createdAt: 'desc' },
      select: { bankAccount: true },
    })
    const bankCard = lastPayout?.bankAccount ? (lastPayout.bankAccount as any)?.lastFour ?? null : null
    const now = new Date()
    const nextPayoutDate = new Date(now.getFullYear(), now.getMonth() + 1, 5).toISOString()
    return {
      availableBalance: Number(unpaid._sum.hostPayout ?? 0) - Number(paid._sum.amount ?? 0) - Number(pending._sum.amount ?? 0),
      pendingBalance: Number(pending._sum.amount ?? 0),
      totalPaid: Number(paid._sum.amount ?? 0),
      currency: 'RUB',
      nextPayoutDate,
      bankCard,
    }
  }

  async getPayouts(hostId: string) {
    const payouts = await this.prisma.hostPayout.findMany({
      where: { hostId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })
    return Promise.all(payouts.map(async (p) => {
      const bookingsCount = p.periodStart && p.periodEnd
        ? await this.prisma.booking.count({
            where: { hostId, status: 'completed', updatedAt: { gte: p.periodStart, lte: p.periodEnd } },
          })
        : 0
      const periodLabel = p.periodStart
        ? new Date(p.periodStart).toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })
        : 'Разовая выплата'
      return {
        id: p.id,
        amount: Number(p.amount),
        currency: 'RUB',
        status: p.status,
        period: periodLabel,
        bookingsCount,
        createdAt: p.createdAt,
        paidAt: p.paidAt,
      }
    }))
  }

  async requestPayout(hostId: string) {
    const stats = await this.getPayoutStats(hostId)
    if (stats.availableBalance <= 0) {
      throw new BadRequestException('Нет средств для вывода')
    }
    const now = new Date()
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const periodEnd = now
    return this.prisma.hostPayout.create({
      data: {
        hostId,
        amount: stats.availableBalance,
        status: 'pending',
        periodStart,
        periodEnd,
      },
    })
  }

  async getCalendar(hostId: string, listingId?: string) {
    const where = listingId
      ? { listing: { hostId }, listingId, isBlocked: false }
      : { listing: { hostId }, isBlocked: false }

    const bookings = await this.prisma.booking.findMany({
      where: {
        hostId,
        ...(listingId && { listingId }),
        status: { in: ['confirmed', 'paid', 'active'] },
        endDate: { gte: new Date() },
      },
      select: {
        id: true,
        listingId: true,
        startDate: true,
        endDate: true,
        status: true,
        renter: { select: { firstName: true, lastName: true } },
        listing: { select: { title: true } },
      },
      orderBy: { startDate: 'asc' },
    })

    return bookings
  }
}
