import { Test, TestingModule } from '@nestjs/testing'
import { INestApplication, ValidationPipe } from '@nestjs/common'
import * as request from 'supertest'
import { AppModule } from '../src/app.module'
import { PrismaService } from '../src/prisma/prisma.service'

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

const TEST_USER = {
  id: 'user-test-id',
  phone: '+79991234567',
  role: 'user',
  status: 'active',
  kycLevel: 'phone',
  firstName: null,
  lastName: null,
  avatarUrl: null,
  ratingAsHost: 0,
  totalRentals: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
}

const TEST_OTP = {
  id: 'otp-test-id',
  userId: TEST_USER.id,
  phone: TEST_USER.phone,
  code: '123456',
  usedAt: null,
  expiresAt: new Date(Date.now() + 5 * 60 * 1000),
  createdAt: new Date(),
}

const TEST_LISTING = {
  id: 'listing-test-id',
  title: 'Тестовое снаряжение',
  status: 'active',
  priceDaily: 500,
  priceHourly: null,
  priceWeekly: null,
  priceMonthly: null,
  hostId: 'another-user-id',
  city: 'Москва',
  rating: 0,
  bookingsCount: 0,
  viewsCount: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
}

const TEST_CATEGORY = {
  id: 'cat-test-id',
  slug: 'bikes',
  nameRu: 'Велосипеды',
  parentId: null,
}

// ---------------------------------------------------------------------------
// Mock PrismaService
// ---------------------------------------------------------------------------

