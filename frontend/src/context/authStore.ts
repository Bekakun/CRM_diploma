import { create } from 'zustand'
import { AuthState, User } from '../types'
import { authService, LoginRequest, RegisterRequest, tokenStorage } from '../services/authService'
import axios from 'axios'

interface AuthStore extends AuthState {
  setUser: (user: User | null) => void
  updateUser: (partial: Partial<User>) => void
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  register: (data: RegisterData) => Promise<void>
  checkAuth: () => Promise<void>
  sessionExpired: boolean
  markSessionExpired: () => void
  clearSessionExpired: () => void
}

export interface RegisterData {
  email: string
  password: string
  firstName: string
  lastName: string
  phone?: string
  invitationToken?: string
}

// Proactive token refresh — called on user activity or tab focus when token is close to expiry.
// Access token lives 15 min; we refresh if less than 4 min remain (or already expired).
const REFRESH_THRESHOLD_MS = 4 * 60 * 1000
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL
  ? `${import.meta.env.VITE_BACKEND_URL}/api/v1`
  : '/api/v1'

function getTokenExpiryMs(token: string): number {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return payload.exp * 1000
  } catch {
    return 0
  }
}

let lastActivityRefresh = 0

export function proactiveRefresh(force = false) {
  const accessToken = tokenStorage.getAccessToken()
  const refreshToken = tokenStorage.getRefreshToken()
  if (!accessToken || !refreshToken) return

  const expiresAt = getTokenExpiryMs(accessToken)
  const timeLeft = expiresAt - Date.now()
  const now = Date.now()

  // Debounce — don't refresh more than once per minute (skip if forced, e.g. on tab focus)
  if (!force && now - lastActivityRefresh < 60_000) return
  if (timeLeft > REFRESH_THRESHOLD_MS) return

  lastActivityRefresh = now
  axios.post(`${BACKEND_URL}/auth/refresh`, { refreshToken })
    .then((res) => {
      tokenStorage.setTokens(res.data.accessToken, res.data.refreshToken)
    })
    .catch(() => {
      // Refresh failed — session:expired will be dispatched by the response interceptor
    })
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  isCheckingAuth: true,
  sessionExpired: false,

  markSessionExpired: () => set({ sessionExpired: true, user: null, isAuthenticated: false }),
  clearSessionExpired: () => set({ sessionExpired: false }),


  setUser: (user) => set({ user, isAuthenticated: !!user }),

  updateUser: (partial) => set((state) => ({
    user: state.user ? { ...state.user, ...partial } : null,
  })),

  login: async (email: string, password: string) => {
    console.log('[AuthStore] Starting login...')
    set({ isLoading: true })
    try {
      const loginData: LoginRequest = { email, password }
      const response = await authService.login(loginData)

      console.log('[AuthStore] Login successful, user:', response.user)

      set({
        user: response.user,
        isAuthenticated: true,
        isLoading: false
      })
    } catch (error) {
      console.error('[AuthStore] Login error:', error)
      set({ isLoading: false })
      throw error
    }
  },

  logout: async () => {
    console.log('[AuthStore] Starting logout...')
    try {
      await authService.logout()
    } catch (error) {
      console.error('[AuthStore] Logout error:', error)
    } finally {
      set({ user: null, isAuthenticated: false })
    }
  },

  register: async (data: RegisterData) => {
    console.log('[AuthStore] Starting registration...')
    try {
      const registerData: RegisterRequest = {
        email: data.email,
        password: data.password,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone || undefined,
        invitationToken: data.invitationToken || undefined,
      }

      await authService.register(registerData)
      console.log('[AuthStore] Registration successful, awaiting email verification')
    } catch (error) {
      console.error('[AuthStore] Registration error:', error)
      throw error
    }
  },

  checkAuth: async () => {
    console.log('[AuthStore] Checking authentication...')

    if (!tokenStorage.getAccessToken()) {
      console.log('[AuthStore] No token found, user not authenticated')
      set({ user: null, isAuthenticated: false, isCheckingAuth: false })
      return
    }

    try {
      const user = await authService.getCurrentUser()
      console.log('[AuthStore] Auth check successful, user:', user)
      set({ user, isAuthenticated: true, isCheckingAuth: false })
    } catch (error) {
      console.log('[AuthStore] Auth check failed:', error)
      tokenStorage.clearTokens()
      set({ user: null, isAuthenticated: false, isCheckingAuth: false })
    }
  },
}))
