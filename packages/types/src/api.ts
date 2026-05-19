export interface ApiResponse<T> {
  data: T
  message?: string
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  limit: number
  hasMore: boolean
}

export interface ApiError {
  statusCode: number
  message: string | string[]
  error?: string
}

export interface AuthTokens {
  accessToken: string
  refreshToken: string
  expiresIn: number
}

export interface SendOtpDto {
  phone: string
}

export interface VerifyOtpDto {
  phone: string
  code: string
}
