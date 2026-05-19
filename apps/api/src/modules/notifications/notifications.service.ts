import { Injectable, Logger, OnModuleInit } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import * as admin from 'firebase-admin'
import * as nodemailer from 'nodemailer'
import axios from 'axios'
import { PrismaService } from '../../prisma/prisma.service'

@Injectable()
export class NotificationsService implements OnModuleInit {
  private readonly logger = new Logger(NotificationsService.name)
  private firebaseApp: admin.app.App | null = null

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  onModuleInit(): void {
    const serviceAccountJson = this.config.get<string>('FIREBASE_SERVICE_ACCOUNT')
    if (!serviceAccountJson) {
      this.logger.warn('FIREBASE_SERVICE_ACCOUNT not set — FCM push notifications disabled')
      return
    }
    try {
      const serviceAccount = JSON.parse(serviceAccountJson) as admin.ServiceAccount
      this.firebaseApp = admin.initializeApp(
        { credential: admin.credential.cert(serviceAccount) },
        'rigs',
      )
      this.logger.log('Firebase Admin SDK initialised')
    } catch (err: any) {
      this.logger.error(`Failed to init Firebase Admin: ${err.message}`)
    }
  }

  // ─── Push ────────────────────────────────────────────────────────────────────

  async sendPush(
    userId: string,
    title: string,
    body: string,
    data?: Record<string, string>,
  ): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { fcmToken: true },
    })
    if (!user?.fcmToken) return

    if (!this.firebaseApp) {
      this.logger.debug(`[Push skipped — Firebase not configured] ${title}`)
      return
    }

    try {
      await admin.messaging(this.firebaseApp).send({
        token: user.fcmToken,
        notification: { title, body },
        data,
        android: { priority: 'high' },
        apns: { payload: { aps: { sound: 'default', badge: 1 } } },
      })
      this.logger.log(`Push → user ${userId}: "${title}"`)
    } catch (err: any) {
      this.logger.warn(`Push failed for ${userId}: ${err.message}`)
      // Stale token — clear it so we don't waste quota on next attempt
      if (
        (err as any).code === 'messaging/registration-token-not-registered' ||
        (err as any).code === 'messaging/invalid-argument'
      ) {
        await this.prisma.user.update({
          where: { id: userId },
          data: { fcmToken: null },
        })
      }
    }
  }

  async sendPushToMany(
    userIds: string[],
    title: string,
    body: string,
    data?: Record<string, string>,
  ): Promise<void> {
    await Promise.allSettled(userIds.map((id) => this.sendPush(id, title, body, data)))
  }

  // ─── Domain helpers (called by other services) ───────────────────────────────

  async notifyBookingRequest(hostId: string, listingTitle: string, bookingId: string): Promise<void> {
    await this.sendPush(
      hostId,
      'Новый запрос на бронирование',
      `Запрос на "${listingTitle}"`,
      { screen: 'booking', id: bookingId },
    )
    const email = await this.getUserEmail(hostId)
    if (email) {
      const siteUrl = process.env['SITE_URL'] ?? 'https://rigs.ru'
      await this.sendEmail(
        email,
        'Новый запрос на бронирование — Rigs',
        `<h2>У вас новый запрос на бронирование!</h2><p>Снаряжение: <strong>${listingTitle}</strong></p><p><a href="${siteUrl}/booking/${bookingId}">Открыть запрос →</a></p>`,
      )
    }
  }

  async notifyBookingConfirmed(renterId: string, listingTitle: string, bookingId: string): Promise<void> {
    await this.sendPush(
      renterId,
      'Бронирование подтверждено',
      `Хост подтвердил "${listingTitle}"`,
      { screen: 'booking', id: bookingId },
    )
    const email = await this.getUserEmail(renterId)
    if (email) {
      const siteUrl = process.env['SITE_URL'] ?? 'https://rigs.ru'
      await this.sendEmail(
        email,
        'Бронирование подтверждено — Rigs',
        `<h2>Ваше бронирование подтверждено!</h2><p>Снаряжение: <strong>${listingTitle}</strong></p><p><a href="${siteUrl}/booking/${bookingId}">Открыть бронирование →</a></p>`,
      )
    }
  }

  async notifyBookingCancelled(
    userId: string,
    listingTitle: string,
    bookingId: string,
    byHost: boolean,
  ): Promise<void> {
    await this.sendPush(
      userId,
      'Бронирование отменено',
      byHost
        ? `Хост отменил бронирование "${listingTitle}"`
        : `Вы отменили бронирование "${listingTitle}"`,
      { screen: 'booking', id: bookingId },
    )
    const email = await this.getUserEmail(userId)
    if (email) {
      const siteUrl = process.env['SITE_URL'] ?? 'https://rigs.ru'
      const reason = byHost ? 'Хост отменил бронирование.' : 'Вы отменили бронирование.'
      await this.sendEmail(
        email,
        'Бронирование отменено — Rigs',
        `<h2>Бронирование отменено</h2><p>${reason}</p><p>Снаряжение: <strong>${listingTitle}</strong></p><p><a href="${siteUrl}/booking/${bookingId}">Открыть бронирование →</a></p>`,
      )
    }
  }

  async notifyNewMessage(
    recipientId: string,
    senderName: string,
    conversationId: string,
  ): Promise<void> {
    await this.sendPush(
      recipientId,
      `Сообщение от ${senderName}`,
      'Откройте чат, чтобы прочитать',
      { screen: 'chat', id: conversationId },
    )
  }

  async notifyBookingDisputed(userId: string, listingTitle: string, bookingId: string): Promise<void> {
    await this.sendPush(
      userId,
      'Открыт спор по бронированию',
      `По брони "${listingTitle}" открыт спор`,
      { screen: 'booking', id: bookingId },
    )
  }

  async notifyListingApproved(hostId: string, listingTitle: string, listingId: string): Promise<void> {
    await this.sendPush(
      hostId,
      'Объявление опубликовано',
      `"${listingTitle}" прошло модерацию`,
      { screen: 'listing', id: listingId },
    )
  }

  async notifyListingRejected(
    hostId: string,
    listingTitle: string,
    reason: string,
    listingId: string,
  ): Promise<void> {
    await this.sendPush(
      hostId,
      'Объявление отклонено',
      `"${listingTitle}": ${reason}`,
      { screen: 'listing', id: listingId },
    )
  }

  async notifyPriceDrop(
    userId: string,
    title: string,
    listingId: string,
    oldPrice: number,
    newPrice: number,
  ): Promise<void> {
    const discount = Math.round((1 - newPrice / oldPrice) * 100)
    await this.sendPush(
      userId,
      `Цена снизилась на ${discount}%!`,
      `«${title}» теперь стоит ${newPrice.toLocaleString('ru-RU')} ₽/день`,
      { screen: 'listing', id: listingId },
    )
    const email = await this.getUserEmail(userId)
    if (email) {
      await this.sendEmail(
        email,
        `Цена снизилась на ${discount}% — Rigs`,
        `<h2>Хорошие новости!</h2>
        <p>Снаряжение из вашего списка желаний подешевело на <strong>${discount}%</strong>:</p>
        <p><strong>${title}</strong></p>
        <p>Старая цена: <s>${oldPrice.toLocaleString('ru-RU')} ₽/день</s><br>Новая цена: <strong>${newPrice.toLocaleString('ru-RU')} ₽/день</strong></p>
        <p><a href="${process.env['SITE_URL'] ?? 'https://rigs.ru'}/listing/${listingId}">Забронировать →</a></p>`,
      )
    }
  }

  // ─── Email ───────────────────────────────────────────────────────────────────

  private async sendEmail(to: string, subject: string, html: string): Promise<void> {
    if (!process.env['SMTP_HOST'] || !process.env['SMTP_USER']) return // graceful degradation

    const transporter = nodemailer.createTransport({
      host: process.env['SMTP_HOST'],
      port: Number(process.env['SMTP_PORT'] ?? 587),
      secure: process.env['SMTP_SECURE'] === 'true',
      auth: {
        user: process.env['SMTP_USER'],
        pass: process.env['SMTP_PASS'],
      },
    })

    try {
      await transporter.sendMail({
        from: `"Rigs" <${process.env['SMTP_FROM'] ?? process.env['SMTP_USER']}>`,
        to,
        subject,
        html,
      })
    } catch (err: any) {
      this.logger.error(`Email send failed to ${to}: ${err.message}`)
    }
  }

  private async getUserEmail(userId: string): Promise<string | null> {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { email: true } })
    return user?.email ?? null
  }

  // ─── SMS (SMSC.ru) ───────────────────────────────────────────────────────────

  async sendSms(phone: string, message: string): Promise<void> {
    const login = this.config.get<string>('SMS_LOGIN')
    const password = this.config.get<string>('SMS_PASSWORD')
    const sender = this.config.get<string>('SMS_SENDER', 'RIGS')

    if (!login || !password) {
      this.logger.warn(`[SMS disabled — SMS_LOGIN/SMS_PASSWORD not set] → ${phone}: ${message}`)
      return
    }

    // SMSC.ru REST API: https://smsc.ru/api/
    try {
      const params = new URLSearchParams({
        login,
        psw: password,
        phones: phone,
        mes: message,
        sender,
        charset: 'utf-8',
        fmt: '3', // JSON response
      })
      const { data } = await axios.get<{ id?: number; cnt?: number; error?: string; error_code?: number }>(
        `https://smsc.ru/sys/send.php?${params.toString()}`,
        { timeout: 10_000 },
      )

      if (data.error_code) {
        this.logger.error(`SMS send failed (code ${data.error_code}): ${data.error}`)
      } else {
        this.logger.log(`SMS → ${phone} (id ${data.id}, cnt ${data.cnt})`)
      }
    } catch (err: any) {
      // SMS is non-critical — log and continue
      this.logger.error(`SMS request failed: ${err.message}`)
    }
  }
}
