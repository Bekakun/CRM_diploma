import '@testing-library/jest-dom'
import { vi, afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'

afterEach(() => {
  cleanup()
  localStorage.clear()
  sessionStorage.clear()
  vi.clearAllMocks()
})

// Mock i18next — return the key as-is so tests don't depend on locale files
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { changeLanguage: vi.fn(), language: 'ru' },
  }),
  initReactI18next: { type: '3rdParty', init: vi.fn() },
  Trans: ({ children }: { children: React.ReactNode }) => children,
}))

vi.mock('i18next', () => ({
  default: {
    use: vi.fn().mockReturnThis(),
    init: vi.fn(),
    t: (key: string) => key,
    language: 'ru',
    changeLanguage: vi.fn(),
  },
  use: vi.fn().mockReturnThis(),
  init: vi.fn(),
}))

// Mock react-router-dom navigate
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return {
    ...actual,
    useNavigate: () => vi.fn(),
  }
})

// Mock requestAnimationFrame / cancelAnimationFrame for jsdom
let rafId = 0
globalThis.requestAnimationFrame = (_cb: FrameRequestCallback) => {
  return ++rafId
}
globalThis.cancelAnimationFrame = vi.fn()
