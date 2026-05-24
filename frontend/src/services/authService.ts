import api from './api'
import { User, UserRole } from '../types'

export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  email: string
  password: string
  firstName: string
  lastName: string
  phone?: string
  role?: UserRole
  invitationToken?: string
}

// Backend AuthResponse format (from documentation)
export interface BackendAuthResponse {
  accessToken: string
  refreshToken: string
  tokenType: string
  userId?: string  // Backend might return 'id' instead
  id?: string      // Alternative field name
  email: string
  fullName: string
  role: UserRole
  isEmailVerified: boolean
}

// Normalized user for frontend
export interface AuthResponse {
  accessToken: string
  refreshToken: string
  user: User
}

export interface RefreshTokenRequest {
  refreshToken: string
}

// Token storage helpers
const TOKEN_KEY = 'accessToken'
const REFRESH_TOKEN_KEY = 'refreshToken'

export const tokenStorage = {
  getAccessToken: () => localStorage.getItem(TOKEN_KEY),
  getRefreshToken: () => localStorage.getItem(REFRESH_TOKEN_KEY),
  setTokens: (accessToken: string, refreshToken: string) => {
    localStorage.setItem(TOKEN_KEY, accessToken)
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken)
  },
  clearTokens: () => {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(REFRESH_TOKEN_KEY)
  }
}

export const authService = {
  login: async (data: LoginRequest): Promise<AuthResponse> => {
    console.log('[authService] Sending login request...')
    const response = await api.post<{ accessToken: string; refreshToken: string; tokenType?: string }>('/auth/login', data)
    console.log('[authService] Login response.data:', response.data)

    // Check if response.data exists
    if (!response.data) {
      console.error('[authService] No response data received')
      throw new Error('No response data from server')
    }

    // Check if response has tokens
    if (!response.data.accessToken) {
      console.error('[authService] Missing accessToken in response')
      throw new Error('Invalid response format: missing accessToken')
    }

    // Store tokens first
    tokenStorage.setTokens(response.data.accessToken, response.data.refreshToken)
    console.log('[authService] Tokens stored in localStorage')

    // Now fetch user profile with the new token
    console.log('[authService] Fetching user profile...')
    const user = await authService.getCurrentUser()
    console.log('[authService] User profile fetched:', user)

    return {
      accessToken: response.data.accessToken,
      refreshToken: response.data.refreshToken,
      user
    }
  },

  register: async (data: RegisterRequest): Promise<{ email: string; message: string }> => {
    console.log('[authService] Sending register request...')
    const response = await api.post<{ email: string; message: string }>('/auth/register', data)
    console.log('[authService] Register response.data:', response.data)
    return response.data
  },

  verifyEmail: async (email: string, verificationCode: string): Promise<AuthResponse> => {
    const response = await api.post<{
      accessToken: string
      refreshToken: string
      user: { id: string; email: string; firstName: string; lastName: string; role: UserRole; isEmailVerified: boolean; createdAt: string; updatedAt: string }
    }>('/auth/verify-email', { email, verificationCode })
    tokenStorage.setTokens(response.data.accessToken, response.data.refreshToken)
    const u = response.data.user
    return {
      accessToken: response.data.accessToken,
      refreshToken: response.data.refreshToken,
      user: {
        id: u.id,
        email: u.email,
        firstName: u.firstName,
        lastName: u.lastName,
        fullName: `${u.firstName} ${u.lastName}`,
        role: (u.role as string).toUpperCase() as UserRole,
        isEmailVerified: u.isEmailVerified,
        createdAt: u.createdAt,
        updatedAt: u.updatedAt,
      }
    }
  },

  logout: async (): Promise<void> => {
    try {
      await api.post('/auth/logout')
    } finally {
      tokenStorage.clearTokens()
    }
  },

  refreshToken: async (): Promise<AuthResponse> => {
    const currentRefreshToken = tokenStorage.getRefreshToken()
    if (!currentRefreshToken) {
      throw new Error('No refresh token available')
    }

    const response = await api.post<{ accessToken: string; refreshToken: string }>('/auth/refresh', {
      refreshToken: currentRefreshToken
    })

    // Update stored tokens
    tokenStorage.setTokens(response.data.accessToken, response.data.refreshToken)

    // Fetch user profile
    const user = await authService.getCurrentUser()

    return {
      accessToken: response.data.accessToken,
      refreshToken: response.data.refreshToken,
      user
    }
  },

  // Get current user from stored token (decode JWT or use profile endpoint)
  getCurrentUser: async (): Promise<User> => {
    // Use profile endpoint to get current user data
    const response = await api.get<{
      id: string
      email: string
      firstName: string
      lastName: string
      role: UserRole
      phone?: string
      profilePhotoUrl?: string
      status: string
      isEmailVerified: boolean
      createdAt: string
      updatedAt: string
    }>('/profile')

    // Normalize role to UPPERCASE (backend may return lowercase)
    const normalizedRole = response.data.role.toUpperCase() as UserRole

    return {
      id: response.data.id,
      email: response.data.email,
      firstName: response.data.firstName,
      lastName: response.data.lastName,
      fullName: `${response.data.firstName} ${response.data.lastName}`,
      role: normalizedRole,
      phone: response.data.phone,
      profilePhotoUrl: response.data.profilePhotoUrl,
      status: response.data.status as 'ACTIVE' | 'INACTIVE' | 'PENDING',
      isEmailVerified: response.data.isEmailVerified,
      createdAt: response.data.createdAt,
      updatedAt: response.data.updatedAt,
    }
  },

  // Check if user is authenticated (has valid token)
  isAuthenticated: (): boolean => {
    return !!tokenStorage.getAccessToken()
  }
}
