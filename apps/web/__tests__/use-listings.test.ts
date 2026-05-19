/**
 * Tests for use-listings hooks.
 *
 * Strategy:
 * - Mock the api module (axios instance) so no real HTTP requests are made.
 * - Wrap each hook invocation in a minimal QueryClientProvider.
 * - Use @testing-library/react's renderHook + waitFor.
 */
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import { useSearchListings, useListing, useCreateListing } from '@/hooks/use-listings'
import type { Listing, SearchListingsResult } from '@rigs/types'
import { ListingType, ListingStatus, ListingCondition } from '@rigs/types'

// ────────────────────────────────────────────────────────────────────────────────
// Mock @/lib/api
// ────────────────────────────────────────────────────────────────────────────────
jest.mock('@/lib/api', () => ({
  api: {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
  },
}))

import { api } from '@/lib/api'

const mockGet = api.get as jest.MockedFunction<typeof api.get>
const mockPost = api.post as jest.MockedFunction<typeof api.post>

// ────────────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────────────
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children)
}

const fakeListing: Listing = {
  id: 'listing-1',
  hostId: 'host-1',
  categoryId: 1,
  title: 'Тестовый листинг',
  listingType: ListingType.EQUIPMENT,
  status: ListingStatus.ACTIVE,
  city: 'Москва',
  country: 'RU',
  condition: ListingCondition.GOOD,
  quantity: 1,
  availableQty: 1,
  priceDaily: 3000,
  currency: 'RUB',
  minRentalHours: 2,
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

const fakeSearchResult: SearchListingsResult = {
  items: [fakeListing],
  total: 1,
  page: 1,
  limit: 20,
  hasMore: false,
}

// ────────────────────────────────────────────────────────────────────────────────
// useSearchListings
// ────────────────────────────────────────────────────────────────────────────────
describe('useSearchListings', () => {
  beforeEach(() => {
    mockGet.mockClear()
  })

  it('starts in a loading state', () => {
    mockGet.mockImplementation(() => new Promise(() => {})) // never resolves
    const { result } = renderHook(
      () => useSearchListings({ city: 'Москва' }),
      { wrapper: createWrapper() },
    )
    expect(result.current.isLoading).toBe(true)
    expect(result.current.data).toBeUndefined()
  })

  it('returns data on success', async () => {
    mockGet.mockResolvedValueOnce({ data: fakeSearchResult })
    const { result } = renderHook(
      () => useSearchListings({ city: 'Москва' }),
      { wrapper: createWrapper() },
    )
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(fakeSearchResult)
    expect(result.current.data?.items).toHaveLength(1)
    expect(result.current.data?.items[0]!.title).toBe('Тестовый листинг')
  })

  it('builds a URL with query params', async () => {
    mockGet.mockResolvedValueOnce({ data: fakeSearchResult })
    renderHook(
      () => useSearchListings({ city: 'Москва', priceMin: 500, priceMax: 10000 }),
      { wrapper: createWrapper() },
    )
    await waitFor(() => expect(mockGet).toHaveBeenCalled())
    const calledUrl: string = mockGet.mock.calls[0]![0] as string
    expect(calledUrl).toContain('city=')
    expect(calledUrl).toContain('priceMin=500')
    expect(calledUrl).toContain('priceMax=10000')
  })

  it('omits undefined / empty values from the query string', async () => {
    mockGet.mockResolvedValueOnce({ data: fakeSearchResult })
    renderHook(
      () => useSearchListings({ city: 'Москва', q: undefined }),
      { wrapper: createWrapper() },
    )
    await waitFor(() => expect(mockGet).toHaveBeenCalled())
    const calledUrl: string = mockGet.mock.calls[0]![0] as string
    expect(calledUrl).not.toContain('q=')
    expect(calledUrl).not.toContain('region=')
  })

  it('surfaces errors', async () => {
    const error = new Error('Network error')
    mockGet.mockRejectedValueOnce(error)
    const { result } = renderHook(
      () => useSearchListings({}),
      { wrapper: createWrapper() },
    )
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error).toBe(error)
  })
})

// ────────────────────────────────────────────────────────────────────────────────
// useListing
// ────────────────────────────────────────────────────────────────────────────────
describe('useListing', () => {
  beforeEach(() => {
    mockGet.mockClear()
  })

  it('does NOT fetch when id is null', () => {
    renderHook(() => useListing(null), { wrapper: createWrapper() })
    expect(mockGet).not.toHaveBeenCalled()
  })

  it('fetches a single listing by id', async () => {
    mockGet.mockResolvedValueOnce({ data: fakeListing })
    const { result } = renderHook(
      () => useListing('listing-1'),
      { wrapper: createWrapper() },
    )
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.id).toBe('listing-1')
    expect(result.current.data?.title).toBe('Тестовый листинг')
    expect(mockGet).toHaveBeenCalledWith('/listings/listing-1')
  })

  it('surfaces errors from the API', async () => {
    mockGet.mockRejectedValueOnce(new Error('Not found'))
    const { result } = renderHook(
      () => useListing('missing-id'),
      { wrapper: createWrapper() },
    )
    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})

// ────────────────────────────────────────────────────────────────────────────────
// useCreateListing
// ────────────────────────────────────────────────────────────────────────────────
describe('useCreateListing', () => {
  beforeEach(() => {
    mockPost.mockClear()
  })

  it('posts to /listings and returns the created listing', async () => {
    mockPost.mockResolvedValueOnce({ data: fakeListing })
    const { result } = renderHook(() => useCreateListing(), {
      wrapper: createWrapper(),
    })
    result.current.mutate({
      categoryId: 1,
      title: 'Тестовый листинг',
      listingType: ListingType.EQUIPMENT,
      city: 'Москва',
      condition: ListingCondition.GOOD,
    })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(fakeListing)
    expect(mockPost).toHaveBeenCalledWith('/listings', expect.objectContaining({ title: 'Тестовый листинг' }))
  })

  it('surfaces mutation errors', async () => {
    const error = new Error('Validation failed')
    mockPost.mockRejectedValueOnce(error)
    const { result } = renderHook(() => useCreateListing(), {
      wrapper: createWrapper(),
    })
    result.current.mutate({
      categoryId: 1,
      title: '',
      listingType: ListingType.EQUIPMENT,
      city: 'Москва',
      condition: ListingCondition.GOOD,
    })
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error?.message).toBe('Validation failed')
  })
})
