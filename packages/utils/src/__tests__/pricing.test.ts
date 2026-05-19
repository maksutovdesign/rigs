import {
  PLATFORM_FEE_RENTER,
  PLATFORM_FEE_HOST,
  INSURANCE_FEE_BASIC,
  INSURANCE_FEE_EXTENDED,
  calcRentalDays,
  calcRentalHours,
  calcSubtotal,
  calcBookingTotal,
} from '../pricing'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

describe('fee constants', () => {
  it('PLATFORM_FEE_RENTER is 0.11', () => {
    expect(PLATFORM_FEE_RENTER).toBe(0.11)
  })

  it('PLATFORM_FEE_HOST is 0.17', () => {
    expect(PLATFORM_FEE_HOST).toBe(0.17)
  })

  it('INSURANCE_FEE_BASIC is 0.04', () => {
    expect(INSURANCE_FEE_BASIC).toBe(0.04)
  })

  it('INSURANCE_FEE_EXTENDED is 0.08', () => {
    expect(INSURANCE_FEE_EXTENDED).toBe(0.08)
  })
})

// ---------------------------------------------------------------------------
// calcRentalDays
// ---------------------------------------------------------------------------

describe('calcRentalDays', () => {
  it('returns 1 for exactly 24 hours apart', () => {
    const start = new Date('2025-01-01T10:00:00Z')
    const end = new Date('2025-01-02T10:00:00Z')
    expect(calcRentalDays(start, end)).toBe(1)
  })

  it('returns 1 for less than 24 hours (ceil)', () => {
    const start = new Date('2025-01-01T10:00:00Z')
    const end = new Date('2025-01-01T18:00:00Z')
    expect(calcRentalDays(start, end)).toBe(1)
  })

  it('returns 3 for 3 days', () => {
    const start = new Date('2025-01-01T00:00:00Z')
    const end = new Date('2025-01-04T00:00:00Z')
    expect(calcRentalDays(start, end)).toBe(3)
  })

  it('returns 7 for exactly 7 days', () => {
    const start = new Date('2025-01-01T00:00:00Z')
    const end = new Date('2025-01-08T00:00:00Z')
    expect(calcRentalDays(start, end)).toBe(7)
  })

  it('returns 30 for exactly 30 days', () => {
    const start = new Date('2025-01-01T00:00:00Z')
    const end = new Date('2025-01-31T00:00:00Z')
    expect(calcRentalDays(start, end)).toBe(30)
  })

  it('rounds up partial days', () => {
    const start = new Date('2025-01-01T00:00:00Z')
    const end = new Date('2025-01-02T01:00:00Z') // 25 hours → 2 days
    expect(calcRentalDays(start, end)).toBe(2)
  })
})

// ---------------------------------------------------------------------------
// calcRentalHours
// ---------------------------------------------------------------------------

describe('calcRentalHours', () => {
  it('returns 1 for exactly 1 hour', () => {
    const start = new Date('2025-01-01T10:00:00Z')
    const end = new Date('2025-01-01T11:00:00Z')
    expect(calcRentalHours(start, end)).toBe(1)
  })

  it('returns 24 for exactly 24 hours', () => {
    const start = new Date('2025-01-01T00:00:00Z')
    const end = new Date('2025-01-02T00:00:00Z')
    expect(calcRentalHours(start, end)).toBe(24)
  })

  it('rounds up partial hours (ceil)', () => {
    const start = new Date('2025-01-01T10:00:00Z')
    const end = new Date('2025-01-01T10:30:00Z') // 30 min → 1 hour
    expect(calcRentalHours(start, end)).toBe(1)
  })

  it('returns 3 for 2.5 hours (ceil to 3)', () => {
    const start = new Date('2025-01-01T10:00:00Z')
    const end = new Date('2025-01-01T12:30:00Z')
    expect(calcRentalHours(start, end)).toBe(3)
  })
})

// ---------------------------------------------------------------------------
// calcSubtotal
// ---------------------------------------------------------------------------

