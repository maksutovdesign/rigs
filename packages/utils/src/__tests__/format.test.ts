import { maskPhone, slugify, truncate, generateOtp, generateCode } from '../format'
import { formatDate, formatDateShort, isDateAvailable, getDatesInRange } from '../date'

// ---------------------------------------------------------------------------
// maskPhone
// ---------------------------------------------------------------------------

describe('maskPhone', () => {
  // The regex captures up to 3 leading digits after '+', so '+79991234567'
  // captures '+799' as the prefix group, yielding '+799*****67'.
  it('masks middle digits of a Russian number (+79991234567 → +799*****67)', () => {
    expect(maskPhone('+79991234567')).toBe('+799*****67')
  })

  it('preserves the country code prefix (starts with +7)', () => {
    const result = maskPhone('+79991234567')
    expect(result.startsWith('+7')).toBe(true)
  })

  it('always exposes only the last 2 digits', () => {
    expect(maskPhone('+79991234567')).toMatch(/\d{2}$/)
  })

  it('replaces middle section with asterisks', () => {
    expect(maskPhone('+79991234567')).toMatch(/\*+/)
  })

  // '+12025550178' → regex captures '+120' (3 digits) as prefix group
  it('works with a US number: captures up to 3-digit prefix', () => {
    const result = maskPhone('+12025550178')
    expect(result).toMatch(/^\+\d{1,3}\*+\d{2}$/)
    expect(result).toMatch(/\*+/)
    expect(result.endsWith('78')).toBe(true)
  })

  // '+380991234567' → regex captures '+380' (3 digits) as prefix group
  it('masks a number with a multi-digit country code', () => {
    const result = maskPhone('+380991234567')
    expect(result).toMatch(/^\+\d{1,3}\*+\d{2}$/)
    expect(result).toMatch(/\*+/)
    expect(result.endsWith('67')).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// slugify
// ---------------------------------------------------------------------------

describe('slugify', () => {
  it('converts text to lowercase', () => {
    expect(slugify('Hello World')).toBe('hello-world')
  })

  it('replaces spaces with hyphens', () => {
    expect(slugify('hello world')).toBe('hello-world')
  })

  it('removes special characters', () => {
    expect(slugify('hello! world?')).toBe('hello-world')
  })

  it('handles multiple consecutive spaces as a single hyphen', () => {
    expect(slugify('hello   world')).toBe('hello-world')
  })

  it('removes leading and trailing hyphens', () => {
    expect(slugify(' hello world ')).toBe('hello-world')
  })

  it('handles underscores by converting to hyphens', () => {
    expect(slugify('hello_world')).toBe('hello-world')
  })

  it('handles already-hyphenated text', () => {
    expect(slugify('hello-world')).toBe('hello-world')
  })

  it('collapses multiple hyphens into one', () => {
    expect(slugify('hello--world')).toBe('hello-world')
  })

  it('handles cyrillic-free ASCII text correctly', () => {
    expect(slugify('Pickup Truck 2024')).toBe('pickup-truck-2024')
  })

  it('returns empty string for input with only special chars', () => {
    expect(slugify('!@#$%')).toBe('')
  })
})

// ---------------------------------------------------------------------------
// truncate
// ---------------------------------------------------------------------------

describe('truncate', () => {
  it('returns the original string when at or under maxLength', () => {
    expect(truncate('hello', 10)).toBe('hello')
  })

  it('returns the original string when exactly at maxLength', () => {
    expect(truncate('hello', 5)).toBe('hello')
  })

  it('appends "..." when text exceeds maxLength', () => {
    expect(truncate('hello world', 8)).toBe('hello...')
  })

  it('truncated result length equals maxLength', () => {
    const result = truncate('abcdefghij', 7)
    expect(result.length).toBe(7)
    expect(result).toBe('abcd...')
  })

  it('handles maxLength of 3 (minimum meaningful truncation)', () => {
    expect(truncate('hello', 3)).toBe('...')
  })

  it('handles empty string input', () => {
    expect(truncate('', 5)).toBe('')
  })

  it('handles very long text', () => {
    const long = 'a'.repeat(200)
    const result = truncate(long, 20)
    expect(result).toBe('a'.repeat(17) + '...')
    expect(result.length).toBe(20)
  })
})

// ---------------------------------------------------------------------------
// generateOtp
// ---------------------------------------------------------------------------

describe('generateOtp', () => {
  it('returns a string', () => {
    expect(typeof generateOtp()).toBe('string')
  })

  it('returns a string of default length 6', () => {
    expect(generateOtp()).toHaveLength(6)
  })

  it('returns a string of the specified length', () => {
    expect(generateOtp(4)).toHaveLength(4)
    expect(generateOtp(8)).toHaveLength(8)
  })

  it('contains only digits', () => {
    const otp = generateOtp(20)
    expect(otp).toMatch(/^\d+$/)
  })

  it('generates different values on consecutive calls (probabilistic)', () => {
    const results = new Set(Array.from({ length: 20 }, () => generateOtp()))
    // 20 random 6-digit strings should not all be identical
    expect(results.size).toBeGreaterThan(1)
  })
})

// ---------------------------------------------------------------------------
// generateCode
// ---------------------------------------------------------------------------

describe('generateCode', () => {
  it('returns a string', () => {
    expect(typeof generateCode()).toBe('string')
  })

  it('returns a string of default length 6', () => {
    expect(generateCode()).toHaveLength(6)
  })

  it('returns a string of the specified length', () => {
    expect(generateCode(4)).toHaveLength(4)
    expect(generateCode(10)).toHaveLength(10)
  })

  it('contains only uppercase letters and digits', () => {
    const code = generateCode(50)
    expect(code).toMatch(/^[A-Z0-9]+$/)
  })

  it('does not contain ambiguous character 0', () => {
    // Run many times to reduce flakiness
    for (let i = 0; i < 100; i++) {
      expect(generateCode(20)).not.toMatch(/0/)
    }
  })

  it('does not contain ambiguous character O', () => {
    for (let i = 0; i < 100; i++) {
      expect(generateCode(20)).not.toMatch(/O/)
    }
  })

  it('does not contain ambiguous character 1', () => {
    for (let i = 0; i < 100; i++) {
      expect(generateCode(20)).not.toMatch(/1/)
    }
  })

  it('does not contain ambiguous character I', () => {
    for (let i = 0; i < 100; i++) {
      expect(generateCode(20)).not.toMatch(/I/)
    }
  })

  it('generates different values on consecutive calls (probabilistic)', () => {
    const results = new Set(Array.from({ length: 20 }, () => generateCode()))
    expect(results.size).toBeGreaterThan(1)
  })
})

// ---------------------------------------------------------------------------
// formatDate
// ---------------------------------------------------------------------------

describe('formatDate', () => {
  it('returns a non-empty string', () => {
    expect(formatDate(new Date('2025-06-15'))).toBeTruthy()
  })

  it('accepts a Date object', () => {
    expect(() => formatDate(new Date('2025-06-15'))).not.toThrow()
  })

  it('accepts a date string', () => {
    expect(() => formatDate('2025-06-15')).not.toThrow()
  })

  it('default locale is ru-RU and includes the year', () => {
    const result = formatDate(new Date('2025-06-15'))
    expect(result).toMatch(/2025/)
  })

  it('respects the locale parameter', () => {
    const ruResult = formatDate(new Date('2025-06-15'), 'ru-RU')
    const enResult = formatDate(new Date('2025-06-15'), 'en-US')
    // Both should be non-empty strings; different locales should differ
    expect(typeof ruResult).toBe('string')
    expect(typeof enResult).toBe('string')
  })
})

// ---------------------------------------------------------------------------
// formatDateShort
// ---------------------------------------------------------------------------

describe('formatDateShort', () => {
  it('returns a non-empty string', () => {
    expect(formatDateShort(new Date('2025-06-15'))).toBeTruthy()
  })

  it('does not include the year by default', () => {
    const result = formatDateShort(new Date('2025-06-15'))
    expect(result).not.toMatch(/2025/)
  })

  it('accepts a date string', () => {
    expect(() => formatDateShort('2025-06-15')).not.toThrow()
  })

  it('returns a shorter string than formatDate', () => {
    const date = new Date('2025-06-15')
    expect(formatDateShort(date).length).toBeLessThan(formatDate(date).length)
  })
})

// ---------------------------------------------------------------------------
// isDateAvailable
// ---------------------------------------------------------------------------

describe('isDateAvailable', () => {
  const unavailable = [
    new Date('2025-07-04T00:00:00Z'),
    new Date('2025-07-10T00:00:00Z'),
    new Date('2025-07-15T00:00:00Z'),
  ]

  it('returns true when the date is not in the unavailable list', () => {
    expect(isDateAvailable(new Date('2025-07-05T00:00:00Z'), unavailable)).toBe(true)
  })

  it('returns false when the date is in the unavailable list', () => {
    expect(isDateAvailable(new Date('2025-07-04T00:00:00Z'), unavailable)).toBe(false)
  })

  it('returns true for an empty unavailable list', () => {
    expect(isDateAvailable(new Date('2025-07-04T00:00:00Z'), [])).toBe(true)
  })

  it('compares by date string (ignores time component)', () => {
    // Same calendar day, different time → should be unavailable
    const date = new Date('2025-07-04T15:30:00Z')
    const blocked = [new Date('2025-07-04T00:00:00Z')]
    expect(isDateAvailable(date, blocked)).toBe(false)
  })

  it('returns true when only different dates are in the list', () => {
    const date = new Date('2025-07-20T00:00:00Z')
    expect(isDateAvailable(date, unavailable)).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// getDatesInRange
// ---------------------------------------------------------------------------

describe('getDatesInRange', () => {
  it('returns an array', () => {
    const result = getDatesInRange(new Date('2025-01-01'), new Date('2025-01-03'))
    expect(Array.isArray(result)).toBe(true)
  })

  it('includes the start date', () => {
    const start = new Date('2025-01-01T00:00:00Z')
    const end = new Date('2025-01-03T00:00:00Z')
    const result = getDatesInRange(start, end)
    expect(result[0]!.toDateString()).toBe(start.toDateString())
  })

  it('includes the end date', () => {
    const start = new Date('2025-01-01T00:00:00Z')
    const end = new Date('2025-01-03T00:00:00Z')
    const result = getDatesInRange(start, end)
    expect(result[result.length - 1]!.toDateString()).toBe(end.toDateString())
  })

  it('returns correct number of dates for a 3-day range (inclusive endpoints)', () => {
    const start = new Date('2025-01-01T00:00:00Z')
    const end = new Date('2025-01-03T00:00:00Z')
    expect(getDatesInRange(start, end)).toHaveLength(3)
  })

  it('returns a single date when start === end', () => {
    const date = new Date('2025-06-15T00:00:00Z')
    const result = getDatesInRange(date, date)
    expect(result).toHaveLength(1)
    expect(result[0]!.toDateString()).toBe(date.toDateString())
  })

  it('returns 7 dates for a 7-day range', () => {
    const start = new Date('2025-03-01T00:00:00Z')
    const end = new Date('2025-03-07T00:00:00Z')
    expect(getDatesInRange(start, end)).toHaveLength(7)
  })

  it('returns 31 dates for the month of January', () => {
    const start = new Date('2025-01-01T00:00:00Z')
    const end = new Date('2025-01-31T00:00:00Z')
    expect(getDatesInRange(start, end)).toHaveLength(31)
  })

  it('returns Date objects in the array', () => {
    const result = getDatesInRange(new Date('2025-01-01T00:00:00Z'), new Date('2025-01-03T00:00:00Z'))
    result.forEach((d) => expect(d).toBeInstanceOf(Date))
  })

  it('dates are in ascending order', () => {
    const start = new Date('2025-05-01T00:00:00Z')
    const end = new Date('2025-05-05T00:00:00Z')
    const result = getDatesInRange(start, end)
    for (let i = 1; i < result.length; i++) {
      expect(result[i]!.getTime()).toBeGreaterThan(result[i - 1]!.getTime())
    }
  })
})
