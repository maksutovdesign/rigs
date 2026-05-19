import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import type { Listing, SearchListingsQuery, SearchListingsResult, CreateListingDto } from '@rigs/types'

export function useSearchListings(params?: SearchListingsQuery) {
  return useQuery<SearchListingsResult>({
    queryKey: ['listings', 'search', params],
    queryFn: async () => {
      const { data } = await api.get<SearchListingsResult>('/listings', { params })
      return data
    },
    staleTime: 60_000,
  })
}

export function useListing(id: string | undefined) {
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
