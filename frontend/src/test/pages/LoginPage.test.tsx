import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import LoginPage from '../../pages/auth/LoginPage'
import { useAuthStore } from '../../context/authStore'

// Mock the entire authStore module so we can control what hooks return
vi.mock('../../context/authStore', () => ({
  useAuthStore: vi.fn(),
}))

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

const mockLogin = vi.fn()

const defaultStore = {
  login: mockLogin,
  isLoading: false,
  isAuthenticated: false,
}

function renderLogin(storeOverrides = {}) {
  vi.mocked(useAuthStore).mockReturnValue({ ...defaultStore, ...storeOverrides } as any)
  return render(
    <MemoryRouter>
      <LoginPage />
    </MemoryRouter>
  )
}

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders email and password inputs', () => {
    renderLogin()
    expect(screen.getByPlaceholderText('your@email.com')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('••••••••')).toBeInTheDocument()
  })

  it('renders the submit button', () => {
    renderLogin()
    expect(screen.getByRole('button', { name: /auth\.loginButton/i })).toBeInTheDocument()
  })

  it('redirects immediately if already authenticated', () => {
    renderLogin({ isAuthenticated: true })
    expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true })
  })

  it('calls login with email and password on form submit', async () => {
    mockLogin.mockResolvedValue(undefined)
    renderLogin()
    await userEvent.type(screen.getByPlaceholderText('your@email.com'), 'user@test.com')
    await userEvent.type(screen.getByPlaceholderText('••••••••'), 'password123')
    fireEvent.submit(screen.getByRole('button', { name: /auth\.loginButton/i }).closest('form')!)
    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('user@test.com', 'password123')
    })
  })

  it('navigates to / on successful login', async () => {
    mockLogin.mockResolvedValue(undefined)
    renderLogin()
    await userEvent.type(screen.getByPlaceholderText('your@email.com'), 'user@test.com')
    await userEvent.type(screen.getByPlaceholderText('••••••••'), 'pass')
    fireEvent.submit(screen.getByRole('button').closest('form')!)
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true })
    })
  })

  it('shows API error message on login failure', async () => {
    const error = { response: { data: { message: 'Неверный пароль' } } }
    mockLogin.mockRejectedValue(error)
    renderLogin()
    await userEvent.type(screen.getByPlaceholderText('your@email.com'), 'bad@test.com')
    await userEvent.type(screen.getByPlaceholderText('••••••••'), 'wrong')
    fireEvent.submit(screen.getByRole('button').closest('form')!)
    await waitFor(() => {
      expect(screen.getByText('Неверный пароль')).toBeInTheDocument()
    })
  })

  it('shows generic error when no API message available', async () => {
    mockLogin.mockRejectedValue(new Error('Network Error'))
    renderLogin()
    await userEvent.type(screen.getByPlaceholderText('your@email.com'), 'x@test.com')
    await userEvent.type(screen.getByPlaceholderText('••••••••'), 'pw')
    fireEvent.submit(screen.getByRole('button').closest('form')!)
    await waitFor(() => {
      expect(screen.getByText('Network Error')).toBeInTheDocument()
    })
  })

  it('disables submit button while loading', () => {
    renderLogin({ isLoading: true })
    const btn = screen.getByRole('button')
    expect(btn).toBeDisabled()
  })
})
