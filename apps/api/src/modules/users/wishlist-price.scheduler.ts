import { Injectable, Logger } from '@nestjs/common'
import { Cron } from '@nestjs/schedule'
import { PrismaService } from '../../prisma/prisma.service'
import { NotificationsService } from '../notifications/notifications.service'

@Injectable()
export class WishlistPriceScheduler {
  private readonly logger = new Logger(WishlistPriceScheduler.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  /** Runs every 6 hours — checks for price drops on wishlisted listings */
  @Cron('0 0 */6 * * *')
  async checkPriceDrops(): Promise<void> {
    const drops = await this.prisma.wishlist.findMany({
      where: {
        priceAtSave: { not: null },
        listing: { status: 'active' },
      },
      include: {
        listing: { select: { id: true, title: true, priceDaily: true } },
      },
    })

    for (const entry of drops) {
      if (!entry.priceAtSave || !entry.listing.priceDaily) continue
      const savedPrice = Number(entry.priceAtSave)
      const currentPrice = Number(entry.listing.priceDaily)
      if (currentPrice < savedPrice * 0.95) {
        try {
          await this.notifications.notifyPriceDrop(
            entry.userId,
            entry.listing.title,
            entry.listing.id,
            savedPrice,
            currentPrice,
          )
          await this.prisma.wishlist.update({
            where: { id: entry.id },
            data: { priceAtSave: currentPrice },
          })
        } catch (err: any) {
          this.logger.error(`Price drop notify failed: ${err.message}`)
        }
      }
    }
  }
}
