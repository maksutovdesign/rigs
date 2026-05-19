import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { BookingWidget } from '@/components/listings/booking-widget'
import type { Listing } from '@rigs/types'
import { ListingType, ListingStatus, ListingCondition } from '@rigs/types'

// ────────────────────────────────────────────────────────────────────────────────
// Module stubs
// ────────────────────────────────────────────────────────────────────────────────
const mockPush = jest.fn()

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, back: jest.fn(), replace: jest.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/',
}))

// DayPicker is a complex date picker — stub it so tests don't depend on its
// internal implementation while still allowing us to simulate date selection.
jest.mock('react-day-picker', () => ({
  DayPicker: ({
    onSelect,
  }: {
    onSelect?: (range: { from: Date; to: Date } | undefined) => void
  }) => (
    <div data-testid="day-picker">
      <button
        data-testid="pick-range"
        onClick={() => {
          const from = new Date('2025-08-01')
          const to = new Date('2025-08-03')
          onSelect?.({ from, to })
        }}
      >
        Выбрать диапазон
      </button>
    </div>
  ),
}))

// ────────────────────────────────────────────────────────────────────────────────
// Test fixture
// ────────────────────────────────────────────────────────────────────────────────
const baseListing: Listing = {
  id: 'listing-1',
  hostId: 'host-1',
  categoryId: 1,
  title: 'Квадроцикл Can-Am',
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
  requiresLicense: false,
  requiresCert: false,
  minAge: 18,
  tags: [],
  media: [],
  attributes: [],
  viewsCount: 0,
  bookingsCount: 0,
  reviewsCount: 0,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
}

