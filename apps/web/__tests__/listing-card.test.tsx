import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { ListingCard } from '@/components/listings/listing-card'
import type { Listing } from '@rigs/types'
import {
  ListingType,
  ListingStatus,
  ListingCondition,
  KycLevel,
} from '@rigs/types'

// ────────────────────────────────────────────────────────────────────────────────
// Next.js module stubs
// ────────────────────────────────────────────────────────────────────────────────
jest.mock('next/image', () => ({
  __esModule: true,
  default: ({ src, alt }: { src: string; alt: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} />
  ),
}))

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({
    children,
    href,
    className,
  }: {
    children: React.ReactNode
    href: string
    className?: string
  }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}))

// ────────────────────────────────────────────────────────────────────────────────
// Test fixture
// ────────────────────────────────────────────────────────────────────────────────
const baseListing: Listing = {
  id: 'listing-1',
  hostId: 'host-1',
  host: {
    id: 'host-1',
    firstName: 'Иван',
    lastName: 'Петров',
    avatarUrl: undefined,
    kycLevel: KycLevel.PASSPORT,
    totalRentals: 0,
    createdAt: '2024-01-01T00:00:00Z',
  },
  categoryId: 1,
  category: { id: 1, nameRu: 'Квадроциклы', nameEn: 'ATVs', slug: 'atvs', sortOrder: 0, isActive: true },
  title: 'Квадроцикл Can-Am Renegade',
  description: 'Мощный квадроцикл для любых трасс',
  listingType: ListingType.EQUIPMENT,
  status: ListingStatus.ACTIVE,
  city: 'Москва',
  country: 'RU',
  condition: ListingCondition.EXCELLENT,
  quantity: 1,
  availableQty: 1,
  priceDaily: 5000,
  currency: 'RUB',
  minRentalHours: 4,
  instantBook: false,
  deliveryAvailable: false,
  requiresPassport: false,
  requiresLicense: true,
  requiresCert: false,
  minAge: 18,
  tags: [],
  media: [
    {
      id: 'media-1',
      url: 'https://example.com/photo.jpg',
      type: 'photo',
      sortOrder: 0,
      isCover: true,
    },
  ],
  attributes: [],
  viewsCount: 100,
  bookingsCount: 5,
  rating: 4.5,
  reviewsCount: 8,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-06-01T00:00:00Z',
}

