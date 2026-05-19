'use client'

import { useRouter } from 'next/navigation'
import { useMutation, useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/auth.store'
import type { User, AuthTokens, SendOtpDto, VerifyOtpDto } from '@rigs/types'

export function useSendOtp() {
  return useMutation<void, Error, SendOtpDto>({
    mutationFn: async (dto) => {
      await api.post('/auth/send-code', dto)
    },
  })
}

export function useVerifyOtp() {
  const router = useRouter()
  const { setTokens } = useAuthStore()

  return useMutation<AuthTokens & { user: User }, Error, VerifyOtpDto>({
    mutationFn: async (dto) => {
      const { data } = await api.post<AuthTokens & { user: User }>('/auth/verify-code', dto)
      return data
    },
    onSuccess: (data) => {
      setTokens(data.accessToken, data.refreshToken)
      useAuthStore.getState().setUser(data.user)
      router.push('/')
    },
  })
}

export function useCurrentUser() {
  const accessToken = useAuthStore((s) => s.accessToken)
  return useQuery<User>({
    queryKey: ['users', 'me'],
    queryFn: async () => {
      const { data } = await api.get<User>('/users/me')
      return data
    },
    enabled: !!accessToken,
    staleTime: 5 * 60 * 1000,
  })
}
