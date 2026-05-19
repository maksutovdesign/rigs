import { Test, TestingModule } from '@nestjs/testing'
import { NotFoundException, ConflictException } from '@nestjs/common'
import { WishlistsService } from './wishlists.service'
import { PrismaService } from '../../prisma/prisma.service'

const mockPrisma = {
  listing: { findUnique: jest.fn() },
  wishlist: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    deleteMany: jest.fn(),
  },
}

const mockListing = {
  id: 'listing-1',
  title: 'Tent XL',
  status: 'active',
  media: [{ id: 'media-1', url: 'https://example.com/cover.jpg', isCover: true }],
  category: { slug: 'tents', nameRu: 'Палатки' },
}

describe('WishlistsService', () => {
  let service: WishlistsService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WishlistsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile()

    service = module.get<WishlistsService>(WishlistsService)

    jest.clearAllMocks()
  })

  // ─── findAll ───────────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('returns an array of listings for the given user', async () => {
      const wishlists = [
        { id: 'w-1', userId: 'user-1', listingId: 'listing-1', listing: mockListing },
      ]
      mockPrisma.wishlist.findMany.mockResolvedValue(wishlists)

      const result = await service.findAll('user-1')

      expect(mockPrisma.wishlist.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: 'user-1' } }),
      )
      // Service maps w => w.listing
      expect(result).toEqual([mockListing])
    })

    it('returns an empty array when the user has no wishlisted items', async () => {
      mockPrisma.wishlist.findMany.mockResolvedValue([])

      const result = await service.findAll('user-2')

      expect(result).toEqual([])
    })

    it('queries with descending createdAt order', async () => {
      mockPrisma.wishlist.findMany.mockResolvedValue([])

      await service.findAll('user-1')

      expect(mockPrisma.wishlist.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { createdAt: 'desc' } }),
      )
    })
  })

  // ─── add ───────────────────────────────────────────────────────────────────

  describe('add', () => {
    it('throws NotFoundException when the listing does not exist', async () => {
      mockPrisma.listing.findUnique.mockResolvedValue(null)

      await expect(service.add('user-1', 'listing-999')).rejects.toThrow(NotFoundException)
      expect(mockPrisma.wishlist.create).not.toHaveBeenCalled()
    })

    it('throws ConflictException when the listing is already wishlisted', async () => {
      mockPrisma.listing.findUnique.mockResolvedValue(mockListing)
      mockPrisma.wishlist.findUnique.mockResolvedValue({ id: 'w-1' })

      await expect(service.add('user-1', 'listing-1')).rejects.toThrow(ConflictException)
      expect(mockPrisma.wishlist.create).not.toHaveBeenCalled()
    })

    it('creates and returns a new wishlist entry when valid', async () => {
      const created = { id: 'w-new', userId: 'user-1', listingId: 'listing-1' }
      mockPrisma.listing.findUnique.mockResolvedValue(mockListing)
      mockPrisma.wishlist.findUnique.mockResolvedValue(null)
      mockPrisma.wishlist.create.mockResolvedValue(created)

      const result = await service.add('user-1', 'listing-1')

      expect(mockPrisma.wishlist.create).toHaveBeenCalledWith({
        data: { userId: 'user-1', listingId: 'listing-1' },
      })
      expect(result).toEqual(created)
    })

    it('checks the wishlist uniqueness with the composite key', async () => {
      mockPrisma.listing.findUnique.mockResolvedValue(mockListing)
      mockPrisma.wishlist.findUnique.mockResolvedValue(null)
      mockPrisma.wishlist.create.mockResolvedValue({})

      await service.add('user-1', 'listing-1')

      expect(mockPrisma.wishlist.findUnique).toHaveBeenCalledWith({
        where: { userId_listingId: { userId: 'user-1', listingId: 'listing-1' } },
      })
    })
  })

  // ─── remove ────────────────────────────────────────────────────────────────

  describe('remove', () => {
    it('calls deleteMany with the correct userId and listingId', async () => {
      mockPrisma.wishlist.deleteMany.mockResolvedValue({ count: 1 })

      await service.remove('user-1', 'listing-1')

      expect(mockPrisma.wishlist.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', listingId: 'listing-1' },
      })
    })

    it('returns { ok: true } regardless of whether a record existed', async () => {
      mockPrisma.wishlist.deleteMany.mockResolvedValue({ count: 0 })

      const result = await service.remove('user-1', 'listing-999')

      expect(result).toEqual({ ok: true })
    })
  })

  // ─── isWishlisted ──────────────────────────────────────────────────────────

  describe('isWishlisted', () => {
    it('returns true when the listing is in the user\'s wishlist', async () => {
      mockPrisma.wishlist.findUnique.mockResolvedValue({ id: 'w-1' })

      const result = await service.isWishlisted('user-1', 'listing-1')

      expect(result).toBe(true)
    })

    it('returns false when the listing is not in the user\'s wishlist', async () => {
      mockPrisma.wishlist.findUnique.mockResolvedValue(null)

      const result = await service.isWishlisted('user-1', 'listing-999')

      expect(result).toBe(false)
    })

    it('queries using the composite unique key', async () => {
      mockPrisma.wishlist.findUnique.mockResolvedValue(null)

      await service.isWishlisted('user-1', 'listing-1')

      expect(mockPrisma.wishlist.findUnique).toHaveBeenCalledWith({
        where: { userId_listingId: { userId: 'user-1', listingId: 'listing-1' } },
      })
    })
  })
})
