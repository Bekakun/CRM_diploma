import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

import ru from './locales/ru.json'
import kz from './locales/kz.json'
import en from './locales/en.json'

export type Language = 'ru' | 'kz' | 'en'

export const LANGUAGES: { code: Language; label: string; flag: string; countryCode: string }[] = [
  { code: 'ru', label: 'Русский', flag: '🇷🇺', countryCode: 'ru' },
  { code: 'kz', label: 'Қазақша', flag: '🇰🇿', countryCode: 'kz' },
  { code: 'en', label: 'English', flag: '🇬🇧', countryCode: 'gb' },
]

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      ru: { translation: ru },
      kz: { translation: kz },
      en: { translation: en },
    },
    fallbackLng: 'ru',
    supportedLngs: ['ru', 'kz', 'en'],
    detection: {
      order: ['localStorage'],
      lookupLocalStorage: 'crm-language',
      caches: ['localStorage'],
    },
    interpolation: {
      escapeValue: false,
    },
  })

export default i18n
