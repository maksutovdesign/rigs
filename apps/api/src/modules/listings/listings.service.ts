import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Inject } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { CreateListingDto } from './dto/create-listing.dto'
import { UpdateListingDto } from './dto/update-listing.dto'
import { SearchListingsDto } from './dto/search-listings.dto'
import { BlockDatesDto } from './dto/block-dates.dto'
import { Prisma } from '@prisma/client'
import { SearchService } from '../search/search.service'
import Redis from 'ioredis'
import { REDIS_CLIENT } from '../../redis/redis.module'

@Injectable()
export class ListingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly searchService: SearchService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  private async invalidateSearchCache() {
    const keys = await this.redis.keys('search:*')
    if (keys.length > 0) {
      await this.redis.del(...keys)
    }
  }

  async search(query: SearchListingsDto) {
    const {
      page = 1, limit = 20,
      city, category, priceMin, priceMax, instantBook, sort,
      delivery, condition, dateFrom, dateTo,
    } = query
    const skip = (page - 1) * limit

    const cacheKey = `search:${JSON.stringify(query)}`
    const cached = await this.redis.get(cacheKey)
    if (cached) {
      try { return JSON.parse(cached) } catch { /* ignore parse errors */ }
    }

    // Date-availability filter: exclude listings that have an overlapping confirmed booking
    // covering the entire requested window (i.e. no available slot exists).
    // We use a NOT-exists subquery via Prisma nested filter.
    const dateFilter: Prisma.ListingWhereInput =
      dateFrom && dateTo
        ? {
            NOT: {
              bookings: {
                some: {
                  status: { in: ['confirmed', 'paid', 'active'] },
                  startDate: { lte: new Date(dateTo) },
                  endDate: { gte: new Date(dateFrom) },
                },
              },
            },
          }
        : {}

    const where: Prisma.ListingWhereInput = {
      status: 'active',
      ...(city && { city: { contains: city, mode: 'insensitive' } }),
      ...(priceMin !== undefined && { priceDaily: { gte: priceMin } }),
      ...(priceMax !== undefined && { priceDaily: { lte: priceMax } }),
      ...(instantBook !== undefined && { instantBook }),
      ...(delivery !== undefined && { deliveryAvailable: delivery }),
      ...(condition && { condition: condition as any }),
      ...(category && { category: { slug: category } }),
      ...dateFilter,
    }

    const orderBy: Prisma.ListingOrderByWithRelationInput =
      sort === 'price_asc' ? { priceDaily: 'asc' }
      : sort === 'price_desc' ? { priceDaily: 'desc' }
      : sort === 'newest' ? { createdAt: 'desc' }
      : sort === 'popular' ? { bookingsCount: 'desc' }
      : { rating: 'desc' }

    const [items, total] = await Promise.all([
      this.prisma.listing.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          media: { where: { isCover: true }, take: 1 },
          category: { select: { slug: true, nameRu: true } },
          host: { select: { id: true, firstName: true, avatarUrl: true, kycLevel: true } },
        },
      }),
      this.prisma.listing.count({ where }),
    ])

    const result = { items, total, page, limit, hasMore: skip + items.length < total }
    await this.redis.setex(cacheKey, 300, JSON.stringify(result)) // 5 min TTL
    return result
  }

  async findById(id: string, userId?: string) {
    const listing = await this.prisma.listing.findUnique({
      where: { id },
      include: {
        media: { orderBy: { sortOrder: 'asc' } },
        attributes: true,
        category: true,
        host: {
          select: {
            id: true, firstName: true, lastName: true, avatarUrl: true,
            kycLevel: true, ratingAsHost: true, totalRentals: true, createdAt: true,
          },
        },
      },
    })
    if (!listing) throw new NotFoundException('Объявление не найдено')

    if (userId) {
      this.prisma.listing.update({ where: { id }, data: { viewsCount: { increment: 1 } } })
        .catch(() => { /* view count is non-critical */ })
    }

    return listing
  }

  /** Max active listings per subscription plan. */
  private static readonly PLAN_LIMITS: Record<string, number> = {
    free: 3,
    basic: 10,
    pro: 50,
    business: 9999,
  }

  async create(hostId: string, dto: CreateListingDto) {
    // Enforce per-plan listing limits
    const host = await this.prisma.user.findUnique({ where: { id: hostId }, select: { subscriptionPlan: true } })
    const plan = host?.subscriptionPlan ?? 'free'
    const limit = ListingsService.PLAN_LIMITS[plan] ?? 3
    const activeCount = await this.prisma.listing.count({
      where: { hostId, status: { notIn: ['archived'] } },
    })
    if (activeCount >= limit) {
      throw new BadRequestException(
        `Ваш тариф «${plan}» позволяет размещать не более ${limit} объявлений. Перейдите на более высокий план.`,
      )
    }

    const { attributes, ...rest } = dto
    const created = await this.prisma.listing.create({
      data: {
        ...rest,
        hostId,
        status: 'moderation',
        attributes: attributes
          ? { createMany: { data: attributes } }
          : undefined,
      } as Prisma.ListingUncheckedCreateInput,
      include: { media: true, attributes: true },
    })
    await this.invalidateSearchCache()
    return created
  }

  async update(userId: string, id: string, dto: UpdateListingDto) {
    const listing = await this.prisma.listing.findUnique({ where: { id } })
    if (!listing) throw new NotFoundException()
    if (listing.hostId !== userId) throw new ForbiddenException()
    const updated = await this.prisma.listing.update({
      where: { id },
      data: dto as Prisma.ListingUncheckedUpdateInput,
    })
    if (dto.status === 'active') {
      await this.searchService.indexListing(id)
    }
    await this.invalidateSearchCache()
    return updated
  }

  async archive(userId: string, id: string) {
    const listing = await this.prisma.listing.findUnique({ where: { id } })
    if (!listing) throw new NotFoundException()
    if (listing.hostId !== userId) throw new ForbiddenException()
    const archived = await this.prisma.listing.update({ where: { id }, data: { status: 'archived' } })
    await this.invalidateSearchCache()
    return archived
  }

  // ─── Availability ──────────────────────────────────────────────────────────

  async getAvailability(id: string) {
    const [blocked, bookedRanges] = await Promise.all([
      this.prisma.availability.findMany({
        where: { listingId: id, date: { gte: new Date() } },
        orderBy: { date: 'asc' },
      }),
      this.prisma.booking.findMany({
        where: {
          listingId: id,
          status: { in: ['confirmed', 'paid', 'active'] },
          endDate: { gte: new Date() },
        },
        select: { startDate: true, endDate: true },
      }),
    ])

    return { blocked, bookedRanges }
  }

  /** Host blocks one or more specific dates for a listing they own. */
  async blockDates(hostId: string, listingId: string, dto: BlockDatesDto) {
    const listing = await this.prisma.listing.findUnique({ where: { id: listingId } })
    if (!listing) throw new NotFoundException()
    if (listing.hostId !== hostId) throw new ForbiddenException()

    const upserts = dto.dates.map((d) =>
      this.prisma.availability.upsert({
        where: { listingId_date: { listingId, date: new Date(d) } },
        create: {
          listingId,
          date: new Date(d),
          availableQty: 0,
          isBlocked: true,
          blockedReason: dto.reason,
        },
        update: { isBlocked: true, availableQty: 0, blockedReason: dto.reason },
      }),
    )

    await this.prisma.$transaction(upserts)
    return { blocked: dto.dates.length }
  }

  /** Host unblocks previously-blocked dates. */
  async unblockDates(hostId: string, listingId: string, dates: string[]) {
    const listing = await this.prisma.listing.findUnique({ where: { id: listingId } })
    if (!listing) throw new NotFoundException()
    if (listing.hostId !== hostId) throw new ForbiddenException()

    await this.prisma.availability.deleteMany({
      where: {
        listingId,
        date: { in: dates.map((d) => new Date(d)) },
        isBlocked: true,
      },
    })

    return { unblocked: dates.length }
  }

  async registerView(listingId: string, sessionId: string): Promise<void> {
    const key = `viewers:${listingId}`
    await this.redis.sadd(key, sessionId)
    await this.redis.expire(key, 180)
  }

  async getViewerCount(listingId: string): Promise<{ count: number }> {
    const key = `viewers:${listingId}`
    const count = await this.redis.scard(key)
    return { count }
  }

  async getSimilar(id: string, take = 6) {
    const listing = await this.prisma.listing.findUnique({
      where: { id },
      select: { categoryId: true, city: true },
    })
    if (!listing) return []
    return this.prisma.listing.findMany({
      where: {
        id: { not: id },
        status: 'active',
        categoryId: listing.categoryId,
      },
      take,
      orderBy: { rating: 'desc' },
      include: {
        media: { where: { isCover: true }, take: 1 },
        category: { select: { slug: true, nameRu: true } },
        host: { select: { id: true, firstName: true, avatarUrl: true, kycLevel: true } },
      },
    })
  }

  async getMyListings(hostId: string, page = 1, limit = 12) {
    const skip = (page - 1) * limit
    const [items, total] = await Promise.all([
      this.prisma.listing.findMany({
        where: { hostId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          media: { orderBy: { sortOrder: 'asc' } },
          category: { select: { slug: true, nameRu: true } },
        },
      }),
      this.prisma.listing.count({ where: { hostId } }),
    ])
    return { items, total, page, limit, hasMore: skip + items.length < total }
  }
}