describe('calcSubtotal', () => {
  const baseListing = {
    priceHourly: 500,
    priceDaily: 3000,
    priceWeekly: 18000,
    priceMonthly: 60000,
  }

  // --- monthly ---

  it('uses monthly pricing for >= 30 days', () => {
    const start = new Date('2025-01-01T00:00:00Z')
    const end = new Date('2025-01-31T00:00:00Z') // 30 days → 1 month
    expect(calcSubtotal(baseListing, start, end)).toBe(60000)
  })

  it('uses monthly pricing for exactly 30 days', () => {
    const start = new Date('2025-01-01T00:00:00Z')
    const end = new Date('2025-01-31T00:00:00Z') // 30 days
    expect(calcSubtotal(baseListing, start, end)).toBe(60000)
  })

  it('rounds up months: 45 days → 2 months', () => {
    const start = new Date('2025-01-01T00:00:00Z')
    const end = new Date('2025-02-15T00:00:00Z') // 45 days → ceil(45/30)=2
    expect(calcSubtotal(baseListing, start, end)).toBe(120000)
  })

  it('falls back to weekly when no priceMonthly, >= 30 days', () => {
    const listing = { ...baseListing, priceMonthly: undefined }
    const start = new Date('2025-01-01T00:00:00Z')
    const end = new Date('2025-01-31T00:00:00Z') // 30 days → ceil(30/7)=5 weeks
    expect(calcSubtotal(listing, start, end)).toBe(5 * 18000)
  })

  // --- weekly ---

  it('uses weekly pricing for >= 7 days (and < 30)', () => {
    const start = new Date('2025-01-01T00:00:00Z')
    const end = new Date('2025-01-08T00:00:00Z') // exactly 7 days → 1 week
    expect(calcSubtotal(baseListing, start, end)).toBe(18000)
  })

  it('uses weekly pricing for exactly 7 days', () => {
    const start = new Date('2025-01-01T00:00:00Z')
    const end = new Date('2025-01-08T00:00:00Z')
    expect(calcSubtotal(baseListing, start, end)).toBe(18000)
  })

  it('rounds up weeks: 10 days → 2 weeks', () => {
    const start = new Date('2025-01-01T00:00:00Z')
    const end = new Date('2025-01-11T00:00:00Z') // 10 days → ceil(10/7)=2
    expect(calcSubtotal(baseListing, start, end)).toBe(2 * 18000)
  })

  it('falls back to daily when no priceWeekly, >= 7 days', () => {
    const listing = { ...baseListing, priceWeekly: undefined }
    const start = new Date('2025-01-01T00:00:00Z')
    const end = new Date('2025-01-08T00:00:00Z') // 7 days
    expect(calcSubtotal(listing, start, end)).toBe(7 * 3000)
  })

  // --- daily ---

  it('uses daily pricing for < 7 days', () => {
    const start = new Date('2025-01-01T00:00:00Z')
    const end = new Date('2025-01-04T00:00:00Z') // 3 days
    expect(calcSubtotal(baseListing, start, end)).toBe(3 * 3000)
  })

  it('uses daily pricing for 1 day when no priceHourly is set', () => {
    const listing = { ...baseListing, priceHourly: undefined }
    const start = new Date('2025-01-01T00:00:00Z')
    const end = new Date('2025-01-02T00:00:00Z')
    expect(calcSubtotal(listing, start, end)).toBe(3000)
  })

  it('falls back to hourly when no priceDaily', () => {
    const listing = { ...baseListing, priceDaily: undefined, priceWeekly: undefined, priceMonthly: undefined }
    const start = new Date('2025-01-01T10:00:00Z')
    const end = new Date('2025-01-01T14:00:00Z') // 4 hours
    expect(calcSubtotal(listing, start, end)).toBe(4 * 500)
  })

  // --- hourly fallback ---

  it('uses hourly pricing when only priceHourly is set', () => {
    const listing = { priceHourly: 500, priceDaily: undefined, priceWeekly: undefined, priceMonthly: undefined }
    const start = new Date('2025-01-01T08:00:00Z')
    const end = new Date('2025-01-01T11:00:00Z') // 3 hours
    expect(calcSubtotal(listing, start, end)).toBe(1500)
  })

  // --- short rental hourly preference ---

  it('25-hour rental with both priceHourly and priceDaily uses hourly (25 × priceHourly)', () => {
    const start = new Date('2025-01-01T00:00:00Z')
    const end = new Date('2025-01-02T01:00:00Z') // 25 hours
    expect(calcSubtotal(baseListing, start, end)).toBe(25 * 500)
  })

  it('23-hour rental with only priceDaily still uses daily (1 × priceDaily)', () => {
    const listing = { ...baseListing, priceHourly: undefined }
    const start = new Date('2025-01-01T00:00:00Z')
    const end = new Date('2025-01-01T23:00:00Z') // 23 hours
    expect(calcSubtotal(listing, start, end)).toBe(1 * 3000)
  })

  it('48-hour rental (2 days exactly) uses daily pricing even when priceHourly also exists', () => {
    const start = new Date('2025-01-01T00:00:00Z')
    const end = new Date('2025-01-03T00:00:00Z') // exactly 48 hours = 2 days
    expect(calcSubtotal(baseListing, start, end)).toBe(2 * 3000)
  })

  it('returns 0 when no prices are set', () => {
    const listing = { priceHourly: undefined, priceDaily: undefined, priceWeekly: undefined, priceMonthly: undefined }
    const start = new Date('2025-01-01T00:00:00Z')
    const end = new Date('2025-01-02T00:00:00Z')
    expect(calcSubtotal(listing, start, end)).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// calcBookingTotal
// ---------------------------------------------------------------------------

describe('calcBookingTotal', () => {
  const subtotal = 10000

  describe('without insurance', () => {
    it('calculates serviceFee as 11% of subtotal', () => {
      const result = calcBookingTotal({ subtotal })
      expect(result.serviceFee).toBe(Math.round(subtotal * 0.11))
    })

    it('sets insuranceFee to 0', () => {
      const result = calcBookingTotal({ subtotal })
      expect(result.insuranceFee).toBe(0)
    })

    it('sets deliveryFee to 0 by default', () => {
      const result = calcBookingTotal({ subtotal })
      expect(result.deliveryFee).toBe(0)
    })

    it('returns correct totalAmount (subtotal + serviceFee + 0 + 0)', () => {
      const result = calcBookingTotal({ subtotal })
      expect(result.totalAmount).toBe(result.subtotal + result.serviceFee + result.insuranceFee + result.deliveryFee)
    })

    it('returns hostPayout as Math.round(subtotal * 0.83)', () => {
      const result = calcBookingTotal({ subtotal })
      expect(result.hostPayout).toBe(Math.round(subtotal * 0.83))
    })

    it('returns hostCommission as Math.round(subtotal * 0.17)', () => {
      const result = calcBookingTotal({ subtotal })
      expect(result.hostCommission).toBe(Math.round(subtotal * 0.17))
    })

    it('passes subtotal through unchanged', () => {
      const result = calcBookingTotal({ subtotal })
      expect(result.subtotal).toBe(subtotal)
    })
  })

  describe('with basic insurance', () => {
    it('calculates insuranceFee as 4% of subtotal', () => {
      const result = calcBookingTotal({ subtotal, withInsurance: true })
      expect(result.insuranceFee).toBe(Math.round(subtotal * 0.04))
    })

    it('includes insuranceFee in totalAmount', () => {
      const result = calcBookingTotal({ subtotal, withInsurance: true })
      expect(result.totalAmount).toBe(result.subtotal + result.serviceFee + result.insuranceFee + result.deliveryFee)
    })
  })

  describe('with extended insurance', () => {
    it('calculates insuranceFee as 8% of subtotal', () => {
      const result = calcBookingTotal({ subtotal, withInsurance: true, extendedInsurance: true })
      expect(result.insuranceFee).toBe(Math.round(subtotal * 0.08))
    })

    it('extended insuranceFee is greater than basic insuranceFee', () => {
      const basic = calcBookingTotal({ subtotal, withInsurance: true })
      const extended = calcBookingTotal({ subtotal, withInsurance: true, extendedInsurance: true })
      expect(extended.insuranceFee).toBeGreaterThan(basic.insuranceFee)
    })

    it('includes extended insuranceFee in totalAmount', () => {
      const result = calcBookingTotal({ subtotal, withInsurance: true, extendedInsurance: true })
      expect(result.totalAmount).toBe(result.subtotal + result.serviceFee + result.insuranceFee + result.deliveryFee)
    })
  })

  describe('with deliveryFee', () => {
    it('includes deliveryFee in totalAmount', () => {
      const deliveryFee = 500
      const result = calcBookingTotal({ subtotal, deliveryFee })
      expect(result.deliveryFee).toBe(deliveryFee)
      expect(result.totalAmount).toBe(result.subtotal + result.serviceFee + result.insuranceFee + deliveryFee)
    })

    it('does not include deliveryFee in hostPayout calculation', () => {
      const deliveryFee = 500
      const withDelivery = calcBookingTotal({ subtotal, deliveryFee })
      const withoutDelivery = calcBookingTotal({ subtotal })
      expect(withDelivery.hostPayout).toBe(withoutDelivery.hostPayout)
    })
  })

  describe('totalAmount invariant', () => {
    it('totalAmount = subtotal + serviceFee + insuranceFee + deliveryFee (all fees)', () => {
      const result = calcBookingTotal({
        subtotal,
        withInsurance: true,
        extendedInsurance: true,
        deliveryFee: 750,
      })
      expect(result.totalAmount).toBe(
        result.subtotal + result.serviceFee + result.insuranceFee + result.deliveryFee,
      )
    })
  })

  describe('hostPayout invariant', () => {
    it('hostPayout = Math.round(subtotal * 0.83) for various subtotals', () => {
      for (const amount of [1000, 5000, 9999, 12345]) {
        const result = calcBookingTotal({ subtotal: amount })
        expect(result.hostPayout).toBe(Math.round(amount * 0.83))
      }
    })

    it('hostPayout + hostCommission approximates subtotal (rounding diff <= 1)', () => {
      const result = calcBookingTotal({ subtotal })
      expect(Math.abs(result.hostPayout + result.hostCommission - subtotal)).toBeLessThanOrEqual(1)
    })
  })
})
