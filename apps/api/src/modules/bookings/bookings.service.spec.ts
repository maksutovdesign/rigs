import { Test, TestingModule } from '@nestjs/testing'
import { NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common'
import { BookingsService } from './bookings.service'
import { PrismaService } from '../../prisma/prisma.service'
import { PaymentsService } from '../payments/payments.service'

// Mock workspace util packages so tests have no external dependencies
jest.mock('@rigs/utils', () => ({
  calcSubtotal: jest.fn(),
  calcBookingTotal: jest.fn(),
  generateCode: jest.fn().mockReturnValue('ABCDEF'),
}))

import { calcSubtotal, calcBookingTotal } from '@rigs/utils'

const mockPrisma: any = {
  listing: { findUnique: jest.fn() },
  booking: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    count: jest.fn().mockResolvedValue(0),
  },
  $transaction: jest.fn((fn: (tx: any) => Promise<unknown>) => fn(mockPrisma)),
}

const mockPayments = {
  refundPayment: jest.fn().mockResolvedValue(undefined),
}

// A reusable mock listing that passes all validation checks by default
const mockListing = {
  id: 'listing-1',
  hostId: 'host-1',
  status: 'active',
  instantBook: false,
  priceDaily: 1000,
  priceHourly: null,
  priceWeekly: null,
  priceMonthly: null,
  depositAmount: 2000,
}

const baseDto = {
  listingId: 'listing-1',
  startDate: '2025-06-01T10:00:00.000Z',
  endDate: '2025-06-05T10:00:00.000Z',
  quantity: 1,
  withInsurance: false,
  deliveryType: 'pickup' as const,
  deliveryAddress: undefined,
}

describe('BookingsService', () => {
  let service: BookingsService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookingsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: PaymentsService, useValue: mockPayments },
      ],
    }).compile()

    service = module.get<BookingsService>(BookingsService)

    jest.clearAllMocks()
    // Default util mock return values
    ;(calcSubtotal as jest.Mock).mockReturnValue(4000)
    ;(calcBookingTotal as jest.Mock).mockReturnValue({
      subtotal: 4000,
      serviceFee: 440,
      insuranceFee: 0,
      deliveryFee: 0,
      totalAmount: 4440,
      hostPayout: 3320,
      hostCommission: 680,
    })
  })

  describe('create', () => {
    it('throws NotFoundException when listing is not found', async () => {
      mockPrisma.listing.findUnique.mockResolvedValue(null)

      await expect(service.create('renter-1', baseDto)).rejects.toThrow(NotFoundException)
    })

    it('throws NotFoundException when listing status is not "active"', async () => {
      mockPrisma.listing.findUnique.mockResolvedValue({ ...mockListing, status: 'draft' })

      await expect(service.create('renter-1', baseDto)).rejects.toThrow(NotFoundException)
    })

    it('throws ForbiddenException when renter is the host', async () => {
      mockPrisma.listing.findUnique.mockResolvedValue(mockListing)

      await expect(service.create('host-1', baseDto)).rejects.toThrow(ForbiddenException)
    })

    it('throws BadRequestException when endDate <= startDate', async () => {
      mockPrisma.listing.findUnique.mockResolvedValue(mockListing)

      const badDto = {
        ...baseDto,
        startDate: '2025-06-05T10:00:00.000Z',
        endDate: '2025-06-01T10:00:00.000Z',
      }

      await expect(service.create('renter-1', badDto)).rejects.toThrow(BadRequestException)
    })

    it('throws BadRequestException when endDate equals startDate', async () => {
      mockPrisma.listing.findUnique.mockResolvedValue(mockListing)

      const equalDto = {
        ...baseDto,
        startDate: '2025-06-01T10:00:00.000Z',
        endDate: '2025-06-01T10:00:00.000Z',
      }

      await expect(service.create('renter-1', equalDto)).rejects.toThrow(BadRequestException)
    })

    it('creates a booking with correct pricing fields (subtotal, serviceFee = 11%, totalAmount)', async () => {
      mockPrisma.listing.findUnique.mockResolvedValue(mockListing)
      mockPrisma.booking.create.mockResolvedValue({ id: 'booking-1' })

      await service.create('renter-1', baseDto)

      expect(mockPrisma.booking.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            subtotal: 4000,
            serviceFee: 440,       // 11 % of 4000
            totalAmount: 4440,
            hostPayout: 3320,
            hostCommission: 680,
          }),
        }),
      )
    })

    it('sets status = "confirmed" when listing.instantBook is true', async () => {
      mockPrisma.listing.findUnique.mockResolvedValue({ ...mockListing, instantBook: true })
      mockPrisma.booking.create.mockResolvedValue({ id: 'booking-1' })

      await service.create('renter-1', baseDto)

      expect(mockPrisma.booking.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'confirmed' }),
        }),
      )
    })

    it('sets status = "pending" when listing.instantBook is false', async () => {
      mockPrisma.listing.findUnique.mockResolvedValue({ ...mockListing, instantBook: false })
      mockPrisma.booking.create.mockResolvedValue({ id: 'booking-1' })

      await service.create('renter-1', baseDto)

      expect(mockPrisma.booking.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'pending' }),
        }),
      )
    })

    it('includes depositAmount from the listing in the created booking', async () => {
      mockPrisma.listing.findUnique.mockResolvedValue(mockListing)
      mockPrisma.booking.create.mockResolvedValue({ id: 'booking-1' })

      await service.create('renter-1', baseDto)

      expect(mockPrisma.booking.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ depositAmount: mockListing.depositAmount }),
        }),
      )
    })

    it('sets deliveryFee = 500 and deliveryType when deliveryType is "delivery"', async () => {
      mockPrisma.listing.findUnique.mockResolvedValue(mockListing)
      mockPrisma.booking.create.mockResolvedValue({ id: 'booking-1' })
      ;(calcBookingTotal as jest.Mock).mockReturnValue({
        subtotal: 4000,
        serviceFee: 440,
        insuranceFee: 0,
        deliveryFee: 500,
        totalAmount: 4940,
        hostPayout: 3320,
        hostCommission: 680,
      })

      await service.create('renter-1', { ...baseDto, deliveryType: 'delivery' as const })

      expect(calcBookingTotal).toHaveBeenCalledWith(
        expect.objectContaining({ deliveryFee: 500 }),
      )
    })
  })
})
