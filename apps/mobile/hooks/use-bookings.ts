import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import type { Booking, CreateBookingDto } from '@rigs/types'

export function useMyRentals() {
  return useQuery<Booking[]>({
    queryKey: ['bookings', 'my'],
    queryFn: async () => {
      const { data } = await api.get<Booking[]>('/bookings')
      return data
    },
  })
}

export function useHostBookings() {
  return useQuery<Booking[]>({
    queryKey: ['bookings', 'host'],
    queryFn: async () => {
      const { data } = await api.get<Booking[]>('/bookings/host')
      return data
    },
  })
}

export function useBooking(id: string | undefined) {
  return useQuery<Booking>({
    queryKey: ['bookings', id],
    queryFn: async () => {
      const { data } = await api.get<Booking>(`/bookings/${id}`)
      return data
    },
    enabled: !!id,
  })
}

export function useCreateBooking() {
  const queryClient = useQueryClient()

  return useMutation<Booking, Error, CreateBookingDto>({
    mutationFn: async (dto) => {
      const { data } = await api.post<Booking>('/bookings', dto)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] })
    },
  })
}

export function useConfirmBooking() {
  const queryClient = useQueryClient()

  return useMutation<Booking, Error, string>({
    mutationFn: async (id) => {
      const { data } = await api.post<Booking>(`/bookings/${id}/confirm`)
      return data
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['bookings', id] })
      queryClient.invalidateQueries({ queryKey: ['bookings', 'host'] })
    },
  })
}

export function useCancelBooking() {
  const queryClient = useQueryClient()

  return useMutation<Booking, Error, { id: string; reason?: string }>({
    mutationFn: async ({ id, reason }) => {
      const { data } = await api.post<Booking>(`/bookings/${id}/cancel`, { reason })
      return data
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['bookings', id] })
      queryClient.invalidateQueries({ queryKey: ['bookings', 'my'] })
      queryClient.invalidateQueries({ queryKey: ['bookings', 'host'] })
    },
  })
}
