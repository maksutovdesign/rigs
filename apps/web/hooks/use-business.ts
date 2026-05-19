'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type {
  BusinessProfile,
  CreateBusinessProfileDto,
  UpdateBusinessProfileDto,
  TeamMember,
  InviteTeamMemberDto,
  BusinessAnalytics,
  BusinessInvoice,
} from '@rigs/types'
import { useAuthStore } from '@/store/auth.store'

// ─── Business Profile ────────────────────────────────────────────────────────

export function useBusinessProfile() {
  const accessToken = useAuthStore((s) => s.accessToken)
  return useQuery<BusinessProfile>({
    queryKey: ['business', 'profile'],
    queryFn: async () => {
      const { data } = await api.get<BusinessProfile>('/business/profile')
      return data
    },
    enabled: !!accessToken,
    staleTime: 5 * 60 * 1000,
    retry: (failureCount, error: unknown) => {
      const axiosError = error as { response?: { status?: number } }
      if (axiosError?.response?.status === 404) return false
      return failureCount < 2
    },
  })
}

export function useCreateBusinessProfile() {
  const queryClient = useQueryClient()
  return useMutation<BusinessProfile, Error, CreateBusinessProfileDto>({
    mutationFn: async (dto) => {
      const { data } = await api.post<BusinessProfile>('/business/profile', dto)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business', 'profile'] })
      queryClient.invalidateQueries({ queryKey: ['users', 'me'] })
    },
  })
}

export function useUpdateBusinessProfile() {
  const queryClient = useQueryClient()
  return useMutation<BusinessProfile, Error, UpdateBusinessProfileDto>({
    mutationFn: async (dto) => {
      const { data } = await api.patch<BusinessProfile>('/business/profile', dto)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business', 'profile'] })
    },
  })
}

// ─── Team ─────────────────────────────────────────────────────────────────────

export function useTeam() {
  const accessToken = useAuthStore((s) => s.accessToken)
  return useQuery<TeamMember[]>({
    queryKey: ['business', 'team'],
    queryFn: async () => {
      const { data } = await api.get<TeamMember[]>('/business/team')
      return data
    },
    enabled: !!accessToken,
    staleTime: 2 * 60 * 1000,
  })
}

export function useInviteMember() {
  const queryClient = useQueryClient()
  return useMutation<TeamMember, Error, InviteTeamMemberDto>({
    mutationFn: async (dto) => {
      const { data } = await api.post<TeamMember>('/business/team/invite', dto)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business', 'team'] })
    },
  })
}

export function useRemoveMember() {
  const queryClient = useQueryClient()
  return useMutation<void, Error, string>({
    mutationFn: async (memberId) => {
      await api.delete(`/business/team/${memberId}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business', 'team'] })
    },
  })
}

// ─── Analytics ───────────────────────────────────────────────────────────────

export function useBusinessAnalytics() {
  const accessToken = useAuthStore((s) => s.accessToken)
  return useQuery<BusinessAnalytics>({
    queryKey: ['business', 'analytics'],
    queryFn: async () => {
      const { data } = await api.get<BusinessAnalytics>('/business/analytics')
      return data
    },
    enabled: !!accessToken,
    staleTime: 5 * 60 * 1000,
  })
}

// ─── Invoices ─────────────────────────────────────────────────────────────────

export function useInvoices() {
  const accessToken = useAuthStore((s) => s.accessToken)
  return useQuery<BusinessInvoice[]>({
    queryKey: ['business', 'invoices'],
    queryFn: async () => {
      const { data } = await api.get<BusinessInvoice[]>('/business/invoices')
      return data
    },
    enabled: !!accessToken,
    staleTime: 5 * 60 * 1000,
  })
}

// ─── Subscription ─────────────────────────────────────────────────────────────

interface UpdateSubscriptionDto {
  plan: string
}

export function useUpdateSubscription() {
  const queryClient = useQueryClient()
  const setUser = useAuthStore((s) => s.setUser)

  return useMutation<{ user: import('@rigs/types').User }, Error, UpdateSubscriptionDto>({
    mutationFn: async (dto) => {
      const { data } = await api.patch<{ user: import('@rigs/types').User }>('/business/subscription', dto)
      return data
    },
    onSuccess: (data) => {
      if (data?.user) {
        setUser(data.user)
      }
      queryClient.invalidateQueries({ queryKey: ['users', 'me'] })
    },
  })
}
