import { describe, it, expect, vi, beforeEach } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useAuthStore } from '../../context/authStore'
import { authService, tokenStorage } from '../../services/authService'
import type { User } from '../../types'

vi.mock('../../services/authService', () => {
  const tokenStorage = {
    getAccessToken: vi.fn(),
    getRefreshToken: vi.fn(),
    setTokens: vi.fn(),
    clearTokens: vi.fn(),
  }
  const authService = {
    login: vi.fn(),
    logout: vi.fn(),
    register: vi.fn(),
    getCurrentUser: vi.fn(),
    isAuthenticated: vi.fn(),
  }
  return { authService, tokenStorage }
})

const mockUser: User = {
  id: 'user-1',
  email: 'student@example.com',
  firstName: 'Test',
  lastName: 'User',
  fullName: 'Test User',
  role: 'STUDENT',
  status: 'ACTIVE',
  isEmailVerified: true,
  createdAt: '2024-01-01T00:00:00',
  updatedAt: '2024-01-01T00:00:00',
}

describe('authStore', () => {
  beforeEach(() => {
    // Reset Zustand store state between tests
    useAuthStore.setState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      isCheckingAuth: true,
      sessionExpired: false,
    })
    vi.clearAllMocks()
  })

  it('initial state is unauthenticated', () => {
    const { result } = renderHook(() => useAuthStore())
    expect(result.current.isAuthenticated).toBe(false)
    expect(result.current.user).toBeNull()
  })

  it('setUser authenticates a user', () => {
    const { result } = renderHook(() => useAuthStore())
    act(() => { result.current.setUser(mockUser) })
    expect(result.current.isAuthenticated).toBe(true)
    expect(result.current.user?.email).toBe('student@example.com')
  })

  it('setUser(null) clears authentication', () => {
    const { result } = renderHook(() => useAuthStore())
    act(() => { result.current.setUser(mockUser) })
    act(() => { result.current.setUser(null) })
    expect(result.current.isAuthenticated).toBe(false)
    expect(result.current.user).toBeNull()
  })

  it('updateUser merges partial fields', () => {
    const { result } = renderHook(() => useAuthStore())
    act(() => { result.current.setUser(mockUser) })
    act(() => { result.current.updateUser({ firstName: 'Updated' }) })
    expect(result.current.user?.firstName).toBe('Updated')
    expect(result.current.user?.email).toBe('student@example.com')
  })

  it('markSessionExpired sets sessionExpired and clears user', () => {
    const { result } = renderHook(() => useAuthStore())
    act(() => { result.current.setUser(mockUser) })
    act(() => { result.current.markSessionExpired() })
    expect(result.current.sessionExpired).toBe(true)
    expect(result.current.isAuthenticated).toBe(false)
    expect(result.current.user).toBeNull()
  })

  it('clearSessionExpired resets the flag', () => {
    const { result } = renderHook(() => useAuthStore())
    act(() => { result.current.markSessionExpired() })
    act(() => { result.current.clearSessionExpired() })
    expect(result.current.sessionExpired).toBe(false)
  })

  it('login calls authService.login and sets user on success', async () => {
    vi.mocked(authService.login).mockResolvedValue({
      accessToken: 'token',
      refreshToken: 'refresh',
      user: mockUser,
    })
    const { result } = renderHook(() => useAuthStore())
    await act(async () => { await result.current.login('student@example.com', 'password') })
    expect(authService.login).toHaveBeenCalledWith({ email: 'student@example.com', password: 'password' })
    expect(result.current.isAuthenticated).toBe(true)
    expect(result.current.user?.email).toBe('student@example.com')
    expect(result.current.isLoading).toBe(false)
  })

  it('login clears isLoading and rethrows on failure', async () => {
    vi.mocked(authService.login).mockRejectedValue(new Error('Wrong password'))
    const { result } = renderHook(() => useAuthStore())
    await expect(
      act(async () => { await result.current.login('bad@test.com', 'wrong') })
    ).rejects.toThrow('Wrong password')
    expect(result.current.isLoading).toBe(false)
    expect(result.current.isAuthenticated).toBe(false)
  })

  it('logout calls authService.logout and clears user', async () => {
    vi.mocked(authService.logout).mockResolvedValue()
    const { result } = renderHook(() => useAuthStore())
    act(() => { result.current.setUser(mockUser) })
    await act(async () => { await result.current.logout() })
    expect(result.current.isAuthenticated).toBe(false)
    expect(result.current.user).toBeNull()
  })

  it('logout clears state even if authService.logout throws', async () => {
    vi.mocked(authService.logout).mockRejectedValue(new Error('Network'))
    const { result } = renderHook(() => useAuthStore())
    act(() => { result.current.setUser(mockUser) })
    await act(async () => { await result.current.logout() })
    expect(result.current.isAuthenticated).toBe(false)
  })

  it('checkAuth sets user when token and profile API succeed', async () => {
    vi.mocked(tokenStorage.getAccessToken).mockReturnValue('valid-token')
    vi.mocked(authService.getCurrentUser).mockResolvedValue(mockUser)
    const { result } = renderHook(() => useAuthStore())
    await act(async () => { await result.current.checkAuth() })
    expect(result.current.isAuthenticated).toBe(true)
    expect(result.current.isCheckingAuth).toBe(false)
  })

  it('checkAuth sets unauthenticated when no token exists', async () => {
    vi.mocked(tokenStorage.getAccessToken).mockReturnValue(null)
    const { result } = renderHook(() => useAuthStore())
    await act(async () => { await result.current.checkAuth() })
    expect(result.current.isAuthenticated).toBe(false)
    expect(result.current.isCheckingAuth).toBe(false)
  })

  it('checkAuth clears tokens when getCurrentUser fails', async () => {
    vi.mocked(tokenStorage.getAccessToken).mockReturnValue('bad-token')
    vi.mocked(authService.getCurrentUser).mockRejectedValue(new Error('Unauthorized'))
    const { result } = renderHook(() => useAuthStore())
    await act(async () => { await result.current.checkAuth() })
    expect(tokenStorage.clearTokens).toHaveBeenCalled()
    expect(result.current.isAuthenticated).toBe(false)
  })
})
