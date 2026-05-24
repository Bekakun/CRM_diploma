import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface ThemeStore {
  theme: 'light' | 'dark'
  toggleTheme: () => void
  setTheme: (theme: 'light' | 'dark') => void
}

const applyTheme = (theme: 'light' | 'dark') => {
  document.documentElement.classList.add('no-transition')
  if (theme === 'dark') {
    document.documentElement.classList.add('dark')
  } else {
    document.documentElement.classList.remove('dark')
  }
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      document.documentElement.classList.remove('no-transition')
    })
  })
}

// Read saved theme synchronously before first render to avoid flash
const getSavedTheme = (): 'light' | 'dark' => {
  try {
    const stored = localStorage.getItem('theme-storage')
    if (stored) {
      const parsed = JSON.parse(stored)
      return parsed?.state?.theme === 'dark' ? 'dark' : 'light'
    }
  } catch {}
  return 'light'
}

// Apply immediately on module load — before React renders
const initialTheme = getSavedTheme()
applyTheme(initialTheme)

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set) => ({
      theme: initialTheme,
      toggleTheme: () =>
        set((state) => {
          const newTheme = state.theme === 'light' ? 'dark' : 'light'
          applyTheme(newTheme)
          return { theme: newTheme }
        }),
      setTheme: (theme) =>
        set(() => {
          applyTheme(theme)
          return { theme }
        }),
    }),
    {
      name: 'theme-storage',
      onRehydrateStorage: () => (state) => {
        if (state) applyTheme(state.theme)
      },
    }
  )
)

// Keep DOM class in sync with store at all times — catches any rehydration
// edge case where the store theme diverges from the <html> class.
useThemeStore.subscribe((state) => {
  applyTheme(state.theme)
})