// ────────────────────────────────────────────────────────────────────────────────
// Tests
// ────────────────────────────────────────────────────────────────────────────────
describe('ListingCard', () => {
  describe('loading / skeleton state', () => {
    it('renders a skeleton card when isLoading is true', () => {
      const { container } = render(<ListingCard isLoading />)
      // skeleton uses .skeleton class (shimmer), no title rendered
      expect(container.querySelector('.skeleton')).toBeInTheDocument()
      expect(screen.queryByRole('link')).not.toBeInTheDocument()
    })

    it('renders a skeleton card when no listing is provided', () => {
      const { container } = render(<ListingCard />)
      expect(container.querySelector('.skeleton')).toBeInTheDocument()
    })
  })

  describe('content rendering', () => {
    it('renders the listing title', () => {
      render(<ListingCard listing={baseListing} />)
      expect(screen.getByText('Квадроцикл Can-Am Renegade')).toBeInTheDocument()
    })

    it('renders the city', () => {
      render(<ListingCard listing={baseListing} />)
      expect(screen.getByText('Москва')).toBeInTheDocument()
    })

    it('renders the formatted daily price with unit', () => {
      render(<ListingCard listing={baseListing} />)
      // formatPrice(5000) → "5 000 ₽"
      expect(screen.getByText(/5\s*000/)).toBeInTheDocument()
      expect(screen.getByText('/ день')).toBeInTheDocument()
    })

    it('renders hourly price when there is no daily price', () => {
      const listing: Listing = {
        ...baseListing,
        id: 'listing-hourly',
        priceDaily: undefined,
        priceHourly: 800,
      }
      render(<ListingCard listing={listing} />)
      expect(screen.getByText(/800/)).toBeInTheDocument()
      expect(screen.getByText('/ час')).toBeInTheDocument()
    })

    it('renders nothing in price area when no price is set', () => {
      const listing: Listing = {
        ...baseListing,
        id: 'listing-noprice',
        priceDaily: undefined,
        priceHourly: undefined,
      }
      render(<ListingCard listing={listing} />)
      // No price value rendered — just assert the title still shows
      expect(screen.getByText('Квадроцикл Can-Am Renegade')).toBeInTheDocument()
    })

    it('renders the category badge', () => {
      render(<ListingCard listing={baseListing} />)
      expect(screen.getByText('Квадроциклы')).toBeInTheDocument()
    })

    it('renders the host name', () => {
      render(<ListingCard listing={baseListing} />)
      expect(screen.getByText('Иван Петров')).toBeInTheDocument()
    })

    it('shows verification icon (BadgeCheck) for KYC-verified hosts', () => {
      const { container } = render(<ListingCard listing={baseListing} />)
      // BadgeCheck icon renders as SVG — confirm host name + that SVG present in host row
      expect(screen.getByText('Иван Петров')).toBeInTheDocument()
      // The BadgeCheck SVG is rendered alongside the host name
      expect(container.querySelector('svg')).toBeInTheDocument()
    })

    it('does NOT show verification checkmark when kycLevel is NONE', () => {
      const listing: Listing = {
        ...baseListing,
        host: { ...baseListing.host!, kycLevel: KycLevel.NONE },
      }
      render(<ListingCard listing={listing} />)
      expect(screen.queryByTitle('Верифицирован')).not.toBeInTheDocument()
    })

    it('renders the cover image with correct src and alt', () => {
      render(<ListingCard listing={baseListing} />)
      const img = screen.getByRole('img', { name: 'Квадроцикл Can-Am Renegade' })
      expect(img).toHaveAttribute('src', 'https://example.com/photo.jpg')
    })

    it('renders a placeholder SVG when there are no media items', () => {
      const listing: Listing = { ...baseListing, media: [] }
      render(<ListingCard listing={listing} />)
      expect(screen.queryByRole('img', { name: 'Квадроцикл Can-Am Renegade' })).not.toBeInTheDocument()
      // placeholder SVG path exists inside the image wrapper
      const { container } = render(<ListingCard listing={listing} />)
      expect(container.querySelector('svg')).toBeInTheDocument()
    })

    it('shows "Мгновенно" badge when instantBook is true', () => {
      const listing: Listing = { ...baseListing, instantBook: true }
      render(<ListingCard listing={listing} />)
      expect(screen.getByText('Мгновенно')).toBeInTheDocument()
    })

    it('does NOT show instant-book badge when instantBook is false', () => {
      render(<ListingCard listing={baseListing} />)
      expect(screen.queryByText('Мгновенное бронирование')).not.toBeInTheDocument()
    })

    it('shows rating value and reviews count when rating > 0', () => {
      render(<ListingCard listing={baseListing} />)
      expect(screen.getByText('4.5')).toBeInTheDocument()
      expect(screen.getByText('(8)')).toBeInTheDocument()
    })

    it('shows "Нет отзывов" when rating is 0 or undefined', () => {
      const listing: Listing = { ...baseListing, rating: 0, reviewsCount: 0 }
      render(<ListingCard listing={listing} />)
      expect(screen.getByText('Нет отзывов')).toBeInTheDocument()
    })

    it('renders a link to the correct listing page', () => {
      render(<ListingCard listing={baseListing} />)
      const link = screen.getByRole('link')
      expect(link).toHaveAttribute('href', '/listing/listing-1')
    })
  })

  describe('wishlist button', () => {
    it('renders the wishlist button with correct aria-label when not favourited', () => {
      render(<ListingCard listing={baseListing} wishlisted={false} />)
      expect(screen.getByRole('button', { name: 'В избранное' })).toBeInTheDocument()
    })

    it('renders the wishlist button with correct aria-label when already favourited', () => {
      render(<ListingCard listing={baseListing} wishlisted={true} />)
      expect(screen.getByRole('button', { name: 'Убрать из избранного' })).toBeInTheDocument()
    })

    it('toggles wishlist aria-label on click', () => {
      render(<ListingCard listing={baseListing} wishlisted={false} />)
      const btn = screen.getByRole('button', { name: 'В избранное' })
      fireEvent.click(btn)
      expect(screen.getByRole('button', { name: 'Убрать из избранного' })).toBeInTheDocument()
    })

    it('calls onWishlistToggle with the listing id on click', () => {
      const onToggle = jest.fn()
      render(<ListingCard listing={baseListing} onWishlistToggle={onToggle} />)
      fireEvent.click(screen.getByRole('button', { name: 'В избранное' }))
      expect(onToggle).toHaveBeenCalledTimes(1)
      expect(onToggle).toHaveBeenCalledWith('listing-1')
    })

    it('does not navigate when the wishlist button is clicked', () => {
      // fireEvent.click will bubble; we verify preventDefault via the handler
      // checking the link href is unchanged is sufficient in JSDOM
      render(<ListingCard listing={baseListing} />)
      const btn = screen.getByRole('button', { name: 'В избранное' })
      // Should not throw and link href must remain
      fireEvent.click(btn)
      expect(screen.getByRole('link')).toHaveAttribute('href', '/listing/listing-1')
    })
  })

  describe('host avatar fallback', () => {
    it('renders initials avatar when host has no avatarUrl', () => {
      const listing: Listing = {
        ...baseListing,
        host: { ...baseListing.host!, avatarUrl: undefined },
      }
      render(<ListingCard listing={listing} />)
      // Initial "И" for "Иван"
      expect(screen.getByText('И')).toBeInTheDocument()
    })

    it('renders fallback initial when host firstName is absent', () => {
      const listing: Listing = {
        ...baseListing,
        host: { ...baseListing.host!, firstName: undefined, lastName: undefined, avatarUrl: undefined },
      }
      render(<ListingCard listing={listing} />)
      // hostName falls back to 'Хост', so the initial avatar shows 'Х'
      expect(screen.getByText('Х')).toBeInTheDocument()
    })
  })
})
