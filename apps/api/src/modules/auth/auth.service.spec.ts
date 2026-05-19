import { Test, TestingModule } from '@nestjs/testing'
import { UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { ConfigService } from '@nestjs/config'
import { AuthService } from './auth.service'
import { PrismaService } from '../../prisma/prisma.service'
import { UsersService } from '../users/users.service'
import { NotificationsService } from '../notifications/notifications.service'
import { REDIS_CLIENT } from '../../redis/redis.module'

// Prevent actual OTP generation from interfering with assertions
jest.mock('@rigs/utils', () => ({
  generateOtp: jest.fn().mockReturnValue('123456'),
}))

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
  },
  otpCode: {
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
}

const mockJwtService = {
  sign: jest.fn().mockReturnValue('signed-token'),
  verify: jest.fn(),
}

const mockConfigService = {
  get: jest.fn().mockReturnValue('secret'),
}

const mockUsersService = {}

const mockNotificationsService = {
  sendSms: jest.fn().mockResolvedValue(undefined),
}

const mockRedis = {
  get: jest.fn().mockResolvedValue(null),
  setex: jest.fn().mockResolvedValue('OK'),
  exists: jest.fn().mockResolvedValue(1),
  del: jest.fn().mockResolvedValue(1),
}

describe('AuthService', () => {
  let service: AuthService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: UsersService, useValue: mockUsersService },
        { provide: NotificationsService, useValue: mockNotificationsService },
        { provide: REDIS_CLIENT, useValue: mockRedis },
      ],
    }).compile()

    service = module.get<AuthService>(AuthService)

    jest.clearAllMocks()
    // Restore default mocks after clearAllMocks
    mockJwtService.sign.mockReturnValue('signed-token')
    mockConfigService.get.mockReturnValue('secret')
    mockRedis.get.mockResolvedValue(null) // 0 attempts by default
    mockRedis.del.mockResolvedValue(1)
    mockRedis.setex.mockResolvedValue('OK')
  })

  // ─── sendOtp ───────────────────────────────────────────────────────────────

  describe('sendOtp', () => {
    const phone = '+79001234567'

    it('creates a new user when phone does not exist', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null)
      mockPrisma.user.create.mockResolvedValue({ id: 'new-user', phone, kycLevel: 'phone' })
      mockPrisma.otpCode.create.mockResolvedValue({})

      await service.sendOtp(phone)

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({ where: { phone } })
      expect(mockPrisma.user.create).toHaveBeenCalledWith({
        data: { phone, kycLevel: 'phone' },
      })
    })

    it('reuses existing user when phone already exists', async () => {
      const existingUser = { id: 'existing-user', phone, kycLevel: 'phone' }
      mockPrisma.user.findUnique.mockResolvedValue(existingUser)
      mockPrisma.otpCode.create.mockResolvedValue({})

      await service.sendOtp(phone)

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({ where: { phone } })
      expect(mockPrisma.user.create).not.toHaveBeenCalled()
    })

    it('creates an OtpCode record and returns { message: "Код отправлен" }', async () => {
      const user = { id: 'user-1', phone, kycLevel: 'phone' }
      mockPrisma.user.findUnique.mockResolvedValue(user)
      mockPrisma.otpCode.create.mockResolvedValue({})

      const result = await service.sendOtp(phone)

      expect(mockPrisma.otpCode.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: user.id,
            phone,
            code: '123456',
          }),
        }),
      )
      expect(result).toEqual({ message: 'Код отправлен' })
    })

    it('resets otp_attempts key when a new OTP is sent', async () => {
      const user = { id: 'user-1', phone, kycLevel: 'phone' }
      mockPrisma.user.findUnique.mockResolvedValue(user)
      mockPrisma.otpCode.create.mockResolvedValue({})

      await service.sendOtp(phone)

      expect(mockRedis.del).toHaveBeenCalledWith(`otp_attempts:${phone}`)
    })
  })

  // ─── verifyOtp ─────────────────────────────────────────────────────────────

  describe('verifyOtp', () => {
    const phone = '+79001234567'
    const code = '123456'

    it('throws UnauthorizedException when no valid OTP record is found', async () => {
      mockPrisma.otpCode.findFirst.mockResolvedValue(null)

      await expect(service.verifyOtp(phone, code)).rejects.toThrow(UnauthorizedException)
    })

    it('marks the OTP as used and returns access + refresh tokens on success', async () => {
      const otpRecord = { id: 'otp-1', phone, code, usedAt: null, expiresAt: new Date(Date.now() + 60_000) }
      const user = { id: 'user-1', phone, role: 'user' }

      mockPrisma.otpCode.findFirst.mockResolvedValue(otpRecord)
      mockPrisma.otpCode.update.mockResolvedValue({ ...otpRecord, usedAt: new Date() })
      mockPrisma.user.findUnique.mockResolvedValue(user)

      const result = await service.verifyOtp(phone, code)

      expect(mockPrisma.otpCode.update).toHaveBeenCalledWith({
        where: { id: otpRecord.id },
        data: { usedAt: expect.any(Date) },
      })
      expect(result).toEqual({
        accessToken: 'signed-token',
        refreshToken: 'signed-token',
      })
    })

    it('throws UnauthorizedException when OTP is expired (expiresAt in the past)', async () => {
      // The service query already filters by expiresAt > now, so findFirst returns null for expired OTPs
      mockPrisma.otpCode.findFirst.mockResolvedValue(null)

      await expect(service.verifyOtp(phone, code)).rejects.toThrow(UnauthorizedException)
      expect(mockPrisma.otpCode.update).not.toHaveBeenCalled()
    })

    it('throws UnauthorizedException when user is not found after OTP validation', async () => {
      const otpRecord = { id: 'otp-1', phone, code, usedAt: null, expiresAt: new Date(Date.now() + 60_000) }

      mockPrisma.otpCode.findFirst.mockResolvedValue(otpRecord)
      mockPrisma.otpCode.update.mockResolvedValue({})
      mockPrisma.user.findUnique.mockResolvedValue(null)

      await expect(service.verifyOtp(phone, code)).rejects.toThrow(UnauthorizedException)
    })

    it('throws UnauthorizedException with lockout message when attempts >= 5', async () => {
      mockRedis.get.mockResolvedValue('5')

      await expect(service.verifyOtp(phone, code)).rejects.toThrow(
        'Слишком много попыток. Запросите новый код.',
      )
      // Should not even query the database
      expect(mockPrisma.otpCode.findFirst).not.toHaveBeenCalled()
    })

    it('resets attempt counter on successful verification', async () => {
      const otpRecord = { id: 'otp-1', phone, code, usedAt: null, expiresAt: new Date(Date.now() + 60_000) }
      const user = { id: 'user-1', phone, role: 'user' }

      mockRedis.get.mockResolvedValue('3') // some prior failed attempts
      mockPrisma.otpCode.findFirst.mockResolvedValue(otpRecord)
      mockPrisma.otpCode.update.mockResolvedValue({ ...otpRecord, usedAt: new Date() })
      mockPrisma.user.findUnique.mockResolvedValue(user)

      await service.verifyOtp(phone, code)

      expect(mockRedis.del).toHaveBeenCalledWith(`otp_attempts:${phone}`)
    })
  })
})
