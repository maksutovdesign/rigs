import { Injectable, ConflictException, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'

@Injectable()
export class WishlistsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(userId: string) {
    const wishlists = await this.prisma.wishlist.findMany({
      where: { userId },
      include: {
        listing: {
          include: {
            media: { where: { isCover: true }, take: 1 },
            category: { select: { slug: true, nameRu: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })
    return wishlists.map((w: { listing: unknown }) => w.listing)
  }

  async add(userId: string, listingId: string) {
    const listing = await this.prisma.listing.findUnique({
      where: { id: listingId },
      select: { priceDaily: true },
    })
    if (!listing) throw new NotFoundException('Объявление не найдено')

    const existing = await this.prisma.wishlist.findUnique({
      where: { userId_listingId: { userId, listingId } },
    })
    if (existing) throw new ConflictException('Уже в избранном')

    return this.prisma.wishlist.create({
      data: { userId, listingId, priceAtSave: listing.priceDaily ?? null },
    })
  }

  async remove(userId: string, listingId: string) {
    await this.prisma.wishlist.deleteMany({ where: { userId, listingId } })
    return { ok: true }
  }

  async isWishlisted(userId: string, listingId: string): Promise<boolean> {
    const record = await this.prisma.wishlist.findUnique({
      where: { userId_listingId: { userId, listingId } },
    })
    return !!record
  }
}
