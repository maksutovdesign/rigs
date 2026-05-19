import axios from 'axios'
import * as SecureStore from 'expo-secure-store'

const API_URL = process.env['EXPO_PUBLIC_API_URL'] ?? 'http://localhost:3001/api/v1'

export const api = axios.create({ baseURL: API_URL })

api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('access_token')
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
          err.config.headers.Authorization = `Bearer ${data.accessToken}`
          return api(err.config)
        } catch {
          await SecureStore.deleteItemAsync('access_token')
          await SecureStore.deleteItemAsync('refresh_token')
        }
      }
    }
    return Promise.reject(err)
  },
)
