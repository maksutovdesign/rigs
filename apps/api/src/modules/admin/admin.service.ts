import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboard() {
    const [users, listings, bookings, revenue] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.listing.count({ where: { status: 'active' } }),
      this.prisma.booking.count({ where: { status: { in: ['completed', 'active'] } } }),
      this.prisma.payment.aggregate({
        where: { status: 'completed', type: 'charge' },
        _sum: { amount: true },
      }),
    ])

    return { users, listings, bookings, totalRevenue: revenue._sum.amount ?? 0 }
  }

  async getModerationQueue() {
    return this.prisma.listing.findMany({
      where: { status: 'moderation' },
      include: {
        host: { select: { id: true, firstName: true, phone: true } },
        media: { take: 3 },
        category: true,
      },
      orderBy: { createdAt: 'asc' },
    })
  }

  async approveListing(id: string) {
    return this.prisma.listing.update({ where: { id }, data: { status: 'active' } })
  }

  async rejectListing(id: string, reason: string) {
    return this.prisma.listing.update({
      where: { id },
      data: { status: 'draft', rejectionReason: reason },
    })
  }

  async banUser(id: string) {
    return this.prisma.user.update({ where: { id }, data: { status: 'banned' } })
  }

  async getDisputes() {
    return this.prisma.booking.findMany({
      where: { status: 'disputed' },
      include: {
        listing: { select: { id: true, title: true, media: { where: { isCover: true }, take: 1 } } },
        renter: { select: { id: true, firstName: true, lastName: true, phone: true } },
        host: { select: { id: true, firstName: true, lastName: true, phone: true } },
      },
      orderBy: { disputedAt: 'desc' },
    })
  }

  async resolveDispute(bookingId: string, decision: 'refund_renter' | 'release_host') {
    const booking = await this.prisma.booking.findUnique({ where: { id: bookingId } })
    if (!booking) throw new NotFoundException('Бронирование не найдено')
    if (booking.status !== 'disputed') throw new BadRequestException('Бронирование не в статусе спора')

    if (decision === 'refund_renter') {
      return this.prisma.booking.update({
        where: { id: bookingId },
        data: { status: 'refunded' },
      })
    } else {
      return this.prisma.booking.update({
        where: { id: bookingId },
        data: { status: 'completed' },
      })
    }
  }
}
