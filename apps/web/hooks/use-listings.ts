'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type {
  Listing,
  SearchListingsQuery,
  SearchListingsResult,
  CreateListingDto,
} from '@rigs/types'

export function useSearchListings(query: SearchListingsQuery) {
  return useQuery<SearchListingsResult>({
    queryKey: ['listings', 'search', query],
    queryFn: async () => {
      const params = new URLSearchParams()
      Object.entries(query).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          if (Array.isArray(value)) {
            value.forEach((v) => params.append(key, String(v)))
          } else {
            params.set(key, String(value))
          }
        }
      })
      const { data } = await api.get<SearchListingsResult>(`/listings?${params.toString()}`)
      return data
    },
    placeholderData: (prev) => prev,
  })
}

export function useListing(id: string | null) {
  return useQuery<Listing>({
    queryKey: ['listings', id],
    queryFn: async () => {
      const { data } = await api.get<Listing>(`/listings/${id}`)
      return data
    },
    enabled: !!id,
  })
}

export function useCreateListing() {
  const queryClient = useQueryClient()
  return useMutation<Listing, Error, CreateListingDto>({
    mutationFn: async (dto) => {
      const { data } = await api.post<Listing>('/listings', dto)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['listings'] })
    },
  })
}

export function useUpdateListing() {
  const queryClient = useQueryClient()
  return useMutation<Listing, Error, { id: string; dto: Partial<CreateListingDto> }>({
    mutationFn: async ({ id, dto }) => {
      const { data } = await api.patch<Listing>(`/listings/${id}`, dto)
      return data
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['listings', id] })
      queryClient.invalidateQueries({ queryKey: ['listings'] })
    },
  })
}