const mockPrismaService = {
  user: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  otpCode: {
    create: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
  },
  listing: {
    findMany: jest.fn().mockResolvedValue([]),
    findUnique: jest.fn().mockResolvedValue(null),
    count: jest.fn().mockResolvedValue(0),
    create: jest.fn(),
    update: jest.fn(),
  },
  booking: {
    findMany: jest.fn().mockResolvedValue([]),
    findFirst: jest.fn().mockResolvedValue(null),
    create: jest.fn(),
    update: jest.fn(),
  },
  category: {
    findMany: jest.fn().mockResolvedValue([]),
    findUnique: jest.fn().mockResolvedValue(null),
  },
  availability: {
    findMany: jest.fn().mockResolvedValue([]),
  },
  $connect: jest.fn(),
  $disconnect: jest.fn(),
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Signs a JWT using the same logic as AuthService so we can call
 * authenticated endpoints from tests. We rely on the JwtService that NestJS
 * already registered — but since we are outside the DI container here we
 * just embed a short-lived token signed with the test secret.
 */
function makeAccessToken(app: INestApplication): string {
  // Pull the JwtService from the app container to sign a token the same way
  // the real service does — this keeps the test consistent with guard logic.
  const { JwtService } = require('@nestjs/jwt')
  const jwtService: InstanceType<typeof JwtService> = app.get(JwtService)
  return jwtService.sign({ sub: TEST_USER.id, phone: TEST_USER.phone, role: TEST_USER.role })
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('Rigs API (e2e)', () => {
  let app: INestApplication

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(mockPrismaService)
      .compile()

    app = moduleFixture.createNestApplication()

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    )

    app.setGlobalPrefix('api/v1')

    await app.init()
  })

  afterAll(async () => {
    await app.close()
  })

  beforeEach(() => {
    // Reset all mocks before each test so state does not bleed between cases.
    jest.clearAllMocks()

    // Restore safe defaults after each reset.
    mockPrismaService.listing.findMany.mockResolvedValue([])
    mockPrismaService.listing.count.mockResolvedValue(0)
    mockPrismaService.listing.findUnique.mockResolvedValue(null)
    mockPrismaService.category.findMany.mockResolvedValue([])
    mockPrismaService.booking.findMany.mockResolvedValue([])
  })

  // =========================================================================
  // Auth — /api/v1/auth
  // =========================================================================

  describe('Auth (/api/v1/auth)', () => {
    describe('POST /api/v1/auth/send-code', () => {
      it('returns 200 with success message for a valid phone number', async () => {
        mockPrismaService.user.findUnique.mockResolvedValue(TEST_USER)
        mockPrismaService.otpCode.create.mockResolvedValue(TEST_OTP)

        const res = await request(app.getHttpServer())
          .post('/api/v1/auth/send-code')
          .send({ phone: '+79991234567' })
          .expect(200)

        expect(res.body).toEqual({ message: 'Код отправлен' })
      })

      it('returns 400 when phone is missing', async () => {
        await request(app.getHttpServer())
          .post('/api/v1/auth/send-code')
          .send({})
          .expect(400)
      })

      it('returns 400 when phone format is invalid', async () => {
        await request(app.getHttpServer())
          .post('/api/v1/auth/send-code')
          .send({ phone: 'not-a-phone' })
          .expect(400)
      })
    })

    describe('POST /api/v1/auth/verify-code', () => {
      it('returns 200 with access and refresh tokens for a correct code', async () => {
        mockPrismaService.otpCode.findFirst.mockResolvedValue(TEST_OTP)
        mockPrismaService.otpCode.update.mockResolvedValue({ ...TEST_OTP, usedAt: new Date() })
        mockPrismaService.user.findUnique.mockResolvedValue(TEST_USER)

        const res = await request(app.getHttpServer())
          .post('/api/v1/auth/verify-code')
          .send({ phone: '+79991234567', code: '123456' })
          .expect(200)

        expect(res.body).toHaveProperty('accessToken')
        expect(res.body).toHaveProperty('refreshToken')
        expect(typeof res.body.accessToken).toBe('string')
        expect(typeof res.body.refreshToken).toBe('string')
      })

      it('returns 401 when the OTP record is not found (wrong code)', async () => {
        mockPrismaService.otpCode.findFirst.mockResolvedValue(null)

        await request(app.getHttpServer())
          .post('/api/v1/auth/verify-code')
          .send({ phone: '+79991234567', code: '000000' })
          .expect(401)
      })

      it('returns 400 when required fields are missing', async () => {
        await request(app.getHttpServer())
          .post('/api/v1/auth/verify-code')
          .send({ phone: '+79991234567' })
          .expect(400)
      })
    })

    describe('POST /api/v1/auth/refresh', () => {
      it('returns 200 with new token pair for a valid refresh token', async () => {
        // First obtain a real refresh token by mocking a successful verify-code flow.
        mockPrismaService.otpCode.findFirst.mockResolvedValue(TEST_OTP)
        mockPrismaService.otpCode.update.mockResolvedValue({ ...TEST_OTP, usedAt: new Date() })
        mockPrismaService.user.findUnique.mockResolvedValue(TEST_USER)

        const verifyRes = await request(app.getHttpServer())
          .post('/api/v1/auth/verify-code')
          .send({ phone: '+79991234567', code: '123456' })
          .expect(200)

        const { refreshToken } = verifyRes.body

        const refreshRes = await request(app.getHttpServer())
          .post('/api/v1/auth/refresh')
          .send({ refreshToken })
          .expect(200)

        expect(refreshRes.body).toHaveProperty('accessToken')
        expect(refreshRes.body).toHaveProperty('refreshToken')
      })

      it('returns 401 for an invalid refresh token', async () => {
        await request(app.getHttpServer())
          .post('/api/v1/auth/refresh')
          .send({ refreshToken: 'invalid.token.value' })
          .expect(401)
      })
    })
  })

  // =========================================================================
  // Listings — /api/v1/listings
  // =========================================================================

  describe('Listings (/api/v1/listings)', () => {
    describe('GET /api/v1/listings', () => {
      it('returns 200 with a paginated result object', async () => {
        mockPrismaService.listing.findMany.mockResolvedValue([TEST_LISTING])
        mockPrismaService.listing.count.mockResolvedValue(1)

        const res = await request(app.getHttpServer())
          .get('/api/v1/listings')
          .expect(200)

        expect(res.body).toHaveProperty('items')
        expect(Array.isArray(res.body.items)).toBe(true)
        expect(res.body).toHaveProperty('total')
      })

      it('returns empty items array when no listings exist', async () => {
        mockPrismaService.listing.findMany.mockResolvedValue([])
        mockPrismaService.listing.count.mockResolvedValue(0)

        const res = await request(app.getHttpServer())
          .get('/api/v1/listings')
          .expect(200)

        expect(res.body.items).toHaveLength(0)
        expect(res.body.total).toBe(0)
      })
    })

    describe('GET /api/v1/listings/:id', () => {
      it('returns 200 with the listing object for a valid id', async () => {
        // findUnique is called twice in findById: once to fetch, once to update viewsCount
        mockPrismaService.listing.findUnique.mockResolvedValue(TEST_LISTING)
        mockPrismaService.listing.update.mockResolvedValue(TEST_LISTING)

        const res = await request(app.getHttpServer())
          .get(`/api/v1/listings/${TEST_LISTING.id}`)
          .expect(200)

        expect(res.body).toHaveProperty('id', TEST_LISTING.id)
      })

      it('returns 404 when listing does not exist', async () => {
        mockPrismaService.listing.findUnique.mockResolvedValue(null)

        await request(app.getHttpServer())
          .get('/api/v1/listings/non-existent-id')
          .expect(404)
      })
    })

    describe('POST /api/v1/listings', () => {
      it('returns 401 when no Bearer token is provided', async () => {
        await request(app.getHttpServer())
          .post('/api/v1/listings')
          .send({ title: 'Test', priceDaily: 100 })
          .expect(401)
      })
    })
  })

  // =========================================================================
  // Categories — /api/v1/categories
  // =========================================================================

  describe('Categories (/api/v1/categories)', () => {
    describe('GET /api/v1/categories', () => {
      it('returns 200 with an array of categories', async () => {
        mockPrismaService.category.findMany.mockResolvedValue([TEST_CATEGORY])

        const res = await request(app.getHttpServer())
          .get('/api/v1/categories')
          .expect(200)

        expect(Array.isArray(res.body)).toBe(true)
      })

      it('returns 200 with an empty array when no categories exist', async () => {
        mockPrismaService.category.findMany.mockResolvedValue([])

        const res = await request(app.getHttpServer())
          .get('/api/v1/categories')
          .expect(200)

        expect(res.body).toEqual([])
      })
    })
  })

  // =========================================================================
  // Bookings — /api/v1/bookings
  // =========================================================================

  describe('Bookings (/api/v1/bookings)', () => {
    describe('GET /api/v1/bookings', () => {
      it('returns 401 when no Bearer token is provided', async () => {
        await request(app.getHttpServer())
          .get('/api/v1/bookings')
          .expect(401)
      })
    })

    describe('POST /api/v1/bookings', () => {
      it('returns 401 when no Bearer token is provided', async () => {
        await request(app.getHttpServer())
          .post('/api/v1/bookings')
          .send({ listingId: 'some-id', startDate: '2026-06-01', endDate: '2026-06-05', deliveryType: 'pickup' })
          .expect(401)
      })
    })

    describe('GET /api/v1/bookings/host (authenticated)', () => {
      it('returns 401 when no Bearer token is provided', async () => {
        await request(app.getHttpServer())
          .get('/api/v1/bookings/host')
          .expect(401)
      })
    })

    describe('Authenticated booking flow', () => {
      let accessToken: string

      beforeEach(() => {
        // Make the JWT strategy's user lookup succeed so the guard passes.
        mockPrismaService.user.findUnique.mockResolvedValue(TEST_USER)
        accessToken = makeAccessToken(app)
      })

      it('GET /api/v1/bookings returns 200 with bookings array for authenticated user', async () => {
        mockPrismaService.booking.findMany.mockResolvedValue([])

        const res = await request(app.getHttpServer())
          .get('/api/v1/bookings')
          .set('Authorization', `Bearer ${accessToken}`)
          .expect(200)

        expect(Array.isArray(res.body)).toBe(true)
      })

      it('POST /api/v1/bookings returns 404 when the listing does not exist', async () => {
        mockPrismaService.listing.findUnique.mockResolvedValue(null)

        await request(app.getHttpServer())
          .post('/api/v1/bookings')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            listingId: 'non-existent',
            startDate: '2026-06-01',
            endDate: '2026-06-05',
            deliveryType: 'pickup',
          })
          .expect(404)
      })
    })
  })
})
