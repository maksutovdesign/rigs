import { Injectable, NotFoundException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { PrismaService } from '../../prisma/prisma.service'
import { UpdateUserDto } from './dto/update-user.dto'
import { encryptPassportData, decryptPassportData } from '../../common/crypto/passport-data.crypto'

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        phone: true,
        email: true,
        firstName: true,
        lastName: true,
        avatarUrl: true,
        dateOfBirth: true,
        role: true,
        status: true,
        kycLevel: true,
        ratingAsHost: true,
        ratingAsRenter: true,
        totalRentals: true,
        subscriptionPlan: true,
        createdAt: true,
        updatedAt: true,
      },
    })
    if (!user) throw new NotFoundException('Пользователь не найден')
    return user
  }

  async findPublicProfile(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        avatarUrl: true,
        ratingAsHost: true,
        ratingAsRenter: true,
        totalRentals: true,
        kycLevel: true,
        createdAt: true,
        _count: { select: { listings: true } },
      },
    })
    if (!user) throw new NotFoundException('Пользователь не найден')
    return user
  }

  async getPublicProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        avatarUrl: true,
        ratingAsHost: true,
        ratingAsRenter: true,
        totalRentals: true,
        createdAt: true,
        kycLevel: true,
        subscriptionPlan: true,
        listings: {
          where: { status: 'active' },
          take: 20,
          orderBy: { createdAt: 'desc' },
          include: {
            media: { where: { isCover: true }, take: 1 },
            category: { select: { nameRu: true } },
          },
        },
        reviewsReceived: {
          where: { role: 'renter_reviews_host' },
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: {
            reviewer: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
          },
        },
      },
    })
    if (!user) throw new NotFoundException('Пользователь не найден')
    return {
      ...user,
      activeListingsCount: user.listings.length,
      reviewsCount: user.reviewsReceived.length,
    }
  }

  async update(id: string, dto: UpdateUserDto) {
    return this.prisma.user.update({
      where: { id },
      data: dto,
    })
  }

  /**
   * Stores passport scan data encrypted at rest (AES-256-GCM).
   * Complies with 152-ФЗ — plain-text PD is never persisted.
   */
  async updatePassportData(id: string, data: Record<string, unknown>): Promise<void> {
    const keyHex = this.config.getOrThrow<string>('PASSPORT_DATA_KEY')
    const encrypted = encryptPassportData(data, keyHex)
    await this.prisma.user.update({
      where: { id },
      data: { passportData: encrypted },
    })
  }

  async updateFcmToken(id: string, token: string): Promise<void> {
    await this.prisma.user.update({ where: { id }, data: { fcmToken: token } })
  }

  async clearFcmToken(id: string): Promise<void> {
    await this.prisma.user.update({ where: { id }, data: { fcmToken: null } })
  }

  /**
   * Returns decrypted passport data for the given user.
   * Returns null when no passport data has been stored yet.
   */
  async getPassportData(id: string): Promise<Record<string, unknown> | null> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { passportData: true },
    })
    if (!user) throw new NotFoundException('Пользователь не найден')
    if (!user.passportData) return null
    const keyHex = this.config.getOrThrow<string>('PASSPORT_DATA_KEY')
    return decryptPassportData(user.passportData as string, keyHex)
  }
}
