import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import RegisterPage from '../../pages/auth/RegisterPage'
import { useAuthStore } from '../../context/authStore'

vi.mock('../../context/authStore', () => ({
  useAuthStore: vi.fn(),
}))

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

vi.mock('axios', async () => {
  const actual = await vi.importActual<typeof import('axios')>('axios')
  return {
    ...actual,
    default: {
      ...actual.default,
      get: vi.fn().mockResolvedValue({ data: {} }),
    },
  }
})

const mockRegister = vi.fn()
const mockSetUser = vi.fn()

function renderRegister() {
  vi.mocked(useAuthStore).mockReturnValue({
    register: mockRegister,
    setUser: mockSetUser,
  } as any)
  return render(
    <MemoryRouter>
      <RegisterPage />
    </MemoryRouter>
  )
}

async function fillRegisterForm(overrides: {
  email?: string
  password?: string
  confirmPassword?: string
  firstName?: string
  lastName?: string
} = {}) {
  const {
    email = 'newuser@example.com',
    password = 'Password1!',
    confirmPassword = 'Password1!',
    firstName = 'Алия',
    lastName = 'Смагулова',
  } = overrides

  await userEvent.type(screen.getByPlaceholderText('Алия'), firstName)
  await userEvent.type(screen.getByPlaceholderText('Смагулова'), lastName)
  await userEvent.type(screen.getByPlaceholderText('your@email.com'), email)
  const pwInputs = document.querySelectorAll('input[type="password"]')
  await userEvent.type(pwInputs[0] as HTMLElement, password)
  await userEvent.type(pwInputs[1] as HTMLElement, confirmPassword)
}

describe('RegisterPage — registration step', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the registration form', () => {
    renderRegister()
    expect(screen.getByPlaceholderText('your@email.com')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Алия')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Смагулова')).toBeInTheDocument()
  })

  it('shows error when passwords do not match', async () => {
    renderRegister()
    await fillRegisterForm({ password: 'Password1!', confirmPassword: 'Different1!' })
    fireEvent.submit(screen.getByPlaceholderText('Алия').closest('form')!)
    await waitFor(() => {
      expect(screen.getByText('auth.passwordMismatch')).toBeInTheDocument()
    })
    expect(mockRegister).not.toHaveBeenCalled()
  })

  it('shows error when password is too short', async () => {
    renderRegister()
    await fillRegisterForm({ password: 'Short1!', confirmPassword: 'Short1!' })
    fireEvent.submit(screen.getByPlaceholderText('Алия').closest('form')!)
    await waitFor(() => {
      expect(screen.getByText('auth.passwordTooShort')).toBeInTheDocument()
    })
  })

  it('shows error when password is too weak (no special char)', async () => {
    renderRegister()
    await fillRegisterForm({ password: 'Password1', confirmPassword: 'Password1' })
    fireEvent.submit(screen.getByPlaceholderText('Алия').closest('form')!)
    await waitFor(() => {
      expect(screen.getByText('auth.passwordTooWeak')).toBeInTheDocument()
    })
  })

  it('calls register with correct data on valid form submission', async () => {
    mockRegister.mockResolvedValue(undefined)
    renderRegister()
    await fillRegisterForm()
    fireEvent.submit(screen.getByPlaceholderText('Алия').closest('form')!)
    await waitFor(() => {
      expect(mockRegister).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'newuser@example.com',
          firstName: 'Алия',
          lastName: 'Смагулова',
        })
      )
    })
  })

  it('advances to verify step after successful registration', async () => {
    mockRegister.mockResolvedValue(undefined)
    renderRegister()
    await fillRegisterForm()
    fireEvent.submit(screen.getByPlaceholderText('Алия').closest('form')!)
    await waitFor(() => {
      expect(screen.getByPlaceholderText('000000')).toBeInTheDocument()
    })
  })

  it('shows API error message on registration failure', async () => {
    const error = { response: { data: { message: 'Email already in use' } } }
    mockRegister.mockRejectedValue(error)
    renderRegister()
    await fillRegisterForm()
    fireEvent.submit(screen.getByPlaceholderText('Алия').closest('form')!)
    await waitFor(() => {
      expect(screen.getByText('Email already in use')).toBeInTheDocument()
    })
  })
})
