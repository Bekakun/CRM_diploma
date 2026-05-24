import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import i18n, { type Language } from '../i18n/config'

interface LanguageStore {
  language: Language
  setLanguage: (lang: Language) => void
}

export const useLanguageStore = create<LanguageStore>()(
  persist(
    (set) => ({
      language: (localStorage.getItem('crm-language') as Language) || 'ru',
      setLanguage: (lang) => {
        i18n.changeLanguage(lang)
        set({ language: lang })
      },
    }),
    {
      name: 'crm-language',
      onRehydrateStorage: () => (state) => {
        if (state) i18n.changeLanguage(state.language)
      },
    }
  )
)
