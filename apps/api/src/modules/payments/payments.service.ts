import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Logger, OnModuleInit } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import * as crypto from 'crypto'
import { v4 as uuidv4 } from 'uuid'
import { YooCheckout } from '@a2seven/yoo-checkout'
import { PrismaService } from '../../prisma/prisma.service'

@Injectable()
export class PaymentsService implements OnModuleInit {
  private readonly logger = new Logger(PaymentsService.name)
  private yooCheckout: YooCheckout | null = null

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  onModuleInit(): void {
    const shopId = this.config.get<string>('YOOKASSA_SHOP_ID')
    const secretKey = this.config.get<string>('YOOKASSA_SECRET_KEY')

    if (!shopId || !secretKey) {
      this.logger.warn('YOOKASSA_SHOP_ID or YOOKASSA_SECRET_KEY not set — payments will use stub mode')
      return
    }

    this.yooCheckout = new YooCheckout({ shopId, secretKey })
    this.logger.log('YooKassa SDK initialised')
  }

  async getUserPayments(userId: string) {
    return this.prisma.payment.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        booking: {
          select: {
            id: true,
            startDate: true,
            endDate: true,
            listing: { select: { title: true, media: { where: { isCover: true }, take: 1 } } },
          },
        },
      },
    })
  }

  async initiatePayment(userId: string, bookingId: string) {
    const booking = await this.prisma.booking.findUnique({ where: { id: bookingId } })
    if (!booking) throw new NotFoundException('Бронирование не найдено')

    if (booking.renterId !== userId) {
      throw new ForbiddenException('Нет доступа к этому бронированию')
    }

    if (!['pending', 'confirmed'].includes(booking.status)) {
      throw new BadRequestException('Бронирование уже оплачено или не может быть оплачено')
    }

    // Return existing pending payment if one exists
    const existingPayment = await this.prisma.payment.findFirst({
      where: { bookingId, status: 'pending', type: 'charge' },
    })
    if (existingPayment?.paymentUrl) {
      return { paymentUrl: existingPayment.paymentUrl, amount: booking.totalAmount }
    }

    const frontendUrl = this.config.get<string>('FRONTEND_URL') ?? 'http://localhost:3000'
    const returnUrl = `${frontendUrl}/booking/${bookingId}`
    const idempotenceKey = uuidv4()

    let paymentUrl: string
    let providerId: string | undefined

    if (this.yooCheckout) {
      try {
        const yooPayment = await this.yooCheckout.createPayment(
          {
            amount: { value: Number(booking.totalAmount).toFixed(2), currency: 'RUB' },
            confirmation: { type: 'redirect', return_url: returnUrl },
            description: `Аренда #${bookingId}`,
            capture: true,
            metadata: { bookingId, userId },
          },
          idempotenceKey,
        )

        paymentUrl = (yooPayment.confirmation as any)?.confirmation_url ?? returnUrl
        providerId = yooPayment.id
      } catch (err: any) {
        this.logger.error(`YooKassa createPayment failed: ${err.message}`)
        throw new BadRequestException('Не удалось создать платёж. Попробуйте позже.')
      }
    } else {
      // Stub mode for local development
      paymentUrl = `https://yookassa.ru/checkout/payments/stub_${bookingId}`
    }

    await this.prisma.payment.create({
      data: {
        bookingId,
        userId,
        type: 'charge',
        amount: booking.totalAmount,
        status: 'pending',
        provider: 'yookassa',
        providerId,
        paymentUrl,
      },
    })

    return { paymentUrl, amount: booking.totalAmount }
  }

  /**
   * Issue a (partial or full) refund for a booking.
   *
   * @param bookingId   The booking to refund
   * @param refundRatio 0–1 multiplier applied to the original payment amount.
   *                    Defaults to 1 (full refund).
   */
  async refundPayment(bookingId: string, refundRatio = 1): Promise<void> {
    const payment = await this.prisma.payment.findFirst({
      where: { bookingId, status: 'completed', type: 'charge' },
      orderBy: { createdAt: 'desc' },
    })

    if (!payment) {
      this.logger.warn(`refundPayment: no completed payment for booking ${bookingId}`)
      return
    }

    // Cap ratio to [0, 1]
    const ratio = Math.min(1, Math.max(0, refundRatio))
    if (ratio === 0) {
      this.logger.log(`refundPayment: ratio=0 for booking ${bookingId}, no money returned`)
      return
    }

    const originalAmount = Number(payment.amount)
    const refundAmount = Math.round(originalAmount * ratio * 100) / 100

    if (this.yooCheckout && payment.providerId) {
      try {
        await this.yooCheckout.createRefund(
          {
            payment_id: payment.providerId,
            amount: { value: refundAmount.toFixed(2), currency: 'RUB' },
          },
          uuidv4(),
        )
      } catch (err: any) {
        this.logger.error(`YooKassa createRefund failed: ${err.message}`)
      }
    }

    await this.prisma.$transaction([
      this.prisma.payment.update({
        where: { id: payment.id },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        data: { status: (ratio === 1 ? 'refunded' : 'partially_refunded') as any },
      }),
      this.prisma.payment.create({
        data: {
          bookingId,
          userId: payment.userId,
          type: 'refund',
          amount: refundAmount,
          status: 'completed',
          provider: payment.provider,
        },
      }),
    ])

    this.logger.log(
      `Refund issued for booking ${bookingId}: ${refundAmount} (${Math.round(ratio * 100)}% of ${originalAmount})`,
    )
  }

  // ─── Deposit Hold ───────────────────────────────────────────────────────────

  /** Create an authorization hold for a deposit amount. */
  async createDepositHold(
    userId: string,
    bookingId: string,
    depositAmount: number,
    returnUrl: string,
  ): Promise<{ holdUrl: string | undefined }> {
    if (depositAmount <= 0) return { holdUrl: undefined }

    const idempotenceKey = uuidv4()
    let holdUrl: string | undefined
    let providerId: string | undefined

    if (this.yooCheckout) {
      try {
        const yooPayment = await this.yooCheckout.createPayment(
          {
            amount: { value: depositAmount.toFixed(2), currency: 'RUB' },
            capture: false, // ← authorization hold, not immediate charge
            confirmation: { type: 'redirect', return_url: returnUrl },
            description: `Депозит по бронированию ${bookingId}`,
            metadata: { bookingId, type: 'deposit_hold' },
          },
          idempotenceKey,
        )
        holdUrl = (yooPayment as any).confirmation?.confirmation_url
        providerId = yooPayment.id
      } catch (err: any) {
        this.logger.error(`YooKassa createDepositHold failed: ${err.message}`)
        // Non-fatal: booking proceeds without deposit hold
      }
    }

    await this.prisma.payment.create({
      data: {
        bookingId,
        userId,
        type: 'hold' as any,
        amount: depositAmount,
        status: 'pending',
        provider: 'yookassa',
        providerId,
        paymentUrl: holdUrl,
      },
    })

    return { holdUrl }
  }

  /** Capture (charge) a deposit hold — called when booking is completed. */
  async captureDepositHold(bookingId: string): Promise<void> {
    const holdPayment = await this.prisma.payment.findFirst({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      where: { bookingId, type: 'hold' as any, status: 'pending' },
    })
    if (!holdPayment?.providerId) return

    // If YooKassa is configured, perform the remote capture FIRST.
    // Only mark the DB row completed if the remote call succeeds — otherwise
    // we'd silently leave the hold uncollected while pretending the deposit
    // was charged.
    if (this.yooCheckout) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (this.yooCheckout as any).capturePayment(
          holdPayment.providerId,
          { amount: { value: Number(holdPayment.amount).toFixed(2), currency: 'RUB' } },
          uuidv4(),
        )
      } catch (err: any) {
        this.logger.error(`YooKassa captureDepositHold failed: ${err.message}`)
        return // Leave row in 'pending' for a retry / manual review
      }
    }

    await this.prisma.payment.update({
      where: { id: holdPayment.id },
      data: { status: 'completed' },
    })
  }

  /** Cancel (void) a deposit hold — called when booking is cancelled. */
  async cancelDepositHold(bookingId: string): Promise<void> {
    const holdPayment = await this.prisma.payment.findFirst({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      where: { bookingId, type: 'hold' as any, status: 'pending' },
    })
    if (!holdPayment?.providerId) return

    if (this.yooCheckout) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (this.yooCheckout as any).cancelPayment(holdPayment.providerId, uuidv4())
      } catch (err: any) {
        this.logger.error(`YooKassa cancelDepositHold failed: ${err.message}`)
        return // Leave row in 'pending' for retry; do not mark cancelled
      }
    }

    await this.prisma.payment.update({
      where: { id: holdPayment.id },
      data: { status: 'failed' },
    })
  }

  // ─── Webhook ────────────────────────────────────────────────────────────────

  verifyWebhookSignature(_rawBody: Buffer, signatureHeader: string): boolean {
    const secret = this.config.get<string>('YOOKASSA_WEBHOOK_SECRET')
    if (!secret) {
      this.logger.error('YOOKASSA_WEBHOOK_SECRET not set — webhooks unprotected!')
      return false
    }
    // YooKassa sends: Authorization: Bearer <webhook-secret>
    // The controller strips "Bearer " and passes the raw secret here.
    // We do a constant-time comparison to prevent timing attacks.
    const expected = Buffer.from(secret, 'utf-8')
    const received = Buffer.from(signatureHeader, 'utf-8')
    if (expected.length !== received.length) return false
    return crypto.timingSafeEqual(expected, received)
  }

  async handleWebhook(payload: any) {
    const { object, event } = payload

    if (event === 'payment.succeeded') {
      // Idempotency: skip if this provider payment was already marked completed
      const alreadyProcessed = await this.prisma.payment.findFirst({
        where: { providerId: object.id, status: 'completed' },
      })
      if (alreadyProcessed) {
        this.logger.log(`payment.succeeded for providerId ${object.id} already processed — skipping`)
        return { ok: true }
      }

      const payment = await this.prisma.payment.findFirst({ where: { providerId: object.id } })
      if (payment) {
        await this.prisma.$transaction([
          this.prisma.payment.update({ where: { id: payment.id }, data: { status: 'completed' } }),
          this.prisma.booking.update({ where: { id: payment.bookingId }, data: { status: 'paid' } }),
        ])
        this.logger.log(`Payment completed for booking ${payment.bookingId}`)
      }
    }

    if (event === 'payment.canceled') {
      const payment = await this.prisma.payment.findFirst({ where: { providerId: object.id } })
      if (payment) {
        await this.prisma.payment.update({ where: { id: payment.id }, data: { status: 'failed' } })
      }
    }

    if (event === 'refund.succeeded') {
      const payment = await this.prisma.payment.findFirst({
        where: { providerId: object.payment_id, type: 'charge' },
      })
      if (payment) {
        await this.prisma.booking.update({
          where: { id: payment.bookingId },
          data: { status: 'refunded' },
        })
      }
    }

    return { ok: true }
  }
}
