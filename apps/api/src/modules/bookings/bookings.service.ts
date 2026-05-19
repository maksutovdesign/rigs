import {
  Injectable, NotFoundException, ForbiddenException, BadRequestException, Optional,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { PrismaService } from '../../prisma/prisma.service'
import { Prisma, DeliveryType } from '@prisma/client'
import { PaymentsService } from '../payments/payments.service'
import { NotificationsService } from '../notifications/notifications.service'
import { CreateBookingDto } from './dto/create-booking.dto'
import { CheckinDto } from './dto/checkin.dto'
import { calcSubtotal, calcBookingTotal, generateCode } from '@rigs/utils'

// Статусы, при которых отмена требует возврата средств
const PAID_STATUSES = ['paid', 'active'] as const

@Injectable()
export class BookingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly paymentsService: PaymentsService,
    private readonly config: ConfigService,
    @Optional() private readonly notifications: NotificationsService | null,
  ) {}

  async create(renterId: string, dto: CreateBookingDto) {
    const listing = await this.prisma.listing.findUnique({ where: { id: dto.listingId } })
    if (!listing || listing.status !== 'active') throw new NotFoundException('Объявление недоступно')
    if (listing.hostId === renterId) throw new ForbiddenException('Нельзя арендовать своё снаряжение')

    const start = new Date(dto.startDate)
    const end = new Date(dto.endDate)
    if (end <= start) throw new BadRequestException('Дата окончания должна быть позже начала')

    const quantity = dto.quantity ?? 1

    const subtotal = calcSubtotal(
      {
        priceHourly: listing.priceHourly ? Number(listing.priceHourly) : undefined,
        priceDaily: listing.priceDaily ? Number(listing.priceDaily) : undefined,
        priceWeekly: listing.priceWeekly ? Number(listing.priceWeekly) : undefined,
        priceMonthly: listing.priceMonthly ? Number(listing.priceMonthly) : undefined,
      },
      start,
      end,
    ) * quantity

    const deliveryFee = dto.deliveryType === 'delivery'
      ? (listing.deliveryPricePerKm ? Number(listing.deliveryPricePerKm) * 5 : 500)
      : 0

    const pricing = calcBookingTotal({
      subtotal,
      withInsurance: dto.withInsurance,
      deliveryFee,
    })

    const checkinCode = generateCode(6)
    const checkoutCode = generateCode(6)

    const booking = await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const overlapping = await tx.booking.count({
        where: {
          listingId: dto.listingId,
          status: { in: ['confirmed', 'paid', 'active'] },
          startDate: { lt: end },
          endDate: { gt: start },
        },
      })

      const availableQty = listing.quantity ?? 1
      if (overlapping + quantity > availableQty) {
        throw new BadRequestException('Выбранные даты недоступны — снаряжение уже забронировано')
      }

      return tx.booking.create({
        data: {
          listingId: dto.listingId,
          renterId,
          hostId: listing.hostId,
          startDate: start,
          endDate: end,
          quantity,
          subtotal: pricing.subtotal,
          serviceFee: pricing.serviceFee,
          insuranceFee: pricing.insuranceFee,
          deliveryFee: pricing.deliveryFee,
          depositAmount: listing.depositAmount ?? 0,
          totalAmount: pricing.totalAmount,
          hostPayout: pricing.hostPayout,
          hostCommission: pricing.hostCommission,
          deliveryType: dto.deliveryType as DeliveryType,
          deliveryAddress: dto.deliveryAddress,
          status: listing.instantBook ? 'confirmed' : 'pending',
          checkinCode,
          checkoutCode,
        },
      })
    })

    // Уведомляем хоста о новой заявке
    await this.notifications?.notifyBookingRequest(
      listing.hostId,
      listing.title,
      booking.id,
    )

    // Create deposit hold if listing requires a deposit
    if (Number(listing.depositAmount ?? 0) > 0) {
      const frontendUrl = this.config.get<string>('FRONTEND_URL') ?? 'http://localhost:3000'
      await this.paymentsService.createDepositHold(
        renterId,
        booking.id,
        Number(listing.depositAmount),
        `${frontendUrl}/booking/${booking.id}`,
      )
    }

    return booking
  }

  async findByRenter(renterId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit
    const where = { renterId }
    const [items, total] = await Promise.all([
      this.prisma.booking.findMany({
        where,
        include: { listing: { include: { media: { where: { isCover: true }, take: 1 } } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.booking.count({ where }),
    ])
    return { items, total, page, limit, hasMore: skip + items.length < total }
  }

  async findByHost(hostId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit
    const where = { hostId }
    const [items, total] = await Promise.all([
      this.prisma.booking.findMany({
        where,
        include: {
          listing: { include: { media: { where: { isCover: true }, take: 1 } } },
          renter: { select: { id: true, firstName: true, avatarUrl: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.booking.count({ where }),
    ])
    return { items, total, page, limit, hasMore: skip + items.length < total }
  }

  async findById(userId: string, id: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: { listing: true, renter: true, host: true },
    })
    if (!booking) throw new NotFoundException()
    if (booking.renterId !== userId && booking.hostId !== userId) throw new ForbiddenException()
    return booking
  }

  async confirm(hostId: string, id: string) {
    const booking = await this.assertHostAccess(hostId, id)
    if (booking.status !== 'pending') throw new BadRequestException('Неверный статус')

    const updated = await this.prisma.booking.update({
      where: { id },
      data: { status: 'confirmed' },
      include: { listing: { select: { title: true } } },
    })

    await this.notifications?.notifyBookingConfirmed(
      booking.renterId,
      updated.listing.title,
      id,
    )

    return updated
  }

  async decline(hostId: string, id: string, reason?: string) {
    const booking = await this.assertHostAccess(hostId, id)
    if (booking.status !== 'pending') throw new BadRequestException('Неверный статус для отклонения')

    const listing = await this.prisma.listing.findUnique({
      where: { id: booking.listingId },
      select: { title: true },
    })

    const updated = await this.prisma.booking.update({
      where: { id },
      data: { status: 'cancelled_host', cancellationReason: reason, cancelledAt: new Date() },
    })

    if ((PAID_STATUSES as readonly string[]).includes(booking.status)) {
      await this.paymentsService.refundPayment(id)
    }

    await this.notifications?.notifyBookingCancelled(
      booking.renterId,
      listing?.title ?? '',
      id,
      true,
    )

    return updated
  }

  async cancel(userId: string, id: string, reason?: string) {
    const booking = await this.prisma.booking.findUnique({ where: { id } })
    if (!booking) throw new NotFoundException()
    if (booking.renterId !== userId && booking.hostId !== userId) throw new ForbiddenException()

    const nonCancellableStatuses = ['completed', 'cancelled_renter', 'cancelled_host', 'refunded']
    if (nonCancellableStatuses.includes(booking.status)) {
      throw new BadRequestException(`Нельзя отменить бронь в статусе "${booking.status}"`)
    }

    const status = booking.renterId === userId ? 'cancelled_renter' : 'cancelled_host'
    const updated = await this.prisma.booking.update({
      where: { id },
      data: { status, cancellationReason: reason, cancelledAt: new Date() },
    })

    if ((PAID_STATUSES as readonly string[]).includes(booking.status)) {
      // Cancellation policy (based on time until rental start):
      //   Host cancels:              always 100% refund (customer-friendly)
      //   Renter cancels > 48 h:    100% refund
      //   Renter cancels 24–48 h:   50% refund
      //   Renter cancels < 24 h:    0% refund (booking amount forfeited)
      let refundRatio = 1
      if (booking.renterId === userId) {
        const hoursUntilStart =
          (new Date(booking.startDate).getTime() - Date.now()) / 3_600_000
        if (hoursUntilStart > 48) {
          refundRatio = 1
        } else if (hoursUntilStart > 24) {
          refundRatio = 0.5
        } else {
          refundRatio = 0
        }
      }
      await this.paymentsService.refundPayment(id, refundRatio)
    }

    // Void the deposit hold regardless of paid status
    await this.paymentsService.cancelDepositHold(id)

    const listing = await this.prisma.listing.findUnique({
      where: { id: booking.listingId },
      select: { title: true },
    })
    const notifyUserId = booking.renterId === userId ? booking.hostId : booking.renterId
    await this.notifications?.notifyBookingCancelled(
      notifyUserId,
      listing?.title ?? '',
      id,
      booking.hostId === userId,
    )

    return updated
  }

  async checkin(userId: string, id: string, dto: CheckinDto) {
    // Both host and renter can confirm the handover (gear received)
    const booking = await this.assertParticipantAccess(userId, id)
    if (booking.status !== 'paid' && booking.status !== 'confirmed') {
      throw new BadRequestException('Нельзя выдать — заявка не оплачена')
    }
    return this.prisma.booking.update({
      where: { id },
      data: { status: 'active', checkinPhotos: dto.photos, checkinNote: dto.note },
    })
  }

  async checkout(userId: string, id: string, dto: CheckinDto) {
    // Both host and renter can confirm the return (gear handed back)
    const booking = await this.assertParticipantAccess(userId, id)
    if (booking.status !== 'active') throw new BadRequestException('Аренда не активна')

    const updated = await this.prisma.booking.update({
      where: { id },
      data: { status: 'completed', checkoutPhotos: dto.photos, checkoutNote: dto.note },
      include: { listing: { select: { title: true } } },
    })

    // Capture deposit hold now that booking is completed
    await this.paymentsService.captureDepositHold(id)

    // Уведомляем обоих участников об оставлении отзыва
    await Promise.all([
      this.notifications?.sendPush(
        booking.renterId,
        'Аренда завершена!',
        `Оставьте отзыв о "${updated.listing.title}"`,
        { screen: 'booking', id, action: 'review' },
      ),
      this.notifications?.sendPush(
        booking.hostId,
        'Снаряжение возвращено',
        `Оставьте отзыв об арендаторе по брони "${updated.listing.title}"`,
        { screen: 'booking', id, action: 'review' },
      ),
    ])

    return updated
  }

  async createDispute(userId: string, id: string, reason: string) {
    const booking = await this.prisma.booking.findUnique({ where: { id } })
    if (!booking) throw new NotFoundException()
    if (booking.renterId !== userId && booking.hostId !== userId) throw new ForbiddenException()

    if (booking.status !== 'active' && booking.status !== 'completed') {
      throw new BadRequestException('Спор можно открыть только по активной или завершённой аренде')
    }

    const updated = await this.prisma.booking.update({
      where: { id },
      data: { status: 'disputed', disputeReason: reason, disputedAt: new Date() },
      include: { listing: { select: { title: true } } },
    })

    const otherPartyId = booking.renterId === userId ? booking.hostId : booking.renterId
    await this.notifications?.notifyBookingDisputed(otherPartyId, updated.listing.title, id)

    return updated
  }

  private async assertHostAccess(hostId: string, bookingId: string) {
    const booking = await this.prisma.booking.findUnique({ where: { id: bookingId } })
    if (!booking) throw new NotFoundException()
    if (booking.hostId !== hostId) throw new ForbiddenException()
    return booking
  }

  /** Allows either the host or the renter to access the booking. */
  private async assertParticipantAccess(userId: string, bookingId: string) {
    const booking = await this.prisma.booking.findUnique({ where: { id: bookingId } })
    if (!booking) throw new NotFoundException()
    if (booking.hostId !== userId && booking.renterId !== userId) throw new ForbiddenException()
    return booking
  }
}
