import { Injectable, NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { ReviewRole } from '@prisma/client'
import { CreateReviewDto } from './dto/create-review.dto'

@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(reviewerId: string, dto: CreateReviewDto) {
    const booking = await this.prisma.booking.findUnique({ where: { id: dto.bookingId } })
    if (!booking) throw new NotFoundException('Бронирование не найдено')
    if (booking.status !== 'completed') throw new ForbiddenException('Аренда ещё не завершена')
    if (booking.renterId !== reviewerId && booking.hostId !== reviewerId) {
      throw new ForbiddenException()
    }

    const existing = await this.prisma.review.findFirst({
      where: { bookingId: dto.bookingId, reviewerId },
    })
    if (existing) throw new ConflictException('Отзыв уже оставлен')

    const isRenter = booking.renterId === reviewerId
    const revieweeId = isRenter ? booking.hostId : booking.renterId
    const role: ReviewRole = isRenter ? ReviewRole.renter_reviews_host : ReviewRole.host_reviews_renter

    const review = await this.prisma.review.create({
      data: {
        bookingId: dto.bookingId,
        reviewerId,
        revieweeId,
        listingId: booking.listingId,
        role,
        rating: dto.rating,
        ratingAccuracy: dto.ratingAccuracy,
        ratingCondition: dto.ratingCondition,
        ratingCommunication: dto.ratingCommunication,
        text: dto.text,
      },
    })

    await this.updateRatings(booking.listingId, revieweeId, role)
    return review
  }

  async findByListing(listingId: string) {
    return this.prisma.review.findMany({
      where: { listingId, isPublished: true, role: 'renter_reviews_host' },
      include: { reviewer: { select: { id: true, firstName: true, avatarUrl: true } } },
      orderBy: { createdAt: 'desc' },
    })
  }

  async findByUser(userId: string) {
    return this.prisma.review.findMany({
      where: { revieweeId: userId, isPublished: true },
      include: { reviewer: { select: { id: true, firstName: true, avatarUrl: true } } },
      orderBy: { createdAt: 'desc' },
    })
  }

  private async updateRatings(listingId: string, userId: string, role: ReviewRole) {
    await this.prisma.$transaction(async (tx) => {
      const listingReviews = await tx.review.aggregate({
        where: { listingId, role: 'renter_reviews_host', isPublished: true },
        _avg: { rating: true },
        _count: true,
      })

      await tx.listing.update({
        where: { id: listingId },
        data: {
          rating: listingReviews._avg.rating ?? 0,
          reviewsCount: listingReviews._count,
        },
      })

      const field = role === 'renter_reviews_host' ? 'ratingAsHost' : 'ratingAsRenter'
      const userReviews = await tx.review.aggregate({
        where: { revieweeId: userId, role, isPublished: true },
        _avg: { rating: true },
      })

      await tx.user.update({
        where: { id: userId },
        data: { [field]: userReviews._avg?.rating ?? 0 },
      })
    })
  }
}
