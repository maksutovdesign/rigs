import axios from 'axios'
import * as SecureStore from 'expo-secure-store'
import { useAuthStore } from '../store/auth.store'

const API_URL = process.env['EXPO_PUBLIC_API_URL'] ?? 'http://localhost:3001/api/v1'

export const api = axios.create({ baseURL: API_URL })

// Synchronous read from Zustand — no async overhead per request.
// Tokens are restored from SecureStore into the store at app startup (app/_layout.tsx).
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    if (err.response?.status === 401) {
      const refreshToken = await SecureStore.getItemAsync('refresh_token')
      if (refreshToken) {
        try {
          const { data } = await axios.post(`${API_URL}/auth/refresh`, { refreshToken })
          await SecureStore.setItemAsync('access_token', data.accessToken)
          // Keep Zustand store in sync so subsequent requests use the new token immediately
          useAuthStore.getState().setTokens(data.accessToken, refreshToken)
          err.config.headers.Authorization = `Bearer ${data.accessToken}`
          return api(err.config)
        } catch {
          await SecureStore.deleteItemAsync('access_token')
          await SecureStore.deleteItemAsync('refresh_token')
          useAuthStore.getState().logout()
        }
      }
    }
    return Promise.reject(err)
  },
)
