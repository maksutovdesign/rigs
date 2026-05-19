import { Injectable, UnauthorizedException, BadRequestException, Logger, Inject } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { ConfigService } from '@nestjs/config'
import { PrismaService } from '../../prisma/prisma.service'
import { UsersService } from '../users/users.service'
import { NotificationsService } from '../notifications/notifications.service'
import { generateOtp } from '@rigs/utils'
import { v4 as uuidv4 } from 'uuid'
import Redis from 'ioredis'
import { REDIS_CLIENT } from '../../redis/redis.module'

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly usersService: UsersService,
    private readonly notifications: NotificationsService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  async sendOtp(phone: string): Promise<{ message: string }> {
    // Reject if an unused OTP was already issued within the last 60 seconds
    const recentOtp = await this.prisma.otpCode.findFirst({
      where: {
        phone,
        usedAt: null,
        createdAt: { gte: new Date(Date.now() - 60_000) },
      },
      orderBy: { createdAt: 'desc' },
    })
    if (recentOtp) {
      throw new BadRequestException('Подождите 60 секунд перед повторной отправкой')
    }

    const code = generateOtp(6)
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000) // 5 минут

    let user = await this.prisma.user.findUnique({ where: { phone } })
    if (!user) {
      user = await this.prisma.user.create({
        data: { phone, kycLevel: 'phone' },
      })
    }

    await this.prisma.otpCode.create({
      data: { userId: user.id, phone, code, expiresAt },
    })

    // Fresh start: reset failed attempts when a new code is issued
    await this.redis.del(`otp_attempts:${phone}`)

    await this.notifications.sendSms(phone, `Ваш код Rigs: ${code}`)
    if (this.config.get('NODE_ENV') !== 'production') {
      this.logger.debug(`[DEV] OTP для ${phone}: ${code}`)
    }

    return { message: 'Код отправлен' }
  }

  async verifyOtp(phone: string, code: string) {
    const attemptsKey = `otp_attempts:${phone}`
    const attempts = parseInt((await this.redis.get(attemptsKey)) ?? '0', 10)

    if (attempts >= 5) {
      throw new UnauthorizedException('Слишком много попыток. Запросите новый код.')
    }

    const otpRecord = await this.prisma.otpCode.findFirst({
      where: {
        phone,
        code,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    })

    if (!otpRecord) {
      await this.redis.setex(attemptsKey, 10 * 60, String(attempts + 1)) // 10 min window
      throw new UnauthorizedException('Неверный или истёкший код')
    }

    // Success — reset attempts
    await this.redis.del(attemptsKey)

    await this.prisma.otpCode.update({
      where: { id: otpRecord.id },
      data: { usedAt: new Date() },
    })

    const user = await this.prisma.user.findUnique({ where: { phone } })
    if (!user) throw new UnauthorizedException()

    return this.generateTokens(user.id, user.phone, user.role)
  }

  async refreshTokens(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.config.get('JWT_REFRESH_SECRET'),
      })

      const exists = await this.redis.exists(`rt:${payload.sub}:${payload.jti}`)
      if (!exists) {
        throw new UnauthorizedException('Refresh токен отозван или не существует')
      }

      await this.redis.del(`rt:${payload.sub}:${payload.jti}`)

      return this.generateTokens(payload.sub, payload.phone, payload.role)
    } catch (err) {
      if (err instanceof UnauthorizedException) throw err
      throw new UnauthorizedException('Refresh токен недействителен')
    }
  }

  async logout(userId: string, jti: string) {
    await this.redis.del(`rt:${userId}:${jti}`)
  }

  private async generateTokens(userId: string, phone: string, role: string) {
    const jti = uuidv4()
    const accessPayload = { sub: userId, phone, role }
    const refreshPayload = { sub: userId, phone, role, jti }

    const refreshExpiresSec = 30 * 24 * 3600

    const tokens = {
      accessToken: this.jwtService.sign(accessPayload),
      refreshToken: this.jwtService.sign(refreshPayload, {
        secret: this.config.get('JWT_REFRESH_SECRET'),
        expiresIn: this.config.get('JWT_REFRESH_EXPIRES', '30d'),
      }),
    }

    await this.redis.setex(`rt:${userId}:${jti}`, refreshExpiresSec, '1')

    return tokens
  }
}
