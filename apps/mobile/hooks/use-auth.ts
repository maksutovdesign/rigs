import { useMutation, useQuery } from '@tanstack/react-query'
import * as SecureStore from 'expo-secure-store'
import { api } from '../lib/api'
import type { User } from '@rigs/types'
import { useAuthStore } from '../store/auth.store'

interface SendOtpDto {
  phone: string
}

interface VerifyOtpDto {
  phone: string
  code: string
}

interface AuthTokens {
  accessToken: string
  refreshToken: string
  user: User
}

export function useSendOtp() {
  return useMutation<void, Error, SendOtpDto>({
    mutationFn: async (dto) => {
      await api.post('/auth/send-code', dto)
    },
  })
}

export function useVerifyOtp() {
  const { setUser, setTokens } = useAuthStore()

  return useMutation<AuthTokens, Error, VerifyOtpDto>({
    mutationFn: async (dto) => {
      const { data } = await api.post<AuthTokens>('/auth/verify-code', dto)
      return data
    },
    onSuccess: async (data) => {
      await SecureStore.setItemAsync('access_token', data.accessToken)
      await SecureStore.setItemAsync('refresh_token', data.refreshToken)
      setTokens(data.accessToken, data.refreshToken)
      setUser(data.user)
    },
  })
}

export function useCurrentUser() {
  const { setUser } = useAuthStore()

  return useQuery<User>({
    queryKey: ['users', 'me'],
    queryFn: async () => {
      const { data } = await api.get<User>('/users/me')
      setUser(data)
      return data
    },
    retry: false,
  })
}
