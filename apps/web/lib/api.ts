import axios from 'axios'
import { useAuthStore } from '@/store/auth.store'

export const api = axios.create({
  baseURL: process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001/api/v1',
  withCredentials: true,
})

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    if (err.response?.status === 401 && typeof window !== 'undefined') {
      const refreshToken = useAuthStore.getState().refreshToken
      if (refreshToken) {
        try {
          const { data } = await axios.post(
            `${process.env['NEXT_PUBLIC_API_URL']}/auth/refresh`,
            { refreshToken },
          )
          useAuthStore.getState().setTokens(data.accessToken, data.refreshToken)
          err.config.headers.Authorization = `Bearer ${data.accessToken}`
          return api(err.config)
        } catch {
          useAuthStore.getState().logout()
          window.location.href = '/auth'
        }
      }
    }
    return Promise.reject(err)
  },
)