// ────────────────────────────────────────────────────────────────────────────────
// Tests
// ────────────────────────────────────────────────────────────────────────────────
describe('BookingWidget', () => {
  beforeEach(() => {
    mockPush.mockClear()
  })

  describe('price display', () => {
    it('shows daily price with unit "/ день"', () => {
      render(<BookingWidget listing={baseListing} isAuthenticated={false} />)
      expect(screen.getByText(/5\s*000/)).toBeInTheDocument()
      expect(screen.getByText('/ день')).toBeInTheDocument()
    })

    it('shows hourly price with unit "/ час" when no daily price exists', () => {
      const listing: Listing = { ...baseListing, priceDaily: undefined, priceHourly: 700 }
      render(<BookingWidget listing={listing} isAuthenticated={false} />)
      expect(screen.getByText(/700/)).toBeInTheDocument()
      expect(screen.getByText('/ час')).toBeInTheDocument()
    })

    it('does not show price header section when neither price is set', () => {
      const listing: Listing = { ...baseListing, priceDaily: undefined, priceHourly: undefined }
      render(<BookingWidget listing={listing} isAuthenticated={false} />)
      expect(screen.queryByText('/ день')).not.toBeInTheDocument()
      expect(screen.queryByText('/ час')).not.toBeInTheDocument()
    })
  })

  describe('date picker trigger', () => {
    it('shows "Выбрать" placeholders before dates are chosen', () => {
      render(<BookingWidget listing={baseListing} isAuthenticated={true} />)
      const placeholders = screen.getAllByText('Выбрать')
      expect(placeholders).toHaveLength(2)
    })

    it('opens the calendar when the date trigger is clicked', () => {
      render(<BookingWidget listing={baseListing} isAuthenticated={true} />)
      expect(screen.queryByTestId('day-picker')).not.toBeInTheDocument()
      fireEvent.click(screen.getByText('Заезд').closest('button')!)
      expect(screen.getByTestId('day-picker')).toBeInTheDocument()
    })

    it('closes the calendar and shows chosen dates after a range is selected', () => {
      render(<BookingWidget listing={baseListing} isAuthenticated={true} />)
      // open
      fireEvent.click(screen.getByText('Заезд').closest('button')!)
      // pick dates via our stub
      fireEvent.click(screen.getByTestId('pick-range'))
      // calendar should close (from+to both set)
      expect(screen.queryByTestId('day-picker')).not.toBeInTheDocument()
      // dates rendered in "1 авг." / "3 авг." format
      expect(screen.getByText(/1 авг/i)).toBeInTheDocument()
      expect(screen.getByText(/3 авг/i)).toBeInTheDocument()
    })
  })

  describe('unauthenticated flow', () => {
    it('renders "Войти для бронирования" button when not authenticated', () => {
      render(<BookingWidget listing={baseListing} isAuthenticated={false} />)
      expect(screen.getByRole('button', { name: 'Войти для бронирования' })).toBeInTheDocument()
    })

    it('navigates to /auth when "Войти для бронирования" is clicked', () => {
      render(<BookingWidget listing={baseListing} isAuthenticated={false} />)
      fireEvent.click(screen.getByRole('button', { name: 'Войти для бронирования' }))
      expect(mockPush).toHaveBeenCalledWith('/auth')
    })

    it('shows helper text about sign-in', () => {
      render(<BookingWidget listing={baseListing} isAuthenticated={false} />)
      expect(
        screen.getByText(/Войдите или зарегистрируйтесь/i),
      ).toBeInTheDocument()
    })
  })

  describe('authenticated flow — no dates selected', () => {
    it('shows "Выбрать даты" CTA before dates are chosen', () => {
      render(<BookingWidget listing={baseListing} isAuthenticated={true} />)
      expect(screen.getByRole('button', { name: 'Выбрать даты' })).toBeInTheDocument()
    })

    it('clicking "Выбрать даты" opens the calendar', () => {
      render(<BookingWidget listing={baseListing} isAuthenticated={true} />)
      fireEvent.click(screen.getByRole('button', { name: 'Выбрать даты' }))
      expect(screen.getByTestId('day-picker')).toBeInTheDocument()
    })
  })

  describe('authenticated flow — dates selected', () => {
    function renderWithDates() {
      render(<BookingWidget listing={baseListing} isAuthenticated={true} />)
      // open calendar and pick range
      fireEvent.click(screen.getByText('Заезд').closest('button')!)
      fireEvent.click(screen.getByTestId('pick-range'))
    }

    it('shows "Забронировать" CTA after dates are chosen', () => {
      renderWithDates()
      expect(screen.getByRole('button', { name: 'Забронировать' })).toBeInTheDocument()
    })

    it('shows price breakdown after dates are chosen', () => {
      renderWithDates()
      // service fee label
      expect(screen.getByText(/Сервисный сбор/)).toBeInTheDocument()
      // total label
      expect(screen.getByText('Итого')).toBeInTheDocument()
    })

    it('navigates to /booking/new with correct params on "Забронировать"', () => {
      renderWithDates()
      fireEvent.click(screen.getByRole('button', { name: 'Забронировать' }))
      expect(mockPush).toHaveBeenCalledTimes(1)
      const [url] = mockPush.mock.calls[0]
      expect(url).toMatch(/^\/booking\/new\?/)
      expect(url).toContain('listingId=listing-1')
      expect(url).toContain('startDate=2025-08-01')
      expect(url).toContain('endDate=2025-08-03')
    })
  })

  describe('quantity selector', () => {
    it('is NOT shown when quantity is 1', () => {
      render(<BookingWidget listing={baseListing} isAuthenticated={true} />)
      expect(screen.queryByText('Количество')).not.toBeInTheDocument()
    })

    it('is shown when quantity > 1', () => {
      const listing: Listing = { ...baseListing, quantity: 3, availableQty: 3 }
      render(<BookingWidget listing={listing} isAuthenticated={true} />)
      expect(screen.getByText('Количество')).toBeInTheDocument()
    })

    it('increments and decrements quantity', () => {
      const listing: Listing = { ...baseListing, quantity: 5, availableQty: 5 }
      render(<BookingWidget listing={listing} isAuthenticated={true} />)
      const [decBtn, incBtn] = screen.getAllByRole('button').filter(
        (b) => b.textContent === '−' || b.textContent === '+',
      )
      expect(screen.getByText('1')).toBeInTheDocument()
      fireEvent.click(incBtn!)
      expect(screen.getByText('2')).toBeInTheDocument()
      fireEvent.click(decBtn!)
      expect(screen.getByText('1')).toBeInTheDocument()
    })

    it('does not decrement below 1', () => {
      const listing: Listing = { ...baseListing, quantity: 3, availableQty: 3 }
      render(<BookingWidget listing={listing} isAuthenticated={true} />)
      const decBtn = screen.getAllByRole('button').find((b) => b.textContent === '−')!
      fireEvent.click(decBtn)
      expect(screen.getByText('1')).toBeInTheDocument()
    })
  })

  describe('insurance toggle', () => {
    it('shows insurance section', () => {
      render(<BookingWidget listing={baseListing} isAuthenticated={true} />)
      expect(screen.getByText('Страховка')).toBeInTheDocument()
      expect(screen.getByText('4% от стоимости аренды')).toBeInTheDocument()
    })

    it('shows insurance fee in breakdown when toggled on (dates required)', () => {
      render(<BookingWidget listing={baseListing} isAuthenticated={true} />)
      // first pick dates to generate a subtotal
      fireEvent.click(screen.getByText('Заезд').closest('button')!)
      fireEvent.click(screen.getByTestId('pick-range'))
      // now toggle insurance
      const insuranceToggle = screen
        .getByText('Страховка')
        .closest('label')!
        .querySelector('div[class*="rounded-full"]')!
      fireEvent.click(insuranceToggle)
      expect(screen.getByText(/Страховка \(4%\)/)).toBeInTheDocument()
    })
  })

  describe('delivery toggle', () => {
    const listingWithDelivery: Listing = {
      ...baseListing,
      deliveryAvailable: true,
      deliveryPricePerKm: 50,
    }

    it('is shown when deliveryAvailable is true', () => {
      render(<BookingWidget listing={listingWithDelivery} isAuthenticated={true} />)
      expect(screen.getByText('Доставка')).toBeInTheDocument()
    })

    it('is NOT shown when deliveryAvailable is false', () => {
      render(<BookingWidget listing={baseListing} isAuthenticated={true} />)
      expect(screen.queryByText('Доставка')).not.toBeInTheDocument()
    })

    it('shows delivery price-per-km hint', () => {
      render(<BookingWidget listing={listingWithDelivery} isAuthenticated={true} />)
      expect(screen.getByText(/км/i)).toBeInTheDocument()
    })

    it('includes delivery fee in booking URL params when toggled on', () => {
      render(<BookingWidget listing={listingWithDelivery} isAuthenticated={true} />)
      // pick dates
      fireEvent.click(screen.getByText('Заезд').closest('button')!)
      fireEvent.click(screen.getByTestId('pick-range'))
      // toggle delivery
      const deliveryToggle = screen
        .getByText('Доставка')
        .closest('label')!
        .querySelector('div[class*="rounded-full"]')!
      fireEvent.click(deliveryToggle)
      // book
      fireEvent.click(screen.getByRole('button', { name: 'Забронировать' }))
      const [url] = mockPush.mock.calls[0]
      expect(url).toContain('deliveryType=delivery')
    })
  })

  describe('instant book notice', () => {
    it('shows instant-book notice when instantBook is true', () => {
      const listing: Listing = { ...baseListing, instantBook: true }
      render(<BookingWidget listing={listing} isAuthenticated={true} />)
      expect(screen.getByText(/Мгновенное подтверждение/)).toBeInTheDocument()
    })

    it('does NOT show instant-book notice when instantBook is false', () => {
      render(<BookingWidget listing={baseListing} isAuthenticated={true} />)
      expect(screen.queryByText(/Мгновенное подтверждение/)).not.toBeInTheDocument()
    })
  })
})
