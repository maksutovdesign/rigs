import { Injectable, Logger } from '@nestjs/common'
import { Cron } from '@nestjs/schedule'
import { PrismaService } from '../../prisma/prisma.service'
import { PaymentsService } from '../payments/payments.service'

/**
 * Scheduled tasks for bookings lifecycle management.
 *
 * TTL auto-cancel: PENDING bookings older than 24 hours are cancelled automatically.
 * This prevents a listing's availability from being blocked forever by unpaid/unconfirmed bookings.
 */
@Injectable()
export class BookingsScheduler {
  private readonly logger = new Logger(BookingsScheduler.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly paymentsService: PaymentsService,
  ) {}

  /**
   * Runs every 15 minutes.
   * Cancels all PENDING bookings that were created more than 24 hours ago
   * and voids any deposit holds that were created alongside them.
   *
   * NOTE: deposit holds are created at booking-creation time (even for
   * pending bookings) when the listing has a depositAmount > 0, so we
   * must explicitly release them here.
   */
  @Cron('0 */15 * * * *')
  async cancelExpiredPendingBookings(): Promise<void> {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1_000)

    // Fetch first — updateMany does not return the affected rows
    const expired = await this.prisma.booking.findMany({
      where: { status: 'pending', createdAt: { lt: cutoff } },
      select: { id: true },
    })
    if (expired.length === 0) return

    await this.prisma.booking.updateMany({
      where: { id: { in: expired.map((b) => b.id) } },
      data: {
        status: 'cancelled_host',
        cancellationReason: 'Автоматическая отмена: истёк срок подтверждения (24 ч)',
        cancelledAt: new Date(),
      },
    })

    // Void any pending deposit holds so the renter's funds are not frozen
    for (const b of expired) {
      try {
        await this.paymentsService.cancelDepositHold(b.id)
      } catch (err: any) {
        this.logger.error(`cancelDepositHold failed for booking ${b.id}: ${err.message}`)
      }
    }

    this.logger.log(`Auto-cancelled ${expired.length} expired pending booking(s)`)
  }

  /**
   * Runs every hour.
   * Marks CONFIRMED/PAID bookings whose endDate has passed as COMPLETED,
   * provided they were never checked in (edge case: host forgot to mark checkin).
   */
  /** Every hour: */
  @Cron('0 0 * * * *')
  async autoCompleteOverdueBookings(): Promise<void> {
    const now = new Date()

    // Fetch first so we can release deposit holds individually
    const overdue = await this.prisma.booking.findMany({
      where: {
        status: { in: ['confirmed', 'paid', 'active'] },
        endDate: { lt: now },
      },
      select: { id: true },
    })
    if (overdue.length === 0) return

    await this.prisma.booking.updateMany({
      where: { id: { in: overdue.map((b) => b.id) } },
      data: {
        status: 'completed',
        checkoutNote: 'Автоматически завершено по истечении срока аренды',
      },
    })

    // Capture any pending deposit holds (charge stays at 0 if no hold exists)
    for (const b of overdue) {
      try {
        await this.paymentsService.captureDepositHold(b.id)
      } catch (err: any) {
        this.logger.error(`captureDepositHold failed for booking ${b.id}: ${err.message}`)
      }
    }

    this.logger.log(`Auto-completed ${overdue.length} overdue booking(s)`)
  }
}
